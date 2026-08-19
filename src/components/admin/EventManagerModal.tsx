import { useState } from 'react';
import { Plus, Layers, Check, CheckCircle2, XCircle, Sparkles, UserPlus } from 'lucide-react';
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
}

export function EventManagerModal({
  events,
  activeEvent,
  onSelectEvent,
  onCreateEvent,
  onToggleActive,
}: EventManagerModalProps) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'list' | 'create'>('list');
  const [submitting, setSubmitting] = useState(false);
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

    // Try JSON first
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
      // Fallback: line by line (reg_no, name OR reg_no: name)
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

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        icon={<Layers className="w-4 h-4 text-indigo-400" />}
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
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-400">
                Switch active module, toggle visibility, or add a new event feedback form.
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
                return (
                  <div
                    key={ev.id}
                    className={`glass-card p-4 rounded-xl flex flex-col justify-between border transition-all ${
                      isSelected
                        ? 'border-indigo-500/60 bg-indigo-500/10 shadow-[0_0_20px_rgba(99,102,241,0.2)]'
                        : 'border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="space-y-2 mb-4">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-[10px] font-semibold text-indigo-300 uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20">
                          {ev.subject}
                        </span>
                        <div className="flex items-center gap-1">
                          {ev.is_active ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 px-2 py-0.5 rounded-full bg-emerald-500/10">
                              <CheckCircle2 className="w-3 h-3" /> Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] text-slate-500 px-2 py-0.5 rounded-full bg-white/5">
                              <XCircle className="w-3 h-3" /> Archived
                            </span>
                          )}
                        </div>
                      </div>

                      <h4 className="text-sm font-bold text-slate-100 leading-snug">{ev.title}</h4>
                      <p className="text-xs text-slate-400">
                        {ev.department} · {ev.semester}
                      </p>
                      <p className="text-[11px] text-slate-500">Date: {ev.event_date}</p>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-white/10">
                      <button
                        onClick={() => onSelectEvent(ev.id)}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-indigo-500 text-white shadow-md'
                            : 'bg-white/5 text-slate-300 hover:bg-white/10'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5" />}
                        {isSelected ? 'Currently Viewing' : 'Select Module'}
                      </button>

                      <button
                        onClick={() => onToggleActive(ev.id, !ev.is_active)}
                        className="text-[11px] text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                      >
                        {ev.is_active ? 'Archive' : 'Activate'}
                      </button>
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
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Event / Session Title <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Conference on Quantum Computing & Cyber Security"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500/50"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Subject / Elective Name
                </label>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Generative AI"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500/50"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Event Date
                </label>
                <input
                  type="text"
                  required
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  placeholder="e.g. 19 August 2026"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500/50"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Department
                </label>
                <input
                  type="text"
                  required
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="e.g. CSE (AI & ML)"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500/50"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Class / Semester
                </label>
                <input
                  type="text"
                  required
                  value={semester}
                  onChange={(e) => setSemester(e.target.value)}
                  placeholder="e.g. IV Year I Semester"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500/50"
                />
              </div>
            </div>

            {/* Roster Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                <span>Student Roster Intake (Optional)</span>
                <span className="text-[10px] text-slate-500 font-normal">JSON or Line-by-line: reg_no, name</span>
              </label>
              <textarea
                rows={6}
                value={rosterText}
                onChange={(e) => setRosterText(e.target.value)}
                placeholder={'Paste roster here:\n23091A3301, MEKALA AMMAR\n23091A3302, MEERIJA ANJUM\n\nOR JSON:\n{\n  "23091A3301": "MEKALA AMMAR"\n}'}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500/50"
              />
              {rosterText.trim() && (
                <p className="text-xs text-indigo-300 flex items-center gap-1">
                  <UserPlus className="w-3.5 h-3.5" />
                  Detected {parseRosterInput().length} student records ready to seed
                </p>
              )}
            </div>

            {/* Buttons */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
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
