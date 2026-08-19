import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, MailOpen, Archive, Trash2, Star, Calendar, User, Search, Paperclip, ChevronRight, X, ArrowLeft, ArrowUpRight, FileText } from 'lucide-react';
import { APPROVED_QUESTIONS } from '@/lib/questions';
import type { Submission } from '@/types';

interface SubmissionsInboxProps {
  submissions: Submission[];
  loading: boolean;
  onDeleteSubmission: (sub: Submission) => void;
  onToggleRead?: (sub: Submission) => void;
  onToggleArchive?: (sub: Submission) => void;
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

  // Set first item as active by default on desktop
  useEffect(() => {
    if (!activeSubId && submissions.length > 0 && window.innerWidth >= 1024) {
      // Find first non-archived submission
      const first = submissions.find((s) => inboxFilter === 'archived' ? s.is_archived : !s.is_archived);
      if (first) setActiveSubId(first.id);
    }
  }, [submissions, activeSubId, inboxFilter]);

  // Filter submissions by search query & archive state
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
          s.student_name.toLowerCase().includes(q) ||
          (s.feedback_text && s.feedback_text.toLowerCase().includes(q))
      );
    }
    return list;
  }, [submissions, query, inboxFilter]);

  const handleSelectRow = (sub: Submission) => {
    setActiveSubId(sub.id);
    // Mark as read in DB if unread
    if (!sub.is_read && onToggleRead) {
      onToggleRead(sub);
    }
  };

  const getRatingColorClass = (rating: number) => {
    if (rating >= 4) return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25';
    if (rating >= 3) return 'bg-amber-500/10 text-amber-400 border border-amber-500/25';
    return 'bg-rose-500/10 text-rose-400 border border-rose-500/25';
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
    } catch {
      return '';
    }
  };

  return (
    <div className="glass-card rounded-2xl overflow-hidden border border-white/10 flex h-[620px]">
      {/* ── LEFT INBOX COLUMN ───────────────────────────────────── */}
      <div className="w-full lg:w-[380px] shrink-0 border-r border-white/10 flex flex-col h-full bg-zinc-950/20">
        {/* Inbox Search & Filter Header */}
        <div className="p-4 border-b border-white/10 space-y-3 shrink-0">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-white uppercase tracking-wider">Inbox</h3>
            <div className="flex items-center gap-1 bg-white/5 p-0.5 rounded-lg border border-white/5">
              <button
                onClick={() => setInboxFilter('active')}
                className={`px-2.5 py-1 rounded-md text-[10px] font-extrabold tracking-wider transition-all cursor-pointer ${
                  inboxFilter === 'active' ? 'bg-white text-black shadow' : 'text-zinc-400 hover:text-white'
                }`}
              >
                ACTIVE
              </button>
              <button
                onClick={() => setInboxFilter('archived')}
                className={`px-2.5 py-1 rounded-md text-[10px] font-extrabold tracking-wider transition-all cursor-pointer ${
                  inboxFilter === 'archived' ? 'bg-white text-black shadow' : 'text-zinc-400 hover:text-white'
                }`}
              >
                ARCHIVED
              </button>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
            <input
              type="search"
              placeholder="Search inbox..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-700"
            />
          </div>
        </div>

        {/* Inbox Submissions List */}
        <div className="flex-1 overflow-y-auto divide-y divide-white/5">
          {loading ? (
            <div className="p-8 text-center text-xs text-zinc-500">Loading inbox...</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-xs text-zinc-500">No entries in inbox.</div>
          ) : (
            filtered.map((sub) => {
              const isSelected = activeSubId === sub.id;
              const isUnread = !sub.is_read;
              const avgRating = sub.avg_rating || 0;
              const hasAttachments = sub.file_urls && sub.file_urls.length > 0;

              return (
                <div
                  key={sub.id}
                  onClick={() => handleSelectRow(sub)}
                  className={`p-4 transition-all duration-150 cursor-pointer relative flex flex-col gap-1.5 ${
                    isSelected
                      ? 'bg-white/5 border-l-2 border-indigo-500'
                      : 'hover:bg-white/[0.02] border-l-2 border-transparent'
                  }`}
                >
                  {/* Status dot & Name */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {isUnread && (
                        <span className="relative flex h-2 w-2 shrink-0">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                        </span>
                      )}
                      <span className={`text-xs truncate font-bold ${isUnread ? 'text-white' : 'text-zinc-300'}`}>
                        {sub.student_name}
                      </span>
                    </div>
                    <span className="text-[10px] text-zinc-500 shrink-0 font-medium">
                      {getRelativeTime(sub.created_at)}
                    </span>
                  </div>

                  {/* Reg No & Average Rating badge */}
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-zinc-400 font-bold">{sub.reg_no}</span>
                    <div className="flex items-center gap-2">
                      {hasAttachments && <Paperclip className="w-3 h-3 text-zinc-500" />}
                      {avgRating > 0 && (
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full shrink-0 ${getRatingColorClass(avgRating)}`}>
                          ⭐ {avgRating}
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

      {/* ── RIGHT READING PANE ─────────────────────────────────── */}
      <div className="flex-1 flex flex-col h-full bg-zinc-950/40 relative">
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
              {/* Header Email Toolbar */}
              <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between shrink-0 bg-zinc-900/60 backdrop-blur">
                <div className="flex items-center gap-3">
                  {/* Back button visible only on mobile */}
                  <button
                    onClick={() => setActiveSubId(null)}
                    className="lg:hidden p-1.5 rounded-lg text-zinc-400 hover:text-white bg-white/5"
                    aria-label="Back to inbox list"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <div>
                    <h4 className="text-sm font-bold text-white leading-tight">
                      {activeSub.student_name}
                    </h4>
                    <p className="text-[10px] font-mono text-zinc-400 font-bold">{activeSub.reg_no}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => onToggleRead?.(activeSub)}
                    className={`p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer`}
                    title={activeSub.is_read ? 'Mark as unread' : 'Mark as read'}
                  >
                    {activeSub.is_read ? <Mail className="w-4 h-4" /> : <MailOpen className="w-4 h-4" />}
                  </button>

                  <button
                    onClick={() => onToggleArchive?.(activeSub)}
                    className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                    title={activeSub.is_archived ? 'Move to active' : 'Archive submission'}
                  >
                    <Archive className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => onDeleteSubmission(activeSub)}
                    className="p-2 rounded-xl text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors cursor-pointer"
                    title="Delete submission and reset student status"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Email Content Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Meta details */}
                <div className="flex items-center gap-6 text-[10px] font-bold text-zinc-500 uppercase tracking-widest bg-white/[0.01] p-3 rounded-xl border border-white/5 shrink-0">
                  <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-zinc-400" />
                    <span>REG: {activeSub.reg_no}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                    <span>DATE: {new Date(activeSub.created_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}</span>
                  </div>
                </div>

                {/* Structured Answers list */}
                <div className="space-y-6">
                  {APPROVED_QUESTIONS.map((question) => {
                    const rawVal = activeSub.answers ? activeSub.answers[question.id] : null;
                    const answer = rawVal !== null && rawVal !== undefined ? rawVal : activeSub.feedback_text;

                    return (
                      <div key={question.id} className="space-y-2 border-l-2 border-white/10 pl-4 py-0.5">
                        <p className="text-xs font-bold text-zinc-400">
                          {question.label}
                        </p>

                        <div className="pt-1">
                          {/* Rating View */}
                          {question.type === 'rating' && (
                            <div className="flex items-center gap-1">
                              {Array.from({ length: question.scale || 5 }).map((_, idx) => {
                                const starVal = idx + 1;
                                const isFilled = Number(answer) >= starVal;
                                return (
                                  <Star
                                    key={idx}
                                    className={`w-4 h-4 ${isFilled ? 'text-yellow-400 fill-current' : 'text-zinc-700'}`}
                                  />
                                );
                              })}
                            </div>
                          )}

                          {/* Select group option */}
                          {question.type === 'single_select' && (
                            <span className="inline-flex px-3 py-1 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-bold">
                              {answer}
                            </span>
                          )}

                          {/* Text & Textarea View */}
                          {(question.type === 'short_text' || question.type === 'textarea') && (
                            <blockquote className="text-sm font-semibold text-white bg-white/[0.01] p-3 rounded-xl border border-white/5 italic">
                              "{answer || 'No comments left'}"
                            </blockquote>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Intake files attachments list */}
                {activeSub.file_urls && activeSub.file_urls.length > 0 && (
                  <div className="border-t border-white/10 pt-4 space-y-2 shrink-0">
                    <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                      Attachments ({activeSub.file_urls.length})
                    </p>
                    <div className="flex flex-col gap-2">
                      {activeSub.file_urls.map((url, idx) => {
                        const filename = url.split('/').pop()?.split('_').slice(1).join('_') || `Attachment_${idx + 1}`;
                        return (
                          <a
                            key={idx}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-between p-3 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.06] text-xs font-bold text-white hover:text-indigo-400 transition-all"
                          >
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
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-zinc-500">
              <Mail className="w-12 h-12 mb-3 opacity-20" />
              <p className="text-sm">Select an inbox row to read submission report</p>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
