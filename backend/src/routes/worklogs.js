const express = require('express');
const supabaseAdmin = require('../lib/supabaseAdmin');
const mockStore = require('../lib/worklogMockStore');

const router = express.Router();

function minutesBetween(startTime, endTime) {
  if (!startTime || !endTime) return 0;
  const diff = new Date(endTime).getTime() - new Date(startTime).getTime();
  return Math.max(0, Math.round(diff / 60000));
}

function normalizeWorklog(row) {
  const profile = row.profiles || {};

  return {
    id: row.id,
    employee_id: row.employee_id,
    employee_name: row.employee_name || profile.full_name || '-',
    employee_email: row.employee_email || profile.email || '-',
    department: row.department || profile.department || '-',
    position: row.position || profile.position || '-',
    date: row.date,
    task_name: row.task_name,
    project_name: row.project_name,
    project_color: row.project_color || '#2563EB',
    start_time: row.start_time,
    end_time: row.end_time,
    duration_minutes: row.duration_minutes ?? minutesBetween(row.start_time, row.end_time),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

async function listFromSupabase({ from, to, employeeId, project }) {
  let query = supabaseAdmin
    .from('worklog_entries')
    .select(`
      id,
      employee_id,
      date,
      task_name,
      project_name,
      project_color,
      start_time,
      end_time,
      created_at,
      updated_at,
      profiles:employee_id (
        full_name,
        email,
        department,
        position
      )
    `);

  if (from) query = query.gte('date', from);
  if (to) query = query.lte('date', to);
  if (employeeId) query = query.eq('employee_id', employeeId);
  if (project) query = query.eq('project_name', project);

  const { data, error } = await query
    .order('date', { ascending: false })
    .order('start_time', { ascending: false });

  if (error) throw error;
  return (data || []).map(normalizeWorklog);
}

function buildSummary(worklogs) {
  const totalMinutes = worklogs.reduce((sum, row) => sum + Number(row.duration_minutes || 0), 0);
  const employeeIds = new Set(worklogs.map((row) => row.employee_id));
  const projectNames = new Set(worklogs.map((row) => row.project_name));
  const averageMinutes = worklogs.length ? Math.round(totalMinutes / worklogs.length) : 0;

  return {
    total_entries: worklogs.length,
    total_minutes: totalMinutes,
    active_employees: employeeIds.size,
    project_count: projectNames.size,
    average_minutes: averageMinutes,
  };
}

router.get('/', async (req, res) => {
  const filters = {
    from: req.query.from,
    to: req.query.to,
    employeeId: req.query.employee_id,
    project: req.query.project,
  };

  if (!supabaseAdmin) {
    const worklogs = mockStore.listWorklogs(filters).map(normalizeWorklog);
    return res.json({
      success: true,
      data: {
        source: 'mock',
        worklogs,
        summary: buildSummary(worklogs),
        projects: [...new Set(worklogs.map((row) => row.project_name))].sort(),
      },
    });
  }

  try {
    const worklogs = await listFromSupabase(filters);

    return res.json({
      success: true,
      data: {
        source: 'supabase',
        worklogs,
        summary: buildSummary(worklogs),
        projects: [...new Set(worklogs.map((row) => row.project_name))].sort(),
      },
    });
  } catch (err) {
    console.error('[Worklogs GET Fallback]', err);
    const worklogs = mockStore.listWorklogs(filters).map(normalizeWorklog);
    return res.json({
      success: true,
      data: {
        source: 'mock',
        fallbackReason: 'Gagal membaca Supabase, memakai data mock.',
        worklogs,
        summary: buildSummary(worklogs),
        projects: [...new Set(worklogs.map((row) => row.project_name))].sort(),
      },
    });
  }
});

module.exports = router;
