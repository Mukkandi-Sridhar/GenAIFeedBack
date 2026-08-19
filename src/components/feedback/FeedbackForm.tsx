import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Send, User, Hash, MessageSquare, CheckCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { FileUpload } from './FileUpload';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { sanitizeName, sanitizeFeedback } from '@/lib/sanitize';
import { stagger } from '@/components/layout/PageTransition';
import type { Student } from '@/types';

interface FeedbackFormProps {
  student: Student;
}

export function FeedbackForm({ student }: FeedbackFormProps) {
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [name, setName] = useState(student.name);
  const [feedback, setFeedback] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  const canSubmit = feedback.trim().length >= 10 && !submitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    setFileError(null);

    try {
      const fileUrls: string[] = [];
      for (const file of files) {
        const ext = file.name.split('.').pop();
        const path = `${student.reg_no}/${Date.now()}_${Math.random().toString(36).slice(2, 7)}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from('submissions')
          .upload(path, file, { cacheControl: '3600', upsert: false });

        if (uploadErr) {
          setFileError(`Failed to upload ${file.name}: ${uploadErr.message}`);
          setSubmitting(false);
          return;
        }

        const { data: publicUrlData } = supabase.storage
          .from('submissions')
          .getPublicUrl(path);

        fileUrls.push(publicUrlData.publicUrl);
      }

      const cleanFeedback = sanitizeFeedback(feedback);
      const cleanName = sanitizeName(name) || student.name;

      const { error: insertErr } = await supabase.from('submissions').insert({
        event_id: student.event_id,
        reg_no: student.reg_no,
        student_name: cleanName,
        feedback_text: cleanFeedback,
        file_urls: fileUrls,
        source: 'student',
      });

      if (insertErr) throw new Error(insertErr.message);

      const { error: updateErr } = await supabase
        .from('students')
        .update({ status: 'submitted', submitted_at: new Date().toISOString() })
        .eq('reg_no', student.reg_no);

      if (updateErr) console.warn('Note on status update:', updateErr.message);

      setSubmittedSuccess(true);
      addToast('success', 'Feedback submitted successfully!');
      setTimeout(() => navigate('/roster'), 2500);
    } catch (err: any) {
      addToast('error', err.message || 'Failed to submit feedback. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submittedSuccess) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-card p-10 text-center space-y-4"
      >
        <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto">
          <CheckCircle className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-black text-white">Thank You!</h2>
        <p className="text-sm font-medium text-zinc-300 max-w-md mx-auto">
          Your feedback for registration number <strong className="text-white font-bold">{student.reg_no}</strong> has been recorded.
        </p>
        <p className="text-xs text-zinc-500">Redirecting to roster in 2 seconds…</p>
      </motion.div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="glass-card p-6 sm:p-8 space-y-6">
      {/* Student Reg No (Read-only) */}
      <motion.div variants={stagger.item} className="space-y-1.5">
        <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
          <Hash className="w-3.5 h-3.5 text-indigo-400" />
          Registration Number
        </label>
        <input
          type="text"
          value={student.reg_no}
          disabled
          readOnly
          className="w-full bg-zinc-800/90 border border-zinc-700 rounded-xl px-4 py-3 text-sm font-mono font-bold text-white cursor-not-allowed select-none"
        />
      </motion.div>

      {/* Student Name */}
      <motion.div variants={stagger.item} className="space-y-1.5">
        <label htmlFor="student-name" className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
          <User className="w-3.5 h-3.5 text-indigo-400" />
          Student Name
        </label>
        <input
          id="student-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter your name"
          maxLength={100}
          className="w-full bg-zinc-900/90 border border-zinc-700 rounded-xl px-4 py-3 text-sm font-semibold text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 transition-all"
        />
      </motion.div>

      {/* Feedback */}
      <motion.div variants={stagger.item} className="space-y-1.5">
        <label htmlFor="feedback-text" className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
          <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
          Conference Feedback
          <span className="text-red-400">*</span>
        </label>
        <textarea
          id="feedback-text"
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder="Share your thoughts on the session — key takeaways, speaker insights, topics you explored and notes you, overall experience…"
          rows={7}
          required
          className="w-full bg-zinc-900/90 border border-zinc-700 rounded-xl px-4 py-3 text-sm font-medium text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 transition-all min-h-[120px]"
          aria-required="true"
        />
        <p className="text-[11px] font-bold text-zinc-500 text-right">{feedback.length} / 5000</p>
      </motion.div>

      {/* File Upload */}
      <motion.div variants={stagger.item} className="space-y-1.5">
        <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
          Attachments
        </label>
        <FileUpload files={files} onChange={setFiles} error={fileError} />
      </motion.div>

      {/* Submit */}
      <motion.div variants={stagger.item} className="pt-2">
        <Button
          type="submit"
          size="lg"
          loading={submitting}
          disabled={!canSubmit}
          icon={<Send className="w-4 h-4" />}
          className="w-full text-base py-3.5"
          id="submit-feedback-btn"
        >
          {submitting ? 'Submitting…' : 'Submit Feedback'}
        </Button>
      </motion.div>
    </form>
  );
}
