import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { User, MessageSquare, Send, ArrowLeft } from 'lucide-react';
import { supabase, STORAGE_BUCKET } from '@/lib/supabase';
import { sanitizeFeedback, sanitizeName } from '@/lib/sanitize';
import { FileUpload } from './FileUpload';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { stagger } from '@/components/layout/PageTransition';
import type { Student } from '@/types';

interface FeedbackFormProps {
  student: Student;
}

export function FeedbackForm({ student }: FeedbackFormProps) {
  const [name, setName] = useState(student.name);
  const [feedback, setFeedback] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { addToast } = useToast();
  const navigate = useNavigate();

  const canSubmit = feedback.trim().length > 0 && !submitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    setFileError(null);

    try {
      // ── 1. Server-side re-check (race condition guard) ──────────
      const { data: fresh, error: checkErr } = await supabase
        .from('students')
        .select('status')
        .eq('reg_no', student.reg_no)
        .single();

      if (checkErr) throw new Error('Could not verify submission status');
      if (fresh.status === 'submitted') {
        addToast('warning', 'This registration has already been submitted.');
        navigate('/');
        return;
      }

      // ── 2. Upload files ─────────────────────────────────────────
      const fileUrls: string[] = [];
      for (const file of files) {
        const path = `${student.reg_no}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
        const { error: uploadErr } = await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(path, file, { upsert: false });

        if (uploadErr) throw new Error(`Upload failed for ${file.name}: ${uploadErr.message}`);

        const { data: urlData } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
        fileUrls.push(urlData.publicUrl);
      }

      // ── 3. Insert submission ────────────────────────────────────
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

      // ── 4. Update student status ────────────────────────────────
      const { error: updateErr } = await supabase
        .from('students')
        .update({ status: 'submitted', submitted_at: new Date().toISOString() })
        .eq('reg_no', student.reg_no)
        .eq('event_id', student.event_id);

      if (updateErr) throw new Error(updateErr.message);

      addToast('success', `Feedback submitted for ${student.reg_no}!`);
      navigate('/roster', { replace: true });
    } catch (err: any) {
      addToast('error', err.message || 'Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.form
      onSubmit={handleSubmit}
      variants={stagger.container}
      initial="initial"
      animate="animate"
      className="space-y-6 max-w-2xl mx-auto"
    >
      {/* Back */}
      <motion.div variants={stagger.item}>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Roster
        </button>
      </motion.div>

      {/* Reg No (read-only) */}
      <motion.div variants={stagger.item} className="space-y-1.5">
        <label htmlFor="reg-no" className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Registration Number
        </label>
        <div className="flex items-center gap-3 glass-card px-4 py-3 rounded-xl">
          <User className="w-4 h-4 text-indigo-400 shrink-0" />
          <span className="text-sm font-bold text-indigo-300 tracking-wide">{student.reg_no}</span>
          <span className="text-xs text-slate-500 ml-auto">read-only</span>
        </div>
      </motion.div>

      {/* Name */}
      <motion.div variants={stagger.item} className="space-y-1.5">
        <label htmlFor="student-name" className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Full Name
        </label>
        <input
          id="student-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter your full name"
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-all"
          aria-required="true"
        />
      </motion.div>

      {/* Feedback */}
      <motion.div variants={stagger.item} className="space-y-1.5">
        <label htmlFor="feedback-text" className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
          <MessageSquare className="w-3.5 h-3.5" />
          Conference Feedback
          <span className="text-red-400">*</span>
        </label>
        <textarea
          id="feedback-text"
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder="Share your thoughts on the session — key takeaways, speaker insights, topics you'd like to explore further, overall experience…"
          rows={7}
          required
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-all resize-y min-h-[120px]"
          aria-required="true"
        />
        <p className="text-[11px] text-slate-500 text-right">{feedback.length} / 5000</p>
      </motion.div>

      {/* File Upload */}
      <motion.div variants={stagger.item} className="space-y-1.5">
        <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
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
          className="w-full sm:w-auto"
          id="submit-feedback-btn"
        >
          {submitting ? 'Submitting…' : 'Submit Feedback'}
        </Button>
        {!feedback.trim() && (
          <p className="text-xs text-slate-500 mt-2">Feedback text is required to submit.</p>
        )}
      </motion.div>
    </motion.form>
  );
}
