import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Search, X, Users, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { StudentCard } from './StudentCard';
import { RosterSkeleton } from '@/components/ui/Skeleton';
import { stagger } from '@/components/layout/PageTransition';
import type { Student } from '@/types';

interface RosterGridProps {
  students: Student[];
  loading: boolean;
  error: string | null;
}

export function RosterGrid({ students, loading, error }: RosterGridProps) {
  const [query, setQuery] = useState('');
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
            Every registered student in this session has submitted their conference feedback.
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
              onClick={() => navigate(`/feedback/${encodeURIComponent(student.reg_no)}`)}
            />
          ))}
        </motion.div>
      )}

      {query && filtered.length > 0 && (
        <p className="text-xs text-zinc-500 font-semibold text-center">
          Showing {filtered.length} of {pendingStudents.length} pending students
        </p>
      )}
    </div>
  );
}
