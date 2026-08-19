import * as XLSX from 'xlsx';
import type { Submission, EventModule } from '@/types';
import { DEFAULT_EVENT } from '@/lib/supabase';

export function exportBulkExcel(submissions: Submission[], eventInfo: EventModule = DEFAULT_EVENT): void {
  const wb = XLSX.utils.book_new();

  // ─── Letterhead rows ───────────────────────────────────────────
  const header = [
    [`${eventInfo.department} | ${eventInfo.semester}`],
    [`Subject: ${eventInfo.subject}${eventInfo.coordinator ? ` (Faculty: ${eventInfo.coordinator})` : ''}  |  Date: ${eventInfo.event_date}`],
    [`Generated: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST`],
    [], // blank spacer row
  ];

  // ─── Column Headers mapping structured feedback ─────────────────
  const colHeaders = [
    'S.No',
    'Reg No',
    'Name',
    'Q1 (Overall Teaching Rating)',
    'Q2 (Clear Explanations)',
    'Q3 (Teaching Pace)',
    'Q4 (Doubts Addressed)',
    'Q5 (Engaging & Interactive)',
    'Q6 (Examples Helpful)',
    'Q7 (Class Organization)',
    'Q8 (What Liked Most)',
    'Q9 (Suggestions for Improvement)',
    'Q10 (Additional Feedback)',
    'Avg Rating',
    'AttachmentsCount',
    'Submitted At',
    'Source',
  ];

  const dataRows = submissions.map((s, i) => {
    const answers = s.answers || {};
    return [
      i + 1,
      s.reg_no,
      s.student_name,
      answers.q1 !== undefined ? answers.q1 : 'N/A',
      answers.q2 || 'N/A',
      answers.q3 || 'N/A',
      answers.q4 !== undefined ? answers.q4 : 'N/A',
      answers.q5 !== undefined ? answers.q5 : 'N/A',
      answers.q6 || 'N/A',
      answers.q7 !== undefined ? answers.q7 : 'N/A',
      answers.q8 || 'N/A',
      answers.q9 || 'N/A',
      answers.q10 || 'N/A',
      s.avg_rating !== undefined ? s.avg_rating : 'N/A',
      s.file_urls.length,
      new Date(s.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
      s.source === 'admin_added' ? 'Admin' : 'Student',
    ];
  });

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

  // Column widths
  ws['!cols'] = [
    { wch: 6 },   // S.No
    { wch: 18 },  // Reg No
    { wch: 28 },  // Name
    { wch: 20 },  // Q1
    { wch: 18 },  // Q2
    { wch: 18 },  // Q3
    { wch: 20 },  // Q4
    { wch: 20 },  // Q5
    { wch: 18 },  // Q6
    { wch: 20 },  // Q7
    { wch: 30 },  // Q8
    { wch: 30 },  // Q9
    { wch: 30 },  // Q10
    { wch: 12 },  // Avg Rating
    { wch: 15 },  // AttachmentsCount
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
  XLSX.writeFile(wb, `${cleanTitle}_Structured_Feedback_${Date.now()}.xlsx`);
}
