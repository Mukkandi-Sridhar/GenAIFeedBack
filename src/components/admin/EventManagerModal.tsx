import { useState } from 'react';
import { Plus, Layers, Check, CheckCircle2, XCircle, Sparkles, UserPlus, Trash2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import type { EventModule } from '@/types';

interface EventManagerModalProps {
  events: EventModule[];
  activeEvent: EventModule | null;
  onSelectEvent: (eventId: string) => void;
  onCreateEvent: (
    newEvent: Omit<EventModule, 'id' | 'created_at'>,
    studentsList: Array<{ reg_no: string; name: string }>
  ) => Promise<EventModule>;
  onToggleActive: (eventId: string, isActive: boolean) => Promise<void>;
  onDeleteEvent: (eventId: string) => Promise<void>;
}

export function EventManagerModal({
  events,
  activeEvent,
  onSelectEvent,
  onCreateEvent,
  onToggleActive,
  onDeleteEvent,
}: EventManagerModalProps) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'list' | 'create'>('list');
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { addToast } = useToast();

  // Form State
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('Generative AI');
  const [department, setDepartment] = useState('CSE (AI & ML)');
  const [semester, setSemester] = useState('IV Year I Semester');
  const [eventDate, setEventDate] = useState('2026-08-19');
  const [rosterText, setRosterText] = useState('');

  const resetForm = () => {
    setTitle('');
    setSubject('Generative AI');
    setDepartment('CSE (AI & ML)');
    setSemester('IV Year I Semester');
    setEventDate('2026-08-19');
    setRosterText('');
    setMode('list');
  };

  const parseRosterInput = (): Array<{ reg_no: string; name: string }> => {
    if (!rosterText.trim()) return [];

    try {
      const parsed = JSON.parse(rosterText);
      if (typeof parsed === 'object' && !Array.isArray(parsed)) {
        return Object.entries(parsed).map(([reg_no, name]) => ({
          reg_no: String(reg_no).trim(),
          name: String(name).trim(),
        }));
      } else if (Array.isArray(parsed)) {
        return parsed.map((item) => ({
          reg_no: String(item.reg_no || item.id || '').trim(),
          name: String(item.name || '').trim(),
        })).filter((s) => s.reg_no && s.name);
      }
    } catch {
      const lines = rosterText.split(/\r?\n/).filter(Boolean);
      const list: Array<{ reg_no: string; name: string }> = [];

      for (const line of lines) {
        let parts = line.split(',');
        if (parts.length < 2) parts = line.split(':');
        if (parts.length < 2) parts = line.split('\t');

        if (parts.length >= 2) {
          const reg_no = parts[0].replace(/["']/g, '').trim();
          const name = parts.slice(1).join(' ').replace(/["']/g, '').trim();
          if (reg_no && name) list.push({ reg_no, name });
        }
      }
      return list;
    }
    return [];
  };

  const handleCreateSubmitted = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setSubmitting(true);
    try {
      const parsedStudents = parseRosterInput();
      const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

      await onCreateEvent(
        {
          slug,
          title: title.trim(),
          subject: subject.trim(),
          department: department.trim(),
          semester: semester.trim(),
          event_date: eventDate,
          is_active: true,
        },
        parsedStudents
      );

      addToast('success', `Created form module: "${title}" with ${parsedStudents.length} students`);
      resetForm();
      setOpen(false);
    } catch (err: any) {
      addToast('error', err.message || 'Failed to create form module');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (ev: EventModule) => {
    if (!window.confirm(`Are you sure you want to delete the form module "${ev.title}"?\n\nThis action cannot be undone.`)) {
      return;
    }

    setDeletingId(ev.id);
    try {
      await onDeleteEvent(ev.id);
      addToast('success', `Deleted form module: "${ev.title}"`);
    } catch (err: any) {
      addToast('error', err.message || 'Failed to delete form module');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        icon={<Layers className="w-4 h-4 text-indigo-400 dark:text-indigo-300" />}
        onClick={() => setOpen(true)}
        id="manage-modules-btn"
      >
        Form Modules ({events.length})
      </Button>

      <Modal
        open={open}
        onClose={() => { setOpen(false); resetForm(); }}
        title={mode === 'list' ? 'Form Modules & Event Management' : 'Create New Form Module'}
        size="xl"
      >
        {mode === 'list' ? (
          <div className="space-y-6">
            {/* Header action */}
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold text-slate-600 dark:text-zinc-400">
                Switch active module, toggle visibility, or delete/create event feedback forms.
              </p>
              <Button
                variant="primary"
                size="sm"
                icon={<Plus className="w-4 h-4" />}
                onClick={() => setMode('create')}
                id="create-new-module-btn"
              >
                New Form Module
              </Button>
            </div>

            {/* Modules Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {events.map((ev) => {
                const isSelected = activeEvent?.id === ev.id;
                const isDeleting = deletingId === ev.id;

                return (
                  <div
                    key={ev.id}
                    className={`glass-card p-4 rounded-xl flex flex-col justify-between border transition-all ${
                      isSelected
                        ? 'border-slate-900 dark:border-white/40 bg-slate-900/5 dark:bg-white/5 shadow-md'
                        : 'border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20'
                    }`}
                  >
                    <div className="space-y-2 mb-4">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-[10px] font-extrabold text-slate-800 dark:text-zinc-200 uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/10 border border-slate-300 dark:border-white/15">
                          {ev.subject}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {ev.is_active ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10">
                              <CheckCircle2 className="w-3 h-3" /> Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/5">
                              <XCircle className="w-3 h-3" /> Archived
                            </span>
                          )}
                        </div>
                      </div>

                      <h4 className="text-sm font-extrabold text-slate-950 dark:text-white leading-snug">{ev.title}</h4>
                      <p className="text-xs font-semibold text-slate-600 dark:text-zinc-400">
                        {ev.department} · {ev.semester}
                      </p>
                      <p className="text-[11px] font-medium text-slate-500">Date: {ev.event_date}</p>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-white/10 gap-2">
                      <button
                        onClick={() => onSelectEvent(ev.id)}
                        className={`text-xs font-extrabold px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-slate-950 text-white shadow-sm'
                            : 'bg-slate-100 dark:bg-white/5 text-slate-800 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-white/10'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5" />}
                        {isSelected ? 'Viewing' : 'Select'}
                      </button>

                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => onToggleActive(ev.id, !ev.is_active)}
                          className="text-[11px] font-semibold text-slate-600 dark:text-zinc-400 hover:text-slate-950 dark:hover:text-white transition-colors cursor-pointer"
                        >
                          {ev.is_active ? 'Archive' : 'Activate'}
                        </button>

                        <button
                          onClick={() => handleDelete(ev)}
                          disabled={isDeleting}
                          className="p-1 rounded text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all cursor-pointer"
                          title="Delete form module"
                          aria-label={`Delete form module ${ev.title}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* Create Mode */
          <form onSubmit={handleCreateSubmitted} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2 space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-400 uppercase tracking-wider">
                  Event / Session Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Conference on Quantum Computing & Cyber Security"
                  className="w-full bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-950 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:border-slate-800 dark:focus:border-white/40"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-400 uppercase tracking-wider">
                  Subject / Elective Name
                </label>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Generative AI"
                  className="w-full bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-950 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:border-slate-800 dark:focus:border-white/40"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-400 uppercase tracking-wider">
                  Event Date
                </label>
                <input
                  type="text"
                  required
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  placeholder="e.g. 19 August 2026"
                  className="w-full bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-950 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:border-slate-800 dark:focus:border-white/40"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-400 uppercase tracking-wider">
                  Department
                </label>
                <input
                  type="text"
                  required
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="e.g. CSE (AI & ML)"
                  className="w-full bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-950 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:border-slate-800 dark:focus:border-white/40"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-400 uppercase tracking-wider">
                  Class / Semester
                </label>
                <input
                  type="text"
                  required
                  value={semester}
                  onChange={(e) => setSemester(e.target.value)}
                  placeholder="e.g. IV Year I Semester"
                  className="w-full bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-950 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:border-slate-800 dark:focus:border-white/40"
                />
              </div>
            </div>

            {/* Roster Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-zinc-400 uppercase tracking-wider flex items-center justify-between">
                <span>Student Roster Intake (Optional)</span>
                <span className="text-[10px] text-slate-500 font-normal">JSON or Line-by-line: reg_no, name</span>
              </label>
              <textarea
                rows={6}
                value={rosterText}
                onChange={(e) => setRosterText(e.target.value)}
                placeholder={'Paste roster here:\n23091A3301, MEKALA AMMAR\n23091A3302, MEERIJA ANJUM\n\nOR JSON:\n{\n  "23091A3301": "MEKALA AMMAR"\n}'}
                className="w-full bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-xl px-4 py-3 text-xs font-mono text-slate-950 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-none focus:border-slate-800 dark:focus:border-white/40"
              />
              {rosterText.trim() && (
                <p className="text-xs font-bold text-slate-900 dark:text-indigo-300 flex items-center gap-1">
                  <UserPlus className="w-3.5 h-3.5" />
                  Detected {parseRosterInput().length} student records ready to seed
                </p>
              )}
            </div>

            {/* Buttons */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-white/10">
              <Button type="button" variant="ghost" size="sm" onClick={() => setMode('list')}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="md"
                loading={submitting}
                disabled={!title.trim() || submitting}
                icon={<Sparkles className="w-4 h-4" />}
              >
                Create Form Module
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
