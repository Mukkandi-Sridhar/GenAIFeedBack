import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mail, MailOpen, Archive, Trash2, Star, Calendar, User, Search,
  Paperclip, ArrowLeft, ArrowUpRight, FileText, BarChart3, TrendingUp,
} from 'lucide-react';
import { APPROVED_QUESTIONS } from '@/lib/questions';
import { calculateAverageRating } from '@/lib/questions';
import type { Submission } from '@/types';

interface SubmissionsInboxProps {
  submissions: Submission[];
  loading: boolean;
  onDeleteSubmission: (sub: Submission) => void;
  onToggleRead?: (sub: Submission) => void;
  onToggleArchive?: (sub: Submission) => void;
}

/**
 * Parse legacy feedback_text string into a map keyed by question ID.
 * Handles both formats:
 *  - New:  "Label -> answer | Label2 -> answer2 | ..."
 *  - Old:  "Label\n-> answer\n\nLabel2\n-> answer2\n\n..."
 */
function parseLegacyFeedback(text: string): Record<string, string> {
  const result: Record<string, string> = {};

  for (let i = 0; i < APPROVED_QUESTIONS.length; i++) {
    const q = APPROVED_QUESTIONS[i];
    const nextQ = APPROVED_QUESTIONS[i + 1];

    // Find "Label -> " (both "Label -> " and "Label\n-> " variants)
    const marker1 = `${q.label} -> `;
    const marker2 = `${q.label}\n-> `;

    let startIdx = text.indexOf(marker1);
    let markerLen = marker1.length;

    if (startIdx === -1) {
      startIdx = text.indexOf(marker2);
      markerLen = marker2.length;
    }

    if (startIdx === -1) continue;

    const valueStart = startIdx + markerLen;

    // Find end: either next question label or end of string
    let valueEnd = text.length;
    if (nextQ) {
      const nextMarker1 = text.indexOf(` | ${nextQ.label} -> `, valueStart);
      const nextMarker2 = text.indexOf(`\n\n${nextQ.label}`, valueStart);
      if (nextMarker1 !== -1) valueEnd = nextMarker1;
      else if (nextMarker2 !== -1) valueEnd = nextMarker2;
    }

    const rawAnswer = text.slice(valueStart, valueEnd).replace(/^\s*->\s*/, '').trim();
    result[q.id] = rawAnswer;
  }

  return result;
}

/**
 * Get the answers map for a submission.
 * If structured JSONB answers exist, use those. Otherwise, parse legacy text.
 */
function resolveAnswers(sub: Submission): Record<string, any> {
  if (sub.answers && Object.keys(sub.answers).length > 0) return sub.answers;
  if (sub.feedback_text && sub.feedback_text.includes(' -> ')) {
    return parseLegacyFeedback(sub.feedback_text);
  }
  return {};
}

export function SubmissionsInbox({
  submissions,
  loading,
  onDeleteSubmission,
  onToggleRead,
  onToggleArchive,
}: SubmissionsInboxProps) {
  const [query, setQuery] = useState('');
  const [activeSubId, setActiveSubId] = useState<string | null>(null);
  const [inboxFilter, setInboxFilter] = useState<'active' | 'archived'>('active');

  const activeSub = useMemo(() => {
    return submissions.find((s) => s.id === activeSubId) || null;
  }, [submissions, activeSubId]);

  // Resolved answers for current submission
  const resolvedAnswers = useMemo(() => {
    if (!activeSub) return {};
    return resolveAnswers(activeSub);
  }, [activeSub]);

  // Compute avg rating from resolved answers (for legacy submissions that lack avg_rating)
  const computedAvgRating = useMemo(() => {
    if (activeSub?.avg_rating && activeSub.avg_rating > 0) return activeSub.avg_rating;
    if (Object.keys(resolvedAnswers).length > 0) return calculateAverageRating(resolvedAnswers);
    return 0;
  }, [activeSub, resolvedAnswers]);

  // Auto-select first item on desktop
  useEffect(() => {
    if (!activeSubId && submissions.length > 0 && window.innerWidth >= 1024) {
      const first = submissions.find((s) => inboxFilter === 'archived' ? s.is_archived : !s.is_archived);
      if (first) setActiveSubId(first.id);
    }
  }, [submissions, activeSubId, inboxFilter]);

  const filtered = useMemo(() => {
    let list = submissions.filter((s) => {
      const isArchived = s.is_archived || false;
      return inboxFilter === 'archived' ? isArchived : !isArchived;
    });
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (s) =>
          s.reg_no.toLowerCase().includes(q) ||
          s.student_name.toLowerCase().includes(q)
      );
    }
    return list;
  }, [submissions, query, inboxFilter]);

  const handleSelectRow = (sub: Submission) => {
    setActiveSubId(sub.id);
    if (!sub.is_read && onToggleRead) onToggleRead(sub);
  };

  const getRatingColorClass = (rating: number) => {
    if (rating >= 4) return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25';
    if (rating >= 3) return 'bg-amber-500/10 text-amber-400 border border-amber-500/25';
    return 'bg-rose-500/10 text-rose-400 border border-rose-500/25';
  };

  const getRatingBgClass = (rating: number) => {
    if (rating >= 4) return 'bg-emerald-500';
    if (rating >= 3) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  const getRelativeTime = (dateStr: string) => {
    try {
      const diffMs = Date.now() - new Date(dateStr).getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
    } catch { return ''; }
  };

  // Rating questions for mini dashboard bar
  const ratingQuestions = APPROVED_QUESTIONS.filter((q) => q.type === 'rating');

  return (
    <div className="glass-card rounded-2xl overflow-hidden border border-white/10 flex flex-col lg:flex-row" style={{ minHeight: '600px', maxHeight: '90vh' }}>
      {/* ── LEFT INBOX COLUMN ─────────────────────────────────────── */}
      <div className={`${activeSubId ? 'hidden lg:flex' : 'flex'} lg:w-[340px] w-full shrink-0 border-b lg:border-b-0 lg:border-r border-white/10 flex-col bg-zinc-950/20`}>
        {/* Header */}
        <div className="p-4 border-b border-white/10 space-y-3 shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-wider">Inbox</h3>
              <p className="text-[10px] text-zinc-500 font-semibold mt-0.5">{filtered.length} response{filtered.length !== 1 ? 's' : ''}</p>
            </div>
            <div className="flex items-center gap-1 bg-white/5 p-0.5 rounded-lg border border-white/5">
              <button onClick={() => setInboxFilter('active')} className={`px-2.5 py-1 rounded-md text-[10px] font-extrabold tracking-wider transition-all cursor-pointer ${inboxFilter === 'active' ? 'bg-white text-black shadow' : 'text-zinc-400 hover:text-white'}`}>ACTIVE</button>
              <button onClick={() => setInboxFilter('archived')} className={`px-2.5 py-1 rounded-md text-[10px] font-extrabold tracking-wider transition-all cursor-pointer ${inboxFilter === 'archived' ? 'bg-white text-black shadow' : 'text-zinc-400 hover:text-white'}`}>ARCHIVED</button>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
            <input type="search" placeholder="Search inbox..." value={query} onChange={(e) => setQuery(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-700" />
          </div>
        </div>

        {/* Submissions List */}
        <div className="flex-1 overflow-y-auto divide-y divide-white/5">
          {loading ? (
            <div className="p-8 text-center text-xs text-zinc-500">Loading inbox...</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-xs text-zinc-500">No entries in inbox.</div>
          ) : (
            filtered.map((sub) => {
              const isSelected = activeSubId === sub.id;
              const isUnread = !sub.is_read;
              const subAnswers = resolveAnswers(sub);
              const subRating = sub.avg_rating && sub.avg_rating > 0 ? sub.avg_rating : calculateAverageRating(subAnswers);
              const hasAttachments = sub.file_urls && sub.file_urls.length > 0;

              return (
                <div
                  key={sub.id}
                  onClick={() => handleSelectRow(sub)}
                  className={`p-4 transition-all duration-150 cursor-pointer relative flex flex-col gap-1.5 ${isSelected ? 'bg-white/5 border-l-2 border-indigo-500' : 'hover:bg-white/[0.02] border-l-2 border-transparent'}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {isUnread && (
                        <span className="relative flex h-2 w-2 shrink-0">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                        </span>
                      )}
                      <span className={`text-xs truncate font-bold ${isUnread ? 'text-white' : 'text-zinc-300'}`}>{sub.student_name}</span>
                    </div>
                    <span className="text-[10px] text-zinc-500 shrink-0 font-medium">{getRelativeTime(sub.created_at)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-zinc-400 font-bold">{sub.reg_no}</span>
                    <div className="flex items-center gap-2">
                      {hasAttachments && <Paperclip className="w-3 h-3 text-zinc-500" />}
                      {subRating > 0 && (
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full shrink-0 ${getRatingColorClass(subRating)}`}>
                          ★ {subRating.toFixed(1)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── RIGHT READING PANE ──────────────────────────────────────── */}
      <div className={`${activeSubId ? 'flex' : 'hidden lg:flex'} flex-1 flex-col bg-zinc-950/40 relative min-h-0`} style={{ minHeight: '560px' }}>
        <AnimatePresence mode="wait">
          {activeSub ? (
            <motion.div
              key={activeSub.id}
              initial={{ opacity: 0, scale: 0.99, filter: 'blur(4px)' }}
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, scale: 0.99, filter: 'blur(4px)' }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 flex flex-col"
            >
              {/* Toolbar Header */}
              <div className="px-5 py-3.5 border-b border-white/10 flex items-center justify-between shrink-0 bg-zinc-900/60 backdrop-blur gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <button onClick={() => setActiveSubId(null)} className="lg:hidden p-1.5 rounded-lg text-zinc-400 hover:text-white bg-white/5 shrink-0">
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <div className="min-w-0">
                    <h4 className="text-sm font-bold text-white leading-tight truncate">{activeSub.student_name}</h4>
                    <p className="text-[10px] font-mono text-zinc-400 font-bold">{activeSub.reg_no} · {new Date(activeSub.created_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => onToggleRead?.(activeSub)} className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer" title={activeSub.is_read ? 'Mark unread' : 'Mark read'}>
                    {activeSub.is_read ? <Mail className="w-4 h-4" /> : <MailOpen className="w-4 h-4" />}
                  </button>
                  <button onClick={() => onToggleArchive?.(activeSub)} className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer" title="Archive">
                    <Archive className="w-4 h-4" />
                  </button>
                  <button onClick={() => onDeleteSubmission(activeSub)} className="p-2 rounded-xl text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors cursor-pointer" title="Delete & reset student">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Scrollable Body */}
              <div className="flex-1 overflow-y-auto p-5 space-y-5">

                {/* ── RATINGS SUMMARY CARD ─────────────────────────── */}
                {computedAvgRating > 0 && (
                  <div className="bg-white/[0.025] border border-white/10 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-indigo-400" />
                        <span className="text-xs font-extrabold text-zinc-300 uppercase tracking-wider">Rating Overview</span>
                      </div>
                      <span className={`text-xs font-extrabold px-3 py-1 rounded-full ${getRatingColorClass(computedAvgRating)}`}>
                        Avg ★ {computedAvgRating.toFixed(1)} / 5
                      </span>
                    </div>
                    <div className="space-y-2">
                      {ratingQuestions.map((q) => {
                        const val = Number(resolvedAnswers[q.id]) || 0;
                        const pct = (val / (q.scale || 5)) * 100;
                        return (
                          <div key={q.id} className="space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] text-zinc-400 font-semibold truncate pr-2 max-w-[75%]">{q.label.replace(/How (well|engaging|clear|organized) (are|is) /, '').replace('?', '')}</span>
                              <span className="text-[10px] font-extrabold text-white shrink-0">{val > 0 ? `${val}/5` : '—'}</span>
                            </div>
                            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${pct}%` }}
                                transition={{ duration: 0.5, delay: 0.1 }}
                                className={`h-full rounded-full ${getRatingBgClass(val)}`}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ── Q&A RESPONSES ────────────────────────────────── */}
                <div className="space-y-4">
                  {APPROVED_QUESTIONS.map((question, idx) => {
                    const answer = resolvedAnswers[question.id];
                    const hasAnswer = answer !== null && answer !== undefined && String(answer).trim() !== '' && answer !== 'N/A';

                    return (
                      <div key={question.id} className="space-y-1.5">
                        {/* Question label */}
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-extrabold text-zinc-600 bg-white/5 px-1.5 py-0.5 rounded font-mono">Q{idx + 1}</span>
                          <p className="text-[11px] font-bold text-zinc-400 leading-snug">{question.label}</p>
                        </div>

                        {/* Answer */}
                        <div className="pl-6">
                          {question.type === 'rating' && (
                            <div className="flex items-center gap-1.5">
                              {Array.from({ length: question.scale || 5 }).map((_, i) => {
                                const isFilled = Number(answer) >= i + 1;
                                return (
                                  <Star key={i} className={`w-4 h-4 transition-colors ${isFilled ? 'text-yellow-400 fill-current' : 'text-zinc-700'}`} />
                                );
                              })}
                              {hasAnswer && (
                                <span className="ml-1 text-xs font-bold text-zinc-300">{answer}/5</span>
                              )}
                            </div>
                          )}

                          {question.type === 'single_select' && (
                            hasAnswer ? (
                              <span className="inline-flex px-3 py-1 rounded-lg bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 text-xs font-bold">
                                {answer}
                              </span>
                            ) : (
                              <span className="text-xs text-zinc-600 italic">Not answered</span>
                            )
                          )}

                          {(question.type === 'short_text' || question.type === 'textarea') && (
                            hasAnswer ? (
                              <div className="bg-white/[0.02] border border-white/5 rounded-xl px-3.5 py-3 text-sm text-white font-medium leading-relaxed">
                                {answer}
                              </div>
                            ) : (
                              <span className="text-xs text-zinc-600 italic">No response</span>
                            )
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* ── ATTACHMENTS ──────────────────────────────────── */}
                {activeSub.file_urls && activeSub.file_urls.length > 0 && (
                  <div className="border-t border-white/10 pt-4 space-y-2">
                    <p className="text-xs font-extrabold text-zinc-400 uppercase tracking-wider">
                      Attachments ({activeSub.file_urls.length})
                    </p>
                    <div className="flex flex-col gap-2">
                      {activeSub.file_urls.map((url, idx) => {
                        const filename = url.split('/').pop()?.split('_').slice(1).join('_') || `Attachment_${idx + 1}`;
                        return (
                          <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-between p-3 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.06] text-xs font-bold text-white hover:text-indigo-400 transition-all">
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-zinc-400" />
                              <span>{filename}</span>
                            </div>
                            <ArrowUpRight className="w-4 h-4 text-zinc-500" />
                          </a>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-zinc-600">
              <TrendingUp className="w-12 h-12 mb-3 opacity-20" />
              <p className="text-sm font-semibold">Select a submission to view full response</p>
              <p className="text-xs mt-1">Ratings, selections, and written feedback will appear here</p>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
