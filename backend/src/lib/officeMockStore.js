let offices = [
  {
    id: 'office-islamic-raya',
    name: 'Kantor Islamic Raya',
    address: 'Universitas Cendekia Abditama, Jl. Islamic Raya, Klp. Dua, Kecamatan Kelapa Dua, Kabupaten Tangerang, Banten 15811',
    latitude: -6.227905,
    longitude: 106.6167849,
    radius_meters: 100,
    is_active: true,
    maps_url: 'https://maps.app.goo.gl/V9ZZosTkcAp7q93x8',
    employee_count: 4,
    created_at: new Date().toISOString(),
  },
  {
    id: 'office-hq',
    name: 'Kantor Pusat (Demo)',
    address: 'Jl. Merdeka No. 123, Jakarta Pusat',
    latitude: -6.175392,
    longitude: 106.827153,
    radius_meters: 100,
    is_active: true,
    employee_count: 2,
    created_at: new Date().toISOString(),
  },
];

function listOffices() {
  return offices;
}

function createOffice(payload) {
  const office = {
    id: `office-${Date.now()}`,
    name: payload.name,
    address: payload.address || '',
    latitude: Number(payload.latitude),
    longitude: Number(payload.longitude),
    radius_meters: Number(payload.radius_meters || 100),
    is_active: payload.is_active !== undefined ? Boolean(payload.is_active) : true,
    maps_url: payload.maps_url || '',
    employee_count: 0,
    created_at: new Date().toISOString(),
  };

  offices = [office, ...offices];
  return office;
}

function updateOffice(id, payload) {
  let updated = null;

  offices = offices.map((office) => {
    if (office.id !== id) return office;

    updated = {
      ...office,
      name: payload.name,
      address: payload.address || '',
      latitude: Number(payload.latitude),
      longitude: Number(payload.longitude),
      radius_meters: Number(payload.radius_meters || 100),
      is_active: payload.is_active !== undefined ? Boolean(payload.is_active) : true,
      maps_url: payload.maps_url || office.maps_url || '',
      updated_at: new Date().toISOString(),
    };

    return updated;
  });

  return updated;
}

function deleteOffice(id) {
  const office = offices.find((item) => item.id === id);

  if (!office) {
    return { deleted: false, reason: 'not_found' };
  }

  if (office.employee_count > 0) {
    return { deleted: false, reason: 'in_use' };
  }

  offices = offices.filter((item) => item.id !== id);
  return { deleted: true };
}

module.exports = {
  listOffices,
  createOffice,
  updateOffice,
  deleteOffice,
};
