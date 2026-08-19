import * as XLSX from 'xlsx';
import type { Submission, EventModule } from '@/types';
import { DEFAULT_EVENT } from '@/lib/supabase';

export function exportBulkExcel(submissions: Submission[], eventInfo: EventModule = DEFAULT_EVENT): void {
  const wb = XLSX.utils.book_new();

  // ─── Letterhead rows ───────────────────────────────────────────
  const header = [
    [`${eventInfo.department} | ${eventInfo.semester}`],
    [`Conference: ${eventInfo.title}  |  Subject: ${eventInfo.subject}  |  Date: ${eventInfo.event_date}`],
    [`Generated: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST`],
    [], // blank spacer row
  ];

  // ─── Data rows ─────────────────────────────────────────────────
  const colHeaders = ['S.No', 'Reg No', 'Name', 'Feedback Summary', 'Attachments', 'Submitted At', 'Source'];
  const dataRows = submissions.map((s, i) => [
    i + 1,
    s.reg_no,
    s.student_name,
    s.feedback_text,
    s.file_urls.length,
    new Date(s.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
    s.source === 'admin_added' ? 'Admin' : 'Student',
  ]);

  const wsData = [...header, colHeaders, ...dataRows];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // ─── Styles via cell metadata ──────────────────────────────────
  const headerRowIndex = header.length; // 0-indexed
  const colRange = XLSX.utils.decode_range(ws['!ref'] || 'A1');
  const numDataCols = colHeaders.length;

  // Bold + fill header cells
  for (let C = 0; C < numDataCols; C++) {
    const cellAddr = XLSX.utils.encode_cell({ r: headerRowIndex, c: C });
    if (!ws[cellAddr]) ws[cellAddr] = { v: colHeaders[C], t: 's' };
    ws[cellAddr].s = {
      font: { bold: true, color: { rgb: 'FFFFFF' } },
      fill: { fgColor: { rgb: '6366F1' } },
      alignment: { horizontal: 'center', vertical: 'center', wrapText: false },
      border: {
        bottom: { style: 'thin', color: { rgb: 'FFFFFF' } },
      },
    };
  }

  // Wrap feedback column
  for (let R = headerRowIndex + 1; R <= colRange.e.r; R++) {
    const cellAddr = XLSX.utils.encode_cell({ r: R, c: 3 });
    if (ws[cellAddr]) {
      ws[cellAddr].s = { alignment: { wrapText: true, vertical: 'top' } };
    }
  }

  // Column widths
  ws['!cols'] = [
    { wch: 6 },   // S.No
    { wch: 18 },  // Reg No
    { wch: 28 },  // Name
    { wch: 60 },  // Feedback
    { wch: 14 },  // Attachments
    { wch: 24 },  // Submitted At
    { wch: 12 },  // Source
  ];

  ws['!freeze'] = { xSplit: 0, ySplit: headerRowIndex + 1 };

  ws['!autofilter'] = {
    ref: XLSX.utils.encode_range({
      s: { r: headerRowIndex, c: 0 },
      e: { r: headerRowIndex, c: numDataCols - 1 },
    }),
  };

  XLSX.utils.book_append_sheet(wb, ws, 'Submissions');
  const cleanTitle = eventInfo.title.replace(/[^a-zA-Z0-9]/g, '_');
  XLSX.writeFile(wb, `${cleanTitle}_Submissions_${Date.now()}.xlsx`);
}
