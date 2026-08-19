import { useState, useMemo } from 'react';
import { Plus, Search, Send } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { FileUpload } from '@/components/feedback/FileUpload';
import { useToast } from '@/components/ui/Toast';
import { supabase, STORAGE_BUCKET } from '@/lib/supabase';
import { sanitizeFeedback, sanitizeName } from '@/lib/sanitize';
import type { Student } from '@/types';

interface AddFeedbackModalProps {
  pendingStudents: Student[];
  onSuccess: () => void;
}

export function AddFeedbackModal({ pendingStudents, onSuccess }: AddFeedbackModalProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [feedback, setFeedback] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const { addToast } = useToast();

  const filteredPending = useMemo(() => {
    const q = search.toLowerCase();
    return pendingStudents.filter(
      (s) => s.reg_no.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)
    );
  }, [pendingStudents, search]);

  const reset = () => {
    setSearch('');
    setSelectedStudent(null);
    setFeedback('');
    setFiles([]);
  };

  const handleClose = () => {
    setOpen(false);
    reset();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !feedback.trim()) return;
    setSubmitting(true);

    try {
      // Upload files
      const fileUrls: string[] = [];
      for (const file of files) {
        const path = `${selectedStudent.reg_no}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
        const { error: uploadErr } = await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(path, file, { upsert: false });
        if (uploadErr) throw new Error(`Upload failed: ${uploadErr.message}`);
        const { data: urlData } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
        fileUrls.push(urlData.publicUrl);
      }

      const { error: insertErr } = await supabase.from('submissions').insert({
        event_id: selectedStudent.event_id,
        reg_no: selectedStudent.reg_no,
        student_name: sanitizeName(selectedStudent.name),
        feedback_text: sanitizeFeedback(feedback),
        file_urls: fileUrls,
        source: 'admin_added',
      });
      if (insertErr) throw new Error(insertErr.message);

      const { error: updateErr } = await supabase
        .from('students')
        .update({ status: 'submitted', submitted_at: new Date().toISOString() })
        .eq('reg_no', selectedStudent.reg_no)
        .eq('event_id', selectedStudent.event_id);
      if (updateErr) throw new Error(updateErr.message);

      addToast('success', `Feedback added for ${selectedStudent.reg_no}`);
      onSuccess();
      handleClose();
    } catch (err: any) {
      addToast('error', err.message || 'Failed to add feedback');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Button
        variant="primary"
        size="sm"
        icon={<Plus className="w-4 h-4" />}
        onClick={() => setOpen(true)}
        id="add-feedback-btn"
      >
        Add Feedback
      </Button>

      <Modal open={open} onClose={handleClose} title="Add Feedback Manually" size="lg">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Student picker */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Select Student (Pending only)
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              <input
                type="search"
                placeholder="Search by reg no or name…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500/40 transition-all"
                id="admin-student-search"
              />
            </div>

            {selectedStudent ? (
              <div className="flex items-center gap-3 glass-card px-4 py-3 rounded-xl">
                <div className="flex-1">
                  <p className="text-xs font-bold text-indigo-300">{selectedStudent.reg_no}</p>
                  <p className="text-sm text-slate-200">{selectedStudent.name}</p>
                </div>
                <button
                  type="button"
                  onClick={() => { setSelectedStudent(null); setSearch(''); }}
                  className="text-slate-400 hover:text-red-400 transition-colors cursor-pointer text-xs"
                >
                  Change
                </button>
              </div>
            ) : (
              <div className="max-h-44 overflow-y-auto rounded-xl border border-white/10 divide-y divide-white/5">
                {filteredPending.length === 0 ? (
                  <p className="text-center py-6 text-slate-500 text-sm">No pending students</p>
                ) : (
                  filteredPending.map((s) => (
                    <button
                      key={s.reg_no}
                      type="button"
                      onClick={() => { setSelectedStudent(s); setSearch(s.reg_no); }}
                      className="w-full text-left px-4 py-2.5 hover:bg-indigo-500/10 transition-colors cursor-pointer"
                    >
                      <span className="text-xs font-mono text-indigo-300 mr-2">{s.reg_no}</span>
                      <span className="text-sm text-slate-200">{s.name}</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Feedback textarea */}
          <div className="space-y-1.5">
            <label htmlFor="admin-feedback" className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Feedback <span className="text-red-400">*</span>
            </label>
            <textarea
              id="admin-feedback"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={5}
              required
              placeholder="Enter feedback on behalf of the student…"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500/40 transition-all resize-y min-h-[100px]"
            />
          </div>

          {/* Files */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Attachments
            </label>
            <FileUpload files={files} onChange={setFiles} />
          </div>

          {/* Submit */}
          <Button
            type="submit"
            size="md"
            loading={submitting}
            disabled={!selectedStudent || !feedback.trim() || submitting}
            icon={<Send className="w-4 h-4" />}
            className="w-full"
          >
            Submit as Admin
          </Button>
        </form>
      </Modal>
    </>
  );
}
