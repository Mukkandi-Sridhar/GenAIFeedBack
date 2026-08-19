import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Search, X, Users, CheckCircle2, ShieldAlert } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { StudentCard } from './StudentCard';
import { RosterSkeleton } from '@/components/ui/Skeleton';
import { stagger } from '@/components/layout/PageTransition';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import type { Student } from '@/types';

interface RosterGridProps {
  students: Student[];
  loading: boolean;
  error: string | null;
}

export function RosterGrid({ students, loading, error }: RosterGridProps) {
  const [query, setQuery] = useState('');
  const [confirmStudent, setConfirmStudent] = useState<Student | null>(null);
  const navigate = useNavigate();

  // Filter out submitted students — only show pending students in the roster
  const pendingStudents = useMemo(() => {
    return students.filter((s) => s.status === 'pending');
  }, [students]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return pendingStudents;
    return pendingStudents.filter(
      (s) => s.reg_no.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)
    );
  }, [pendingStudents, query]);

  const submittedCount = students.filter((s) => s.status === 'submitted').length;
  const pendingCount = pendingStudents.length;

  const handleSelectStudent = (student: Student) => {
    setConfirmStudent(student);
  };

  const handleProceed = () => {
    if (confirmStudent) {
      const reg = confirmStudent.reg_no;
      setConfirmStudent(null);
      navigate(`/feedback/${encodeURIComponent(reg)}`);
    }
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 glass-card p-8 rounded-2xl">
        <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center">
          <X className="w-7 h-7 text-red-400" />
        </div>
        <p className="text-zinc-300 font-bold text-sm">Failed to load roster. Please refresh.</p>
        <p className="text-xs text-zinc-500 max-w-sm text-center">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats bar */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2 glass-card px-4 py-2 rounded-xl">
          <Users className="w-4 h-4 text-indigo-400" />
          <span className="text-sm font-extrabold text-white">{students.length} Total</span>
        </div>
        <div className="flex items-center gap-2 glass-card px-4 py-2 rounded-xl">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span className="text-sm font-extrabold text-emerald-400">{submittedCount} Submitted</span>
        </div>
        <div className="flex items-center gap-2 glass-card px-4 py-2 rounded-xl">
          <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
          <span className="text-sm font-extrabold text-zinc-200">{pendingCount} Pending</span>
        </div>
      </div>

      {/* Search */}
      {pendingStudents.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
          <input
            type="search"
            placeholder="Search by reg no or name…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-zinc-900/90 border border-zinc-800 rounded-xl pl-10 pr-10 py-3 text-sm font-medium text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-600 transition-all shadow-md"
            aria-label="Search pending students"
            id="roster-search"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors cursor-pointer"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* Grid */}
      {loading ? (
        <RosterSkeleton count={69} />
      ) : pendingStudents.length === 0 ? (
        <div className="glass-card p-12 text-center space-y-3 rounded-2xl">
          <div className="w-14 h-14 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-black text-white">All Submissions Complete! 🎉</h3>
          <p className="text-sm font-medium text-zinc-400 max-w-md mx-auto">
            Every registered student in this session has submitted their feedback.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-zinc-400 font-medium">
          <Search className="w-8 h-8 mx-auto mb-3 opacity-40" />
          <p>No pending students match "{query}"</p>
        </div>
      ) : (
        <motion.div
          variants={stagger.container}
          initial="initial"
          animate="animate"
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5"
        >
          {filtered.map((student) => (
            <StudentCard
              key={student.reg_no}
              student={student}
              onClick={() => handleSelectStudent(student)}
            />
          ))}
        </motion.div>
      )}

      {query && filtered.length > 0 && (
        <p className="text-xs text-zinc-500 font-semibold text-center">
          Showing {filtered.length} of {pendingStudents.length} pending students
        </p>
      )}

      {/* Anonymity Confirmation Modal */}
      <Modal
        open={confirmStudent !== null}
        onClose={() => setConfirmStudent(null)}
        title="🔒 Anonymity Confirmation"
        size="md"
      >
        {confirmStudent && (
          <div className="space-y-6 text-center py-2">
            <div className="w-12 h-12 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto">
              <ShieldAlert className="w-6 h-6" />
            </div>

            <div className="space-y-2">
              <p className="text-xs font-extrabold text-zinc-400 uppercase tracking-widest">
                Selected Identity
              </p>
              <h3 className="text-base font-black text-white leading-snug">
                {confirmStudent.name} <span className="font-mono text-indigo-300 font-bold block sm:inline sm:ml-1">({confirmStudent.reg_no})</span>
              </h3>
            </div>

            <blockquote className="text-xs text-zinc-400 font-bold bg-white/[0.01] p-4 rounded-xl border border-white/5 leading-relaxed text-left">
              Registration numbers are used <em className="text-indigo-300 not-italic font-bold">only</em> to track overall completion status and prevent duplicate attempts. Individual registration numbers and names are <strong className="text-white">never</strong> attached to your feedback responses in reports.
            </blockquote>

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setConfirmStudent(null)}
                className="flex-1 py-3"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={handleProceed}
                className="flex-1 py-3"
              >
                Yes, Proceed
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
