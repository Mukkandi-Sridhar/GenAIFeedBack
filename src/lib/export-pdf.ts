import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Submission, EventModule } from '@/types';
import { APPROVED_QUESTIONS, calculateAverageRating } from '@/lib/questions';
import { DEFAULT_EVENT } from '@/lib/supabase';

// ─── Legacy feedback_text parser ───────────────────────────────────
/**
 * Parse old "Label -> answer | Label2 -> answer2" (new delimited) OR
 * "Label\n-> answer\n\nLabel2\n-> answer2" (very old newline) format.
 */
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

/** Returns structured answers map, falling back to parsing feedback_text if needed. */
function resolveAnswers(s: Submission): Record<string, any> {
  if (s.answers && Object.keys(s.answers).length > 0) return s.answers;
  if (s.feedback_text && s.feedback_text.includes(' -> ')) return parseLegacyFeedback(s.feedback_text);
  return {};
}

/** Compute avg rating from resolved answers if s.avg_rating is missing. */
function resolveAvgRating(s: Submission, answers: Record<string, any>): number {
  if (s.avg_rating && s.avg_rating > 0) return s.avg_rating;
  return calculateAverageRating(answers);
}

// ─── Letterhead ────────────────────────────────────────────────────
function addLetterhead(doc: jsPDF, eventInfo: EventModule): number {
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFillColor(99, 102, 241);
  doc.rect(0, 0, pageWidth, 3, 'F');

  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(20, 30, 70);
  doc.text(`${eventInfo.department} | ${eventInfo.semester}`, pageWidth / 2, 14, { align: 'center' });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 70, 100);
  const metaText = `Subject: ${eventInfo.subject}${eventInfo.coordinator ? ` (Faculty: ${eventInfo.coordinator})` : ''}  |  Date: ${eventInfo.event_date}`;
  doc.text(metaText, pageWidth / 2, 21, { align: 'center' });

  doc.setDrawColor(220, 220, 240);
  doc.setLineWidth(0.3);
  doc.line(14, 26, pageWidth - 14, 26);

  return 30;
}

// ─── Footer ────────────────────────────────────────────────────────
function addFooter(doc: jsPDF): void {
  const pageCount = doc.internal.pages.length - 1;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const generated = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 170);
    doc.text(`Page ${i} of ${pageCount}  |  Generated: ${generated} IST`, pageWidth / 2, pageHeight - 8, { align: 'center' });
    doc.setFillColor(99, 102, 241);
    doc.rect(0, pageHeight - 3, pageWidth, 3, 'F');
  }
}

// ─── Bulk PDF Export (Landscape) ──────────────────────────────────
export function exportBulkPDF(submissions: Submission[], eventInfo: EventModule = DEFAULT_EVENT): void {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const startY = addLetterhead(doc, eventInfo);

  const rows = submissions.map((s, i) => {
    const ans = resolveAnswers(s);
    const avg = resolveAvgRating(s, ans);

    const fmtRating = (id: string) => (ans[id] !== undefined && ans[id] !== '' && ans[id] !== 'N/A' ? `${ans[id]}/5` : 'N/A');
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
      avg > 0 ? avg.toFixed(1) : 'N/A',
      s.file_urls?.length ?? 0,
    ];
  });

  const headers = [
    'S.No', 'Reg No', 'Name',
    'Q1 (Teaching)', 'Q2 (Expls)', 'Q3 (Pace)',
    'Q4 (Doubts)', 'Q5 (Engage)', 'Q6 (Examples)',
    'Q7 (Struct)', 'Q8 (Liked)', 'Q9 (Suggest)',
    'Q10 (Comments)', 'Avg', 'Files',
  ];

  autoTable(doc, {
    startY,
    head: [headers],
    body: rows,
    headStyles: {
      fillColor: [99, 102, 241],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
    },
    bodyStyles: { fontSize: 7.5, textColor: [30, 40, 80] },
    alternateRowStyles: { fillColor: [245, 246, 255] },
    margin: { top: 30, left: 10, right: 10 },
    showHead: 'everyPage',
    styles: { overflow: 'ellipsize', cellPadding: 1.5 },
  });

  addFooter(doc);
  const cleanTitle = eventInfo.title.replace(/[^a-zA-Z0-9]/g, '_');
  doc.save(`${cleanTitle}_Structured_Feedback_${Date.now()}.pdf`);
}

// ─── Individual PDF Export ─────────────────────────────────────────
export function exportIndividualPDF(submission: Submission, eventInfo: EventModule = DEFAULT_EVENT): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = addLetterhead(doc, eventInfo);

  const ans = resolveAnswers(submission);
  const avg = resolveAvgRating(submission, ans);

  // Student header block
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(20, 30, 70);
  doc.text('Individual Student Evaluation Report', 14, y + 6);

  y += 14;
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(40, 50, 90);

  const meta = [
    ['Registration No', submission.reg_no],
    ['Student Name', submission.student_name],
    ['Submitted At', new Date(submission.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })],
    ['Source', submission.source === 'admin_added' ? 'Admin Added' : 'Student Submission'],
    ['Overall Avg Rating', avg > 0 ? `${avg.toFixed(1)} / 5` : 'N/A'],
  ];

  meta.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold');
    doc.text(`${label}:`, 14, y);
    doc.setFont('helvetica', 'normal');
    doc.text(String(value), 55, y);
    y += 6.5;
  });

  y += 4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text('Evaluation Responses:', 14, y);
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(50, 60, 100);

  // Q1–Q10 responses
  APPROVED_QUESTIONS.forEach((q, idx) => {
    if (y > 260) {
      doc.addPage();
      y = addLetterhead(doc, eventInfo) + 10;
    }

    const rawVal = ans[q.id];
    const hasAnswer = rawVal !== undefined && rawVal !== null && String(rawVal).trim() !== '' && rawVal !== 'N/A';
    const displayVal = hasAnswer
      ? (q.type === 'rating' ? `${rawVal} / 5` : String(rawVal))
      : 'N/A';

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 40, 80);
    doc.text(`Q${idx + 1}. ${q.label}`, 14, y);
    y += 4.5;

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(50, 60, 100);
    const textLines = doc.splitTextToSize(displayVal, pageWidth - 28);
    doc.text(textLines, 18, y);
    y += textLines.length * 4.5 + 5;
  });

  // Attachments
  if (submission.file_urls?.length > 0) {
    if (y > 250) { doc.addPage(); y = addLetterhead(doc, eventInfo) + 10; }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(20, 30, 70);
    doc.text('Submitted Attachments:', 14, y);
    y += 6;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(60, 80, 130);
    submission.file_urls.forEach((url, i) => {
      const filename = url.split('/').pop() || url;
      doc.text(`${i + 1}. ${filename}`, 18, y);
      y += 5;
    });
  }

  addFooter(doc);
  doc.save(`${submission.reg_no}_Feedback_Report.pdf`);
}
