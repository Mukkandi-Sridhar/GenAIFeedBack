import { motion } from 'framer-motion';
import { Download, ExternalLink, FileText, Image as ImageIcon, File, Calendar, Hash, User, Shield, BookOpen } from 'lucide-react';
import { exportIndividualPDF } from '@/lib/export-pdf';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import type { Submission } from '@/types';

interface StudentReportProps {
  submission: Submission;
  /** Compact mode = no extra padding, used inside panels */
  compact?: boolean;
}

function fileIcon(url: string) {
  const ext = url.split('.').pop()?.toLowerCase();
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) return <ImageIcon className="w-4 h-4 text-teal-400" />;
  if (ext === 'pdf') return <FileText className="w-4 h-4 text-red-400" />;
  return <File className="w-4 h-4 text-indigo-400" />;
}

export function StudentReport({ submission, compact = false }: StudentReportProps) {
  const formattedDate = new Date(submission.created_at).toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Kolkata',
  });

  const metaItems = [
    { icon: <Hash className="w-3.5 h-3.5" />, label: 'Reg No', value: submission.reg_no, mono: true },
    { icon: <User className="w-3.5 h-3.5" />, label: 'Name', value: submission.student_name },
    { icon: <Calendar className="w-3.5 h-3.5" />, label: 'Submitted', value: formattedDate },
    { icon: <Shield className="w-3.5 h-3.5" />, label: 'Source', value: null },
  ];

  return (
    <div className={`space-y-5 ${compact ? '' : 'max-w-2xl mx-auto'}`}>
      {/* Meta card */}
      <div className="glass-card rounded-xl p-4 space-y-3">
        {metaItems.map(({ icon, label, value, mono }) => (
          <div key={label} className="flex items-start gap-3">
            <span className="text-slate-400 mt-0.5 shrink-0">{icon}</span>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">{label}</p>
              {label === 'Source' ? (
                <Badge type={submission.source === 'admin_added' ? 'admin_added' : 'submitted'} />
              ) : (
                <p className={`text-sm text-slate-200 ${mono ? 'font-mono font-bold text-indigo-300' : 'font-medium'}`}>{value}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Feedback */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Feedback</h4>
        </div>
        <div className="glass-card rounded-xl p-4">
          <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">{submission.feedback_text}</p>
        </div>
      </div>

      {/* Attachments */}
      {submission.file_urls.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <File className="w-3.5 h-3.5 text-teal-400" />
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Attachments ({submission.file_urls.length})
            </h4>
          </div>
          <div className="space-y-2">
            {submission.file_urls.map((url, i) => {
              const filename = decodeURIComponent(url.split('/').pop() || `file-${i + 1}`);
              const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(filename);
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="glass-card rounded-lg p-3"
                >
                  {isImage && (
                    <img
                      src={url}
                      alt={filename}
                      className="w-full max-h-40 object-contain rounded-lg mb-2 bg-black/20"
                      loading="lazy"
                    />
                  )}
                  <div className="flex items-center gap-2">
                    {fileIcon(url)}
                    <span className="text-xs text-slate-300 truncate flex-1">{filename}</span>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-400 hover:text-indigo-300 transition-colors shrink-0"
                      aria-label={`Open ${filename}`}
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                    <a
                      href={url}
                      download={filename}
                      className="text-teal-400 hover:text-teal-300 transition-colors shrink-0"
                      aria-label={`Download ${filename}`}
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Download PDF */}
      <Button
        variant="outline"
        size="sm"
        icon={<Download className="w-4 h-4" />}
        onClick={() => exportIndividualPDF(submission)}
        className="w-full"
        id={`download-report-${submission.id}`}
      >
        Download Individual Report PDF
      </Button>
    </div>
  );
}
