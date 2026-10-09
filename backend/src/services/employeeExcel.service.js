const ExcelJS = require('exceljs');

/**
 * Format minutes into "X Jam Y Menit" or "Y Menit"
 */
function formatMinutes(totalMinutes) {
  if (!totalMinutes || totalMinutes <= 0) return '0 Menit';
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (hours <= 0) return `${mins} Menit`;
  if (mins === 0) return `${hours} Jam`;
  return `${hours} Jam ${mins} Menit`;
}

/**
 * Generate formatted Excel Workbook for Employee Daily Attendance & Tracker Report
 * Supports both single employee and "all" employees.
 * @param {Object} reportData - Aggregated report data
 * @returns {Promise<ExcelJS.Workbook>}
 */
async function generateEmployeeReportWorkbook(reportData) {
  const { employee, period, summary, dailyRecords, isAll } = reportData;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Presensia System';
  workbook.lastModifiedBy = 'Presensia System';
  workbook.created = new Date();
  workbook.modified = new Date();

  const worksheet = workbook.addWorksheet('Laporan Kerja', {
    views: [{ showGridLines: true }],
    pageSetup: {
      paperSize: 9, // A4
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
    },
  });

  // --- PALETTE & STYLES ---
  const PRIMARY_COLOR = 'FF1E3A8A'; // Deep Navy Blue
  const SECONDARY_COLOR = 'FF2563EB'; // Royal Blue
  const ACCENT_LIGHT = 'FFEFF6FF'; // Ice Light Blue
  const BORDER_COLOR = 'FFCBD5E1'; // Slate Border
  const TEXT_DARK = 'FF1E293B'; // Dark Slate Text
  const TEXT_MUTED = 'FF64748B'; // Muted Slate Text
  const SUCCESS_BG = 'FFDCFCE7'; // Light Green
  const SUCCESS_TEXT = 'FF166534';
  const WARNING_BG = 'FFFEF3C7'; // Light Amber
  const WARNING_TEXT = 'FF92400E';

  const thinBorder = {
    top: { style: 'thin', color: { argb: BORDER_COLOR } },
    left: { style: 'thin', color: { argb: BORDER_COLOR } },
    bottom: { style: 'thin', color: { argb: BORDER_COLOR } },
    right: { style: 'thin', color: { argb: BORDER_COLOR } },
  };

  // --- COLUMN DEFINITIONS & WIDTHS ---
  const baseColumns = isAll
    ? [
        { key: 'no', width: 6 }, // A: No
        { key: 'employee_name', width: 22 }, // B: Karyawan
        { key: 'date', width: 22 }, // C: Tanggal
        { key: 'check_in', width: 13 }, // D: Jam Masuk
        { key: 'photo_in', width: 19 }, // E: Foto Masuk
        { key: 'check_out', width: 13 }, // F: Jam Pulang
        { key: 'photo_out', width: 19 }, // G: Foto Pulang
        { key: 'work_duration', width: 20 }, // H: Total Jam Kerja
        { key: 'task_name', width: 32 }, // I: Aktivitas / Task Tracker
        { key: 'project_name', width: 22 }, // J: Project
        { key: 'tracker_time', width: 18 }, // K: Waktu Tracker
        { key: 'task_duration', width: 18 }, // L: Durasi Task
        { key: 'status', width: 22 }, // M: Status Presensi
      ]
    : [
        { key: 'no', width: 6 }, // A: No
        { key: 'date', width: 22 }, // B: Tanggal
        { key: 'check_in', width: 13 }, // C: Jam Masuk
        { key: 'photo_in', width: 19 }, // D: Foto Masuk
        { key: 'check_out', width: 13 }, // E: Jam Pulang
        { key: 'photo_out', width: 19 }, // F: Foto Pulang
        { key: 'work_duration', width: 20 }, // G: Total Jam Kerja
        { key: 'task_name', width: 32 }, // H: Aktivitas / Task Tracker
        { key: 'project_name', width: 22 }, // I: Project
        { key: 'tracker_time', width: 18 }, // J: Waktu Tracker
        { key: 'task_duration', width: 18 }, // K: Durasi Task
        { key: 'status', width: 22 }, // L: Status Presensi
      ];

  worksheet.columns = baseColumns;
  const lastColLetter = isAll ? 'M' : 'L';

  // --- ROW 1-2: HEADER BANNER ---
  worksheet.mergeCells(`A1:${lastColLetter}1`);
  const titleCell = worksheet.getCell('A1');
  titleCell.value = 'LAPORAN AKTIVITAS & PRESENSI KERJA KARYAWAN';
  titleCell.font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PRIMARY_COLOR } };
  worksheet.getRow(1).height = 36;

  worksheet.mergeCells(`A2:${lastColLetter}2`);
  const subTitleCell = worksheet.getCell('A2');
  subTitleCell.value = 'Presensia Face Recognition & Activity Tracker System';
  subTitleCell.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FFE2E8F0' } };
  subTitleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  subTitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: SECONDARY_COLOR } };
  worksheet.getRow(2).height = 20;

  worksheet.addRow([]); // Row 3: Blank

  // --- ROW 4-7: INFO KARYAWAN & KPI SUMMARY BOX ---
  const infoData = [
    [
      'Nama Karyawan / Akun',
      `: ${employee.full_name || '-'}`,
      '',
      '',
      'Periode Laporan',
      `: ${period.from || '-'} s.d. ${period.to || '-'}`,
    ],
    [
      'ID / NIP',
      `: ${employee.employee_code || (employee.id ? employee.id.slice(0, 8) : '-')}`,
      '',
      '',
      'Total Hari Hadir',
      `: ${summary.present_days || 0} Hari`,
    ],
    [
      'Departemen',
      `: ${employee.department || '-'}`,
      '',
      '',
      'Total Jam Presensi',
      `: ${formatMinutes(summary.total_work_minutes)}`,
    ],
    [
      'Jabatan / Posisi',
      `: ${employee.position || '-'}`,
      '',
      '',
      'Total Task Tracker',
      `: ${summary.total_tasks || 0} Task (${formatMinutes(summary.total_task_minutes)})`,
    ],
  ];

  infoData.forEach((rowValues) => {
    const row = worksheet.addRow(rowValues);
    row.height = 20;

    // Col A Label
    row.getCell(1).font = { bold: true, color: { argb: TEXT_MUTED }, size: 10 };
    // Col B Value
    worksheet.mergeCells(`B${row.number}:D${row.number}`);
    row.getCell(2).font = { bold: true, color: { argb: TEXT_DARK }, size: 10 };

    // Col E Label
    row.getCell(5).font = { bold: true, color: { argb: TEXT_MUTED }, size: 10 };
    // Col F Value
    worksheet.mergeCells(`F${row.number}:${isAll ? 'J' : 'I'}${row.number}`);
    row.getCell(6).font = { bold: true, color: { argb: TEXT_DARK }, size: 10 };
  });

  worksheet.addRow([]); // Row 8: Blank

  // --- ROW 9: TABLE HEADER ---
  const headerTitles = isAll
    ? [
        'No',
        'Karyawan',
        'Tanggal',
        'Jam Masuk',
        'Foto Masuk',
        'Jam Pulang',
        'Foto Pulang',
        'Total Jam Kerja (Presensi)',
        'Aktivitas / Task Tracker',
        'Project',
        'Waktu Tracker',
        'Durasi Task',
        'Status Presensi',
      ]
    : [
        'No',
        'Tanggal',
        'Jam Masuk',
        'Foto Masuk',
        'Jam Pulang',
        'Foto Pulang',
        'Total Jam Kerja (Presensi)',
        'Aktivitas / Task Tracker',
        'Project',
        'Waktu Tracker',
        'Durasi Task',
        'Status Presensi',
      ];

  const headerRow = worksheet.addRow(headerTitles);
  headerRow.height = 30;
  headerRow.eachCell((cell) => {
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PRIMARY_COLOR } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = thinBorder;
  });

  // --- ROWS 10+: DAILY RECORDS & WORKLOGS ---
  let recordCounter = 1;

  dailyRecords.forEach((dayRecord) => {
    const tasks = dayRecord.tasks && dayRecord.tasks.length > 0
      ? dayRecord.tasks
      : [{
          task_name: '-',
          project_name: '-',
          time_range: '-',
          duration_minutes: 0,
        }];

    const startRowIndex = worksheet.lastRow.number + 1;
    const taskCount = tasks.length;

    tasks.forEach((task, index) => {
      const isFirstSubRow = index === 0;

      const rowValues = isAll
        ? [
            isFirstSubRow ? recordCounter : '',
            isFirstSubRow ? dayRecord.employee_name || '-' : '',
            isFirstSubRow ? dayRecord.date_formatted || dayRecord.date : '',
            isFirstSubRow ? (dayRecord.check_in_time || '-') : '',
            '', // Foto Masuk
            isFirstSubRow ? (dayRecord.check_out_time || (dayRecord.check_in ? 'Belum Pulang' : '-')) : '',
            '', // Foto Pulang
            isFirstSubRow ? (dayRecord.work_duration_minutes > 0 ? formatMinutes(dayRecord.work_duration_minutes) : '-') : '',
            task.task_name,
            task.project_name || '-',
            task.time_range || '-',
            task.duration_minutes > 0 ? formatMinutes(task.duration_minutes) : '-',
            isFirstSubRow ? (dayRecord.status_label || 'Hadir') : '',
          ]
        : [
            isFirstSubRow ? recordCounter : '',
            isFirstSubRow ? dayRecord.date_formatted || dayRecord.date : '',
            isFirstSubRow ? (dayRecord.check_in_time || '-') : '',
            '', // Foto Masuk
            isFirstSubRow ? (dayRecord.check_out_time || (dayRecord.check_in ? 'Belum Pulang' : '-')) : '',
            '', // Foto Pulang
            isFirstSubRow ? (dayRecord.work_duration_minutes > 0 ? formatMinutes(dayRecord.work_duration_minutes) : '-') : '',
            task.task_name,
            task.project_name || '-',
            task.time_range || '-',
            task.duration_minutes > 0 ? formatMinutes(task.duration_minutes) : '-',
            isFirstSubRow ? (dayRecord.status_label || 'Hadir') : '',
          ];

      const row = worksheet.addRow(rowValues);
      row.height = 24;

      row.eachCell({ includeEmpty: true }, (cell) => {
        cell.border = thinBorder;
        cell.font = { name: 'Calibri', size: 9.5, color: { argb: TEXT_DARK } };
        cell.alignment = { vertical: 'middle' };
      });

      // Alignments per column
      row.getCell('no').alignment = { vertical: 'middle', horizontal: 'center' };
      if (isAll) {
        row.getCell('employee_name').alignment = { vertical: 'middle', horizontal: 'left' };
      }
      row.getCell('date').alignment = { vertical: 'middle', horizontal: 'left' };
      row.getCell('check_in').alignment = { vertical: 'middle', horizontal: 'center' };
      row.getCell('check_out').alignment = { vertical: 'middle', horizontal: 'center' };
      row.getCell('work_duration').alignment = { vertical: 'middle', horizontal: 'center' };
      row.getCell('tracker_time').alignment = { vertical: 'middle', horizontal: 'center' };
      row.getCell('task_duration').alignment = { vertical: 'middle', horizontal: 'center' };
      row.getCell('status').alignment = { vertical: 'middle', horizontal: 'center' };

      // Highlight status badge in cell
      if (isFirstSubRow) {
        const statusCell = row.getCell('status');
        if (dayRecord.status_label === 'Tidak Hadir / Alpa') {
          statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFEDD5' } };
          statusCell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: 'FFC2410C' } };
        } else if (dayRecord.status_label === 'Izin' || dayRecord.status_label === 'Sakit') {
          statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0F2FE' } };
          statusCell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: 'FF0369A1' } };
        } else if (dayRecord.status_label === 'Libur') {
          statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
          statusCell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: 'FF64748B' } };
        } else if (dayRecord.late_minutes > 0 || dayRecord.attendance_status === 'late') {
          statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: WARNING_BG } };
          statusCell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: WARNING_TEXT } };
        } else if (dayRecord.check_in) {
          statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: SUCCESS_BG } };
          statusCell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: SUCCESS_TEXT } };
        }
      }
    });

    const endRowIndex = startRowIndex + taskCount - 1;

    // --- MERGE CELLS IF MULTIPLE TASKS EXIST FOR THE DAY ---
    if (taskCount > 1) {
      const colsToMerge = isAll
        ? ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'M']
        : ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'L'];

      colsToMerge.forEach((colLetter) => {
        worksheet.mergeCells(`${colLetter}${startRowIndex}:${colLetter}${endRowIndex}`);
      });
    }

    // Photo In Cell Letter
    const photoInCol = isAll ? 'E' : 'D';
    const photoInCell = worksheet.getCell(`${photoInCol}${startRowIndex}`);
    if (dayRecord.photo_in_url) {
      photoInCell.value = {
        text: '[Buka Foto Masuk]',
        hyperlink: dayRecord.photo_in_url,
        tooltip: 'Klik untuk membuka foto bukti absensi masuk',
      };
      photoInCell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: SECONDARY_COLOR }, underline: true };
      photoInCell.alignment = { vertical: 'middle', horizontal: 'center' };
    } else {
      photoInCell.value = '-';
      photoInCell.alignment = { vertical: 'middle', horizontal: 'center' };
      photoInCell.font = { name: 'Calibri', size: 9.5, color: { argb: TEXT_MUTED } };
    }

    // Photo Out Cell Letter
    const photoOutCol = isAll ? 'G' : 'F';
    const photoOutCell = worksheet.getCell(`${photoOutCol}${startRowIndex}`);
    if (dayRecord.photo_out_url) {
      photoOutCell.value = {
        text: '[Buka Foto Pulang]',
        hyperlink: dayRecord.photo_out_url,
        tooltip: 'Klik untuk membuka foto bukti absensi pulang',
      };
      photoOutCell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: SECONDARY_COLOR }, underline: true };
      photoOutCell.alignment = { vertical: 'middle', horizontal: 'center' };
    } else {
      photoOutCell.value = '-';
      photoOutCell.alignment = { vertical: 'middle', horizontal: 'center' };
      photoOutCell.font = { name: 'Calibri', size: 9.5, color: { argb: TEXT_MUTED } };
    }

    recordCounter++;
  });

  // --- FOOTER SUMMARY ROW ---
  const footerRowIndex = worksheet.lastRow.number + 1;
  const footerRow = worksheet.addRow([]);
  footerRow.height = 26;

  const preWorkCol = isAll ? 'G' : 'F';
  worksheet.mergeCells(`A${footerRowIndex}:${preWorkCol}${footerRowIndex}`);
  const totalPresensiLabel = worksheet.getCell(`A${footerRowIndex}`);
  totalPresensiLabel.value = 'TOTAL DURASI KERJA (PRESENSI) :';
  totalPresensiLabel.font = { name: 'Calibri', size: 10, bold: true, color: { argb: TEXT_DARK } };
  totalPresensiLabel.alignment = { vertical: 'middle', horizontal: 'right' };

  const workCol = isAll ? 'H' : 'G';
  const totalPresensiVal = worksheet.getCell(`${workCol}${footerRowIndex}`);
  totalPresensiVal.value = formatMinutes(summary.total_work_minutes);
  totalPresensiVal.font = { name: 'Calibri', size: 10, bold: true, color: { argb: PRIMARY_COLOR } };
  totalPresensiVal.alignment = { vertical: 'middle', horizontal: 'center' };

  const trackerLabelStart = isAll ? 'I' : 'H';
  const trackerLabelEnd = isAll ? 'K' : 'J';
  worksheet.mergeCells(`${trackerLabelStart}${footerRowIndex}:${trackerLabelEnd}${footerRowIndex}`);
  const totalTrackerLabel = worksheet.getCell(`${trackerLabelStart}${footerRowIndex}`);
  totalTrackerLabel.value = 'TOTAL WAKTU TASK TRACKER :';
  totalTrackerLabel.font = { name: 'Calibri', size: 10, bold: true, color: { argb: TEXT_DARK } };
  totalTrackerLabel.alignment = { vertical: 'middle', horizontal: 'right' };

  const trackerCol = isAll ? 'L' : 'K';
  const totalTrackerVal = worksheet.getCell(`${trackerCol}${footerRowIndex}`);
  totalTrackerVal.value = formatMinutes(summary.total_task_minutes);
  totalTrackerVal.font = { name: 'Calibri', size: 10, bold: true, color: { argb: PRIMARY_COLOR } };
  totalTrackerVal.alignment = { vertical: 'middle', horizontal: 'center' };

  const endCell = worksheet.getCell(`${lastColLetter}${footerRowIndex}`);
  endCell.value = '-';
  endCell.alignment = { vertical: 'middle', horizontal: 'center' };

  footerRow.eachCell({ includeEmpty: true }, (cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ACCENT_LIGHT } };
    cell.border = {
      top: { style: 'medium', color: { argb: PRIMARY_COLOR } },
      bottom: { style: 'medium', color: { argb: PRIMARY_COLOR } },
      left: { style: 'thin', color: { argb: BORDER_COLOR } },
      right: { style: 'thin', color: { argb: BORDER_COLOR } },
    };
  });

  return workbook;
}

module.exports = {
  generateEmployeeReportWorkbook,
  formatMinutes,
};
