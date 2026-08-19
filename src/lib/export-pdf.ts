import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Submission, EventModule } from '@/types';
import { APPROVED_QUESTIONS } from '@/lib/questions';
import { DEFAULT_EVENT } from '@/lib/supabase';

// ─── Letterhead ────────────────────────────────────────────────────
function addLetterhead(doc: jsPDF, eventInfo: EventModule): number {
  const pageWidth = doc.internal.pageSize.getWidth();

  // Top accent line
  doc.setFillColor(99, 102, 241);
  doc.rect(0, 0, pageWidth, 3, 'F');

  // Header block
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(20, 30, 70);
  doc.text(`${eventInfo.department} | ${eventInfo.semester}`, pageWidth / 2, 14, { align: 'center' });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 70, 100);
  doc.text(`Conference: ${eventInfo.title}  |  Subject: ${eventInfo.subject}  |  Date: ${eventInfo.event_date}`, pageWidth / 2, 21, { align: 'center' });

  // Divider
  doc.setDrawColor(220, 220, 240);
  doc.setLineWidth(0.3);
  doc.line(14, 26, pageWidth - 14, 26);

  return 30; // Y cursor after letterhead
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
  // Use landscape orientation for multi-column feedback mapping
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const startY = addLetterhead(doc, eventInfo);

  const rows = submissions.map((s, i) => {
    const answers = s.answers || {};
    return [
      i + 1,
      s.reg_no,
      s.student_name,
      answers.q1 !== undefined ? `${answers.q1}/5` : 'N/A',
      answers.q2 || 'N/A',
      answers.q3 || 'N/A',
      answers.q4 !== undefined ? `${answers.q4}/5` : 'N/A',
      answers.q5 !== undefined ? `${answers.q5}/5` : 'N/A',
      answers.q6 || 'N/A',
      answers.q7 !== undefined ? `${answers.q7}/5` : 'N/A',
      answers.q8 || 'N/A',
      answers.q9 || 'N/A',
      answers.q10 || 'N/A',
      s.avg_rating !== undefined ? s.avg_rating : 'N/A',
      s.file_urls.length,
    ];
  });

  const headers = [
    'S.No',
    'Reg No',
    'Name',
    'Q1 (Teaching)',
    'Q2 (Expls)',
    'Q3 (Pace)',
    'Q4 (Doubts)',
    'Q5 (Engage)',
    'Q6 (Examples)',
    'Q7 (Struct)',
    'Q8 (Liked)',
    'Q9 (Suggest)',
    'Q10 (Comments)',
    'Avg',
    'Files',
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

  // Student block header
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
    ['Overall Avg Rating', submission.avg_rating !== undefined ? `${submission.avg_rating} / 5` : 'N/A'],
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

  // Print Q1-Q10 responses
  APPROVED_QUESTIONS.forEach((q) => {
    // Check height limits to prevent page overflow
    if (y > 260) {
      doc.addPage();
      y = addLetterhead(doc, eventInfo) + 10;
    }

    doc.setFont('helvetica', 'bold');
    doc.text(`${q.id.toUpperCase()}. ${q.label}`, 14, y);
    y += 4.5;

    doc.setFont('helvetica', 'normal');
    const rawVal = submission.answers ? submission.answers[q.id] : null;
    const answer = rawVal !== null && rawVal !== undefined ? rawVal : (q.id === 'q10' ? submission.feedback_text : 'N/A');

    const formattedAnswer = q.type === 'rating' ? `${answer} / 5` : String(answer);
    const textLines = doc.splitTextToSize(formattedAnswer, pageWidth - 28);
    doc.text(textLines, 18, y);
    y += textLines.length * 4.5 + 4;
  });

  // Attachments
  if (submission.file_urls.length > 0) {
    if (y > 250) {
      doc.addPage();
      y = addLetterhead(doc, eventInfo) + 10;
    }

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
