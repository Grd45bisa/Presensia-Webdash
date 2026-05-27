const express = require('express');
const router = express.Router();
const supabaseAdmin = require('../lib/supabaseAdmin');
const mockStore = require('../lib/officeMockStore');

async function attachEmployeeCounts(offices) {
  if (!supabaseAdmin || offices.length === 0) {
    return offices;
  }

  const { data: profiles, error } = await supabaseAdmin
    .from('profiles')
    .select('office_location_id')
    .not('office_location_id', 'is', null);

  if (error) throw error;

  return offices.map((office) => ({
    ...office,
    employee_count: (profiles || []).filter((profile) => profile.office_location_id === office.id).length,
  }));
}

function extractCoordinatesFromMapsUrl(url) {
  const decodedUrl = decodeURIComponent(url);
  const patterns = [
    /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/,
    /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?),/,
    /[?&]q=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/,
  ];

  for (const pattern of patterns) {
    const match = decodedUrl.match(pattern);
    if (match) {
      return {
        latitude: Number(match[1]),
        longitude: Number(match[2]),
      };
    }
  }

  return null;
}

function validateOfficePayload(payload) {
  const latitude = Number(payload.latitude);
  const longitude = Number(payload.longitude);
  const radius = Number(payload.radius_meters || 100);

  if (!payload.name || payload.latitude === undefined || payload.longitude === undefined) {
    return { valid: false, message: 'Nama lokasi, latitude, dan longitude wajib diisi.' };
  }

  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    return { valid: false, message: 'Latitude harus berupa angka antara -90 sampai 90.' };
  }

  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    return { valid: false, message: 'Longitude harus berupa angka antara -180 sampai 180.' };
  }

  if (!Number.isFinite(radius) || radius < 25) {
    return { valid: false, message: 'Radius geofence minimal 25 meter.' };
  }

  return {
    valid: true,
    payload: {
      name: payload.name,
      address: payload.address || null,
      latitude,
      longitude,
      radius_meters: radius,
      is_active: payload.is_active !== undefined ? Boolean(payload.is_active) : true,
      maps_url: payload.maps_url || '',
    },
  };
}

router.post('/resolve-map-link', async (req, res) => {
  const mapsUrl = req.body?.maps_url;

  if (!mapsUrl || !/^https?:\/\/.+/i.test(mapsUrl)) {
    return res.status(400).json({
      success: false,
      message: 'Link Google Maps wajib diisi dengan format URL yang valid.',
    });
  }

  try {
    const response = await fetch(mapsUrl, { redirect: 'follow' });
    const finalUrl = response.url || mapsUrl;
    const coordinates = extractCoordinatesFromMapsUrl(finalUrl);

    if (!coordinates) {
      return res.status(422).json({
        success: false,
        message: 'Koordinat tidak ditemukan dari link Maps tersebut.',
      });
    }

    return res.json({
      success: true,
      data: {
        ...coordinates,
        resolved_url: finalUrl,
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: `Gagal membaca link Google Maps. ${err.message}`,
    });
  }
});

router.get('/', async (req, res) => {
  if (!supabaseAdmin) {
    return res.json({
      success: true,
      data: {
        source: 'mock',
        offices: mockStore.listOffices(),
      },
    });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('office_locations')
      .select('id, name, address, latitude, longitude, radius_meters, is_active, maps_url, created_at, updated_at')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return res.json({
      success: true,
      data: {
        source: 'supabase',
        offices: await attachEmployeeCounts(data || []),
      },
    });
  } catch (err) {
    console.error('[GET Office Locations Fallback]', err);
    return res.json({
      success: true,
      data: {
        source: 'mock',
        fallbackReason: 'Gagal membaca Supabase, memakai data mock.',
        offices: mockStore.listOffices(),
      },
    });
  }
});

router.post('/', async (req, res) => {
  const validation = validateOfficePayload(req.body);

  if (!validation.valid) {
    return res.status(400).json({
      success: false,
      message: validation.message,
    });
  }

  if (!supabaseAdmin) {
    return res.status(201).json({
      success: true,
      message: 'Lokasi kantor mock berhasil ditambahkan.',
      data: mockStore.createOffice(validation.payload),
    });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('office_locations')
      .insert({
        name: validation.payload.name,
        address: validation.payload.address,
        latitude: validation.payload.latitude,
        longitude: validation.payload.longitude,
        radius_meters: validation.payload.radius_meters,
        is_active: validation.payload.is_active,
        maps_url: validation.payload.maps_url,
      })
      .select()
      .single();

    if (error) throw error;

    return res.status(201).json({
      success: true,
      message: 'Lokasi kantor berhasil ditambahkan.',
      data: { ...data, employee_count: 0 },
    });
  } catch (err) {
    console.error('[POST Office Locations Error]', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const validation = validateOfficePayload(req.body);

  if (!validation.valid) {
    return res.status(400).json({
      success: false,
      message: validation.message,
    });
  }

  if (!supabaseAdmin) {
    const updated = mockStore.updateOffice(id, validation.payload);

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Lokasi kantor tidak ditemukan.' });
    }

    return res.json({
      success: true,
      message: 'Lokasi kantor mock berhasil diperbarui.',
      data: updated,
    });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('office_locations')
      .update({
        name: validation.payload.name,
        address: validation.payload.address,
        latitude: validation.payload.latitude,
        longitude: validation.payload.longitude,
        radius_meters: validation.payload.radius_meters,
        is_active: validation.payload.is_active,
        maps_url: validation.payload.maps_url,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return res.json({
      success: true,
      message: 'Lokasi kantor berhasil diperbarui.',
      data,
    });
  } catch (err) {
    console.error('[PUT Office Locations Error]', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  if (!supabaseAdmin) {
    const result = mockStore.deleteOffice(id);

    if (result.reason === 'not_found') {
      return res.status(404).json({ success: false, message: 'Lokasi kantor tidak ditemukan.' });
    }

    if (result.reason === 'in_use') {
      return res.status(400).json({
        success: false,
        message: 'Lokasi masih digunakan karyawan. Nonaktifkan lokasi atau pindahkan karyawan terlebih dahulu.',
      });
    }

    return res.json({ success: true, message: 'Lokasi kantor mock berhasil dihapus.' });
  }

  try {
    const { data: linkedProfiles, error: profileCheckError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('office_location_id', id);

    if (profileCheckError) throw profileCheckError;

    if (linkedProfiles && linkedProfiles.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Lokasi tidak bisa dihapus karena masih digunakan karyawan.',
      });
    }

    const { error } = await supabaseAdmin
      .from('office_locations')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return res.json({ success: true, message: 'Lokasi kantor berhasil dihapus.' });
  } catch (err) {
    console.error('[DELETE Office Locations Error]', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
