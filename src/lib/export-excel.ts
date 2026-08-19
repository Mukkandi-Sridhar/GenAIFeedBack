import * as XLSX from 'xlsx';
import type { Submission, EventModule } from '@/types';
import { APPROVED_QUESTIONS, calculateAverageRating } from '@/lib/questions';
import { DEFAULT_EVENT } from '@/lib/supabase';

// ─── Shared legacy parser (mirrors export-pdf.ts) ─────────────────
function parseLegacyFeedback(text: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (let i = 0; i < APPROVED_QUESTIONS.length; i++) {
    const q = APPROVED_QUESTIONS[i];
    const nextQ = APPROVED_QUESTIONS[i + 1];
    const marker1 = `${q.label} -> `;
    const marker2 = `${q.label}\n-> `;
    let startIdx = text.indexOf(marker1);
    let markerLen = marker1.length;
    if (startIdx === -1) { startIdx = text.indexOf(marker2); markerLen = marker2.length; }
    if (startIdx === -1) continue;
    const valueStart = startIdx + markerLen;
    let valueEnd = text.length;
    if (nextQ) {
      const sep1 = text.indexOf(` | ${nextQ.label} -> `, valueStart);
      const sep2 = text.indexOf(`\n\n${nextQ.label}`, valueStart);
      if (sep1 !== -1) valueEnd = sep1;
      else if (sep2 !== -1) valueEnd = sep2;
    }
    result[q.id] = text.slice(valueStart, valueEnd).replace(/^\s*->\s*/, '').trim();
  }
  return result;
}

function resolveAnswers(s: Submission): Record<string, any> {
  if (s.answers && Object.keys(s.answers).length > 0) return s.answers;
  if (s.feedback_text && s.feedback_text.includes(' -> ')) return parseLegacyFeedback(s.feedback_text);
  return {};
}

function resolveAvgRating(s: Submission, ans: Record<string, any>): number | string {
  if (s.avg_rating && s.avg_rating > 0) return s.avg_rating;
  const computed = calculateAverageRating(ans);
  return computed > 0 ? computed : 'N/A';
}

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
    const ans = resolveAnswers(s);
    const fmtRating = (id: string) => (ans[id] !== undefined && ans[id] !== '' && ans[id] !== 'N/A' ? ans[id] : 'N/A');
    const fmtText = (id: string) => (ans[id] && ans[id] !== 'N/A' ? String(ans[id]) : 'N/A');
    return [
      i + 1,
      s.reg_no,
      s.student_name,
      fmtRating('q1'),
      fmtText('q2'),
      fmtText('q3'),
      fmtRating('q4'),
      fmtRating('q5'),
      fmtText('q6'),
      fmtRating('q7'),
      fmtText('q8'),
      fmtText('q9'),
      fmtText('q10'),
      resolveAvgRating(s, ans),
      s.file_urls?.length ?? 0,
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
