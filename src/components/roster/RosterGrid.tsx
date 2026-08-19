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

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return students;
    return students.filter(
      (s) => s.reg_no.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)
    );
  }, [students, query]);

  const submittedCount = students.filter((s) => s.status === 'submitted').length;
  const pendingCount = students.filter((s) => s.status === 'pending').length;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
          <X className="w-8 h-8 text-red-400" />
        </div>
        <p className="text-slate-400 text-sm">Failed to load roster. Please refresh.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats bar */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2 glass-card px-4 py-2 rounded-xl">
          <Users className="w-4 h-4 text-indigo-400" />
          <span className="text-sm font-semibold text-slate-200">{students.length} Students</span>
        </div>
        <div className="flex items-center gap-2 glass-card px-4 py-2 rounded-xl">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span className="text-sm font-semibold text-emerald-300">{submittedCount} Submitted</span>
        </div>
        <div className="flex items-center gap-2 glass-card px-4 py-2 rounded-xl">
          <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
          <span className="text-sm font-semibold text-indigo-300">{pendingCount} Pending</span>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        <input
          type="search"
          placeholder="Search by reg no or name…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-10 py-3 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-all"
          aria-label="Search students"
          id="roster-search"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
            aria-label="Clear search"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Grid */}
      {loading ? (
        <RosterSkeleton count={69} />
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <Search className="w-8 h-8 mx-auto mb-3 opacity-40" />
          <p>No students match "{query}"</p>
        </div>
      ) : (
        <motion.div
          variants={stagger.container}
          initial="initial"
          animate="animate"
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3"
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
        <p className="text-xs text-slate-500 text-center">
          Showing {filtered.length} of {students.length} students
        </p>
      )}
    </div>
  );
}
