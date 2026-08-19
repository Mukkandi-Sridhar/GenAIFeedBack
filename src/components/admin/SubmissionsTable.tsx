import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, ChevronUp, ChevronDown, ChevronsUpDown, X, Filter, Trash2,
  Star, ChevronRight,
} from 'lucide-react';
import { SkeletonRow } from '@/components/ui/Skeleton';
import { Badge } from '@/components/ui/Badge';
import { APPROVED_QUESTIONS } from '@/lib/questions';
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

/** Resolve answers from JSONB or legacy feedback_text */
function resolveAnswers(s: Submission): Record<string, any> {
  if (s.answers && Object.keys(s.answers).length > 0) return s.answers;
  if (!s.feedback_text || !s.feedback_text.includes(' -> ')) return {};
  const result: Record<string, string> = {};
  for (let i = 0; i < APPROVED_QUESTIONS.length; i++) {
    const q = APPROVED_QUESTIONS[i];
    const nextQ = APPROVED_QUESTIONS[i + 1];
    const m1 = `${q.label} -> `, m2 = `${q.label}\n-> `;
    let si = s.feedback_text.indexOf(m1), ml = m1.length;
    if (si === -1) { si = s.feedback_text.indexOf(m2); ml = m2.length; }
    if (si === -1) continue;
    const vs = si + ml;
    let ve = s.feedback_text.length;
    if (nextQ) {
      const n1 = s.feedback_text.indexOf(` | ${nextQ.label} -> `, vs);
      const n2 = s.feedback_text.indexOf(`\n\n${nextQ.label}`, vs);
      if (n1 !== -1) ve = n1; else if (n2 !== -1) ve = n2;
    }
    result[q.id] = s.feedback_text.slice(vs, ve).replace(/^\s*->\s*/, '').trim();
  }
  return result;
}

function getRatingColor(r: number) {
  if (r >= 4) return 'text-emerald-400';
  if (r >= 3) return 'text-amber-400';
  return 'text-rose-400';
}

export function SubmissionsTable({
  submissions, loading, selectedId, onSelect, highlightId, onDeleteSubmission,
}: SubmissionsTableProps) {
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('created_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [filterSource, setFilterSource] = useState<FilterSource>('all');

  const filtered = useMemo(() => {
    let arr = submissions;
    if (filterSource !== 'all') arr = arr.filter((s) => s.source === filterSource);
    if (query.trim()) {
      const q = query.toLowerCase();
      arr = arr.filter(
        (s) => s.reg_no.toLowerCase().includes(q) || s.student_name.toLowerCase().includes(q)
      );
    }
    return [...arr].sort((a, b) => {
      const av: any = sortKey === 'sno' ? 0 : (a as any)[sortKey];
      const bv: any = sortKey === 'sno' ? 0 : (b as any)[sortKey];
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [submissions, query, sortKey, sortDir, filterSource]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('desc'); }
  };

  const handleDeleteRow = (e: React.MouseEvent, sub: Submission) => {
    e.stopPropagation();
    if (window.confirm(`Delete submission for ${sub.student_name} (${sub.reg_no})?\n\nThis resets their status to pending.`)) {
      onDeleteSubmission?.(sub);
    }
  };

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k) return <ChevronsUpDown className="w-3 h-3 opacity-30" />;
    return sortDir === 'asc' ? <ChevronUp className="w-3 h-3 text-white" /> : <ChevronDown className="w-3 h-3 text-white" />;
  };

  const Th = ({ label, k, cls = '' }: { label: string; k: SortKey; cls?: string }) => (
    <th className={`px-4 py-3.5 text-left text-[11px] font-bold text-zinc-400 uppercase tracking-wider cursor-pointer hover:text-white transition-colors select-none ${cls}`} onClick={() => toggleSort(k)}>
      <span className="flex items-center gap-1">{label}<SortIcon k={k} /></span>
    </th>
  );

  // Toolbar — shared between mobile and desktop
  const Toolbar = (
    <div className="flex flex-wrap gap-2 items-center shrink-0">
      <div className="relative flex-1 min-w-[160px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500 pointer-events-none" />
        <input
          type="search"
          placeholder="Search…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-8 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-white/30 transition-all"
          id="admin-search"
        />
        {query && (
          <button onClick={() => setQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl p-1">
        <Filter className="w-3.5 h-3.5 text-zinc-500 ml-1" />
        {(['all', 'student', 'admin_added'] as FilterSource[]).map((src) => (
          <button key={src} onClick={() => setFilterSource(src)} className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${filterSource === src ? 'bg-white text-black shadow-md' : 'text-zinc-400 hover:text-white'}`}>
            {src === 'all' ? 'All' : src === 'student' ? 'Student' : 'Admin'}
          </button>
        ))}
      </div>
      <span className="text-xs text-zinc-500 font-medium shrink-0">{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
    </div>
  );

  return (
    <div className="flex flex-col h-full gap-3">
      {Toolbar}

      {/* ── MOBILE CARD LIST (< lg) ──────────────────────────────── */}
      <div className="lg:hidden flex-1 overflow-y-auto space-y-2 pb-4">
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="glass-card rounded-xl p-4 animate-pulse">
                <div className="h-3 bg-white/10 rounded w-1/3 mb-2" />
                <div className="h-4 bg-white/10 rounded w-2/3 mb-3" />
                <div className="h-2 bg-white/5 rounded w-full" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-zinc-500 text-sm">No submissions found.</div>
        ) : (
          filtered.map((sub, i) => {
            const ans = resolveAnswers(sub);
            const avgR = sub.avg_rating || 0;
            const isSelected = selectedId === sub.id;
            const isHighlight = highlightId === sub.id;

            return (
              <motion.div
                key={sub.id}
                initial={isHighlight ? { backgroundColor: 'rgba(255,255,255,0.12)' } : {}}
                animate={{ backgroundColor: 'transparent' }}
                transition={{ duration: 1.5 }}
                onClick={() => onSelect(sub)}
                className={`glass-card rounded-xl p-4 cursor-pointer transition-all border ${
                  isSelected
                    ? 'border-indigo-500/50 bg-indigo-500/5'
                    : 'border-white/5 hover:border-white/15 hover:bg-white/[0.02]'
                }`}
              >
                {/* Top row */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-mono font-bold text-indigo-300">{sub.reg_no}</span>
                      <Badge type={sub.source === 'admin_added' ? 'admin_added' : 'submitted'} />
                    </div>
                    <p className="text-sm font-bold text-white mt-0.5 truncate">{sub.student_name}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {avgR > 0 && (
                      <span className={`text-xs font-extrabold flex items-center gap-0.5 ${getRatingColor(avgR)}`}>
                        <Star className="w-3 h-3 fill-current" />{avgR.toFixed(1)}
                      </span>
                    )}
                    <ChevronRight className="w-4 h-4 text-zinc-500" />
                  </div>
                </div>

                {/* Q answers preview — show Q1, Q2, Q3 */}
                <div className="mt-2.5 space-y-1.5">
                  {APPROVED_QUESTIONS.slice(0, 4).map((q) => {
                    const val = ans[q.id];
                    if (!val || val === 'N/A') return null;
                    return (
                      <div key={q.id} className="flex items-start gap-2">
                        <span className="text-[9px] font-extrabold text-zinc-600 bg-white/5 px-1 py-0.5 rounded shrink-0 font-mono mt-0.5">{q.id.toUpperCase()}</span>
                        {q.type === 'rating' ? (
                          <div className="flex items-center gap-0.5">
                            {Array.from({ length: 5 }).map((_, idx) => (
                              <Star key={idx} className={`w-3 h-3 ${Number(val) >= idx + 1 ? 'text-yellow-400 fill-current' : 'text-zinc-700'}`} />
                            ))}
                            <span className="text-[10px] text-zinc-400 font-bold ml-1">{val}/5</span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-zinc-300 font-semibold line-clamp-1">{val}</span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Bottom row */}
                <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-white/5">
                  <span className="text-[10px] text-zinc-500">
                    {new Date(sub.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <button
                    onClick={(e) => handleDeleteRow(e, sub)}
                    className="p-1.5 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors cursor-pointer"
                    aria-label="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* ── DESKTOP TABLE (≥ lg) ─────────────────────────────────── */}
      <div className="hidden lg:flex overflow-auto flex-1 rounded-xl border border-white/10 glass-card">
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
              <tr><td colSpan={8} className="text-center py-16 text-zinc-500 text-sm">No submissions found.</td></tr>
            ) : (
              filtered.map((sub, i) => (
                <AnimatePresence key={sub.id} mode="popLayout">
                  <motion.tr
                    initial={highlightId === sub.id ? { backgroundColor: 'rgba(255,255,255,0.15)' } : {}}
                    animate={{ backgroundColor: 'transparent' }}
                    transition={{ duration: 1.5 }}
                    onClick={() => onSelect(sub)}
                    className={`border-b border-white/5 cursor-pointer transition-colors hover:bg-white/5 ${selectedId === sub.id ? 'bg-white/10 border-white/20' : ''}`}
                  >
                    <td className="px-4 py-3 text-xs text-zinc-500">{i + 1}</td>
                    <td className="px-4 py-3 font-mono font-bold text-xs text-white">{sub.reg_no}</td>
                    <td className="px-4 py-3 text-sm text-zinc-200 font-semibold">{sub.student_name}</td>
                    <td className="px-4 py-3 text-xs text-zinc-400 max-w-[220px]">
                      <span className="line-clamp-2">{sub.feedback_text || ''}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-300 text-center font-bold">{sub.file_urls?.length ?? 0}</td>
                    <td className="px-4 py-3 text-xs text-zinc-400 whitespace-nowrap">
                      {new Date(sub.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-4 py-3"><Badge type={sub.source === 'admin_added' ? 'admin_added' : 'submitted'} /></td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={(e) => handleDeleteRow(e, sub)}
                        className="p-1.5 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors cursor-pointer"
                        title={`Delete submission for ${sub.student_name}`}
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
