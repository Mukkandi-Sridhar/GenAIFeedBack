import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ChevronUp, ChevronDown, ChevronsUpDown, X, Filter, Trash2 } from 'lucide-react';
import { SkeletonRow } from '@/components/ui/Skeleton';
import { Badge } from '@/components/ui/Badge';
import type { Submission } from '@/types';

type SortKey = keyof Submission | 'sno';
type SortDir = 'asc' | 'desc';
type FilterSource = 'all' | 'student' | 'admin_added';

interface SubmissionsTableProps {
  submissions: Submission[];
  loading: boolean;
  selectedId: string | null;
  onSelect: (sub: Submission) => void;
  highlightId?: string | null;
  onDeleteSubmission?: (sub: Submission) => void;
}

export function SubmissionsTable({
  submissions,
  loading,
  selectedId,
  onSelect,
  highlightId,
  onDeleteSubmission,
}: SubmissionsTableProps) {
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('created_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [filterSource, setFilterSource] = useState<FilterSource>('all');

  const filtered = useMemo(() => {
    let arr = submissions;

    if (filterSource !== 'all') {
      arr = arr.filter((s) => s.source === filterSource);
    }

    if (query.trim()) {
      const q = query.toLowerCase();
      arr = arr.filter(
        (s) =>
          s.reg_no.toLowerCase().includes(q) ||
          s.student_name.toLowerCase().includes(q) ||
          s.feedback_text.toLowerCase().includes(q)
      );
    }

    return [...arr].sort((a, b) => {
      let av: any = sortKey === 'sno' ? 0 : (a as any)[sortKey];
      let bv: any = sortKey === 'sno' ? 0 : (b as any)[sortKey];
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [submissions, query, sortKey, sortDir, filterSource]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const handleDeleteRow = (e: React.MouseEvent, sub: Submission) => {
    e.stopPropagation();
    if (
      window.confirm(
        `Are you sure you want to delete the submission for ${sub.student_name} (${sub.reg_no})?\n\nThis will reset their status back to pending.`
      )
    ) {
      onDeleteSubmission?.(sub);
    }
  };

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k) return <ChevronsUpDown className="w-3 h-3 opacity-30" />;
    return sortDir === 'asc' ? <ChevronUp className="w-3 h-3 text-white" /> : <ChevronDown className="w-3 h-3 text-white" />;
  };

  const Th = ({ label, k, cls = '' }: { label: string; k: SortKey; cls?: string }) => (
    <th
      className={`px-4 py-3.5 text-left text-[11px] font-bold text-zinc-400 uppercase tracking-wider cursor-pointer hover:text-white transition-colors select-none ${cls}`}
      onClick={() => toggleSort(k)}
    >
      <span className="flex items-center gap-1">
        {label}
        <SortIcon k={k} />
      </span>
    </th>
  );

  return (
    <div className="flex flex-col h-full gap-3">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-2 items-center shrink-0">
        {/* Search */}
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500 pointer-events-none" />
          <input
            type="search"
            placeholder="Search submissions…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-8 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-white/30 transition-all"
            aria-label="Search submissions"
            id="admin-search"
          />
          {query && (
            <button onClick={() => setQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white cursor-pointer">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Source filter */}
        <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl p-1">
          <Filter className="w-3.5 h-3.5 text-zinc-500 ml-1" />
          {(['all', 'student', 'admin_added'] as FilterSource[]).map((src) => (
            <button
              key={src}
              onClick={() => setFilterSource(src)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filterSource === src
                  ? 'bg-white text-black shadow-md'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              {src === 'all' ? 'All' : src === 'student' ? 'Student' : 'Admin'}
            </button>
          ))}
        </div>

        <span className="text-xs text-zinc-500 font-medium shrink-0">{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Table */}
      <div className="overflow-auto flex-1 rounded-xl border border-white/10 glass-card">
        <table className="w-full text-sm data-table min-w-[750px]">
          <thead>
            <tr className="border-b border-white/10">
              <Th label="S.No" k="sno" cls="w-14" />
              <Th label="Reg No" k="reg_no" />
              <Th label="Name" k="student_name" />
              <th className="px-4 py-3.5 text-left text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Feedback</th>
              <Th label="Files" k="file_urls" cls="w-16" />
              <Th label="Submitted At" k="created_at" />
              <Th label="Source" k="source" cls="w-24" />
              <th className="px-4 py-3.5 text-center text-[11px] font-bold text-zinc-400 uppercase tracking-wider w-12">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-16 text-zinc-500 text-sm">
                  No submissions found.
                </td>
              </tr>
            ) : (
              filtered.map((sub, i) => (
                <AnimatePresence key={sub.id} mode="popLayout">
                  <motion.tr
                    initial={highlightId === sub.id ? { backgroundColor: 'rgba(255,255,255,0.15)' } : {}}
                    animate={{ backgroundColor: 'transparent' }}
                    transition={{ duration: 1.5 }}
                    onClick={() => onSelect(sub)}
                    className={`border-b border-white/5 cursor-pointer transition-colors hover:bg-white/5 ${
                      selectedId === sub.id ? 'bg-white/10 border-white/20' : ''
                    }`}
                  >
                    <td className="px-4 py-3 text-xs text-zinc-500">{i + 1}</td>
                    <td className="px-4 py-3 font-mono font-bold text-xs text-white">{sub.reg_no}</td>
                    <td className="px-4 py-3 text-sm text-zinc-200 font-semibold">{sub.student_name}</td>
                    <td className="px-4 py-3 text-xs text-zinc-400 max-w-[220px]">
                      <span className="line-clamp-2">{sub.feedback_text}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-300 text-center font-bold">{sub.file_urls.length}</td>
                    <td className="px-4 py-3 text-xs text-zinc-400 whitespace-nowrap">
                      {new Date(sub.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-4 py-3">
                      <Badge type={sub.source === 'admin_added' ? 'admin_added' : 'submitted'} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={(e) => handleDeleteRow(e, sub)}
                        className="p-1.5 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors cursor-pointer"
                        title={`Delete submission for ${sub.student_name}`}
                        aria-label={`Delete submission for ${sub.student_name}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </motion.tr>
                </AnimatePresence>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
