import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Submission, EventModule } from '@/types';
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

// ─── Bulk PDF Export ───────────────────────────────────────────────
export function exportBulkPDF(submissions: Submission[], eventInfo: EventModule = DEFAULT_EVENT): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const startY = addLetterhead(doc, eventInfo);

  const rows = submissions.map((s, i) => [
    i + 1,
    s.reg_no,
    s.student_name,
    s.feedback_text.length > 100 ? s.feedback_text.slice(0, 97) + '…' : s.feedback_text,
    s.file_urls.length,
    new Date(s.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
    s.source === 'admin_added' ? 'Admin' : 'Student',
  ]);

  autoTable(doc, {
    startY,
    head: [['S.No', 'Reg No', 'Name', 'Feedback Summary', 'Files', 'Submitted At', 'Source']],
    body: rows,
    headStyles: {
      fillColor: [99, 102, 241],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
    },
    bodyStyles: { fontSize: 8, textColor: [30, 40, 80] },
    alternateRowStyles: { fillColor: [245, 246, 255] },
    columnStyles: {
      0: { cellWidth: 10 },
      1: { cellWidth: 25 },
      2: { cellWidth: 35 },
      3: { cellWidth: 55 },
      4: { cellWidth: 12 },
      5: { cellWidth: 30 },
      6: { cellWidth: 18 },
    },
    didDrawPage: (_data: unknown) => { addLetterhead(doc, eventInfo); },
    margin: { top: 30, left: 14, right: 14 },
    showHead: 'everyPage',
    styles: { overflow: 'linebreak', cellPadding: 2 },
  });

  addFooter(doc);
  const cleanTitle = eventInfo.title.replace(/[^a-zA-Z0-9]/g, '_');
  doc.save(`${cleanTitle}_Submissions_${Date.now()}.pdf`);
}

// ─── Individual PDF Export ─────────────────────────────────────────
export function exportIndividualPDF(submission: Submission, eventInfo: EventModule = DEFAULT_EVENT): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = addLetterhead(doc, eventInfo);

  // Student block
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(20, 30, 70);
  doc.text('Individual Student Report', 14, y + 6);

  y += 14;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(40, 50, 90);

  const meta = [
    ['Registration No', submission.reg_no],
    ['Student Name', submission.student_name],
    ['Submitted At', new Date(submission.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })],
    ['Source', submission.source === 'admin_added' ? 'Admin Added' : 'Student Submission'],
  ];

  meta.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold');
    doc.text(`${label}:`, 14, y);
    doc.setFont('helvetica', 'normal');
    doc.text(value, 55, y);
    y += 7;
  });

  // Feedback
  y += 4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Feedback:', 14, y);
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(50, 60, 100);

  const textLines = doc.splitTextToSize(submission.feedback_text, pageWidth - 28);
  doc.text(textLines, 14, y);
  y += textLines.length * 5 + 8;

  // Attachments
  if (submission.file_urls.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(20, 30, 70);
    doc.text('Attachments:', 14, y);
    y += 6;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(60, 80, 130);
    submission.file_urls.forEach((url, i) => {
      const filename = url.split('/').pop() || url;
      doc.text(`${i + 1}. ${filename}`, 18, y);
      y += 5.5;
    });
  }

  addFooter(doc);
  doc.save(`${submission.reg_no}_Report.pdf`);
}
