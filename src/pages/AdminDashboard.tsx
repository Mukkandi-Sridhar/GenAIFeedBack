import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Download, FileSpreadsheet, LogOut, ChevronDown, Inbox, Table } from 'lucide-react';
import { useAdminSession } from '@/hooks/useAdminSession';
import { useSubmissions } from '@/hooks/useSubmissions';
import { useStudents } from '@/hooks/useStudents';
import { useEvents } from '@/hooks/useEvents';
import { useToast } from '@/components/ui/Toast';
import { SummaryBar } from '@/components/admin/SummaryBar';
import { SubmissionsInbox } from '@/components/admin/SubmissionsInbox';
import { SubmissionsTable } from '@/components/admin/SubmissionsTable';
import { DetailPanel } from '@/components/admin/DetailPanel';
import { AddFeedbackModal } from '@/components/admin/AddFeedbackModal';
import { EventManagerModal } from '@/components/admin/EventManagerModal';
import { Button } from '@/components/ui/Button';
import { PageTransition } from '@/components/layout/PageTransition';
import { exportBulkPDF } from '@/lib/export-pdf';
import { exportBulkExcel } from '@/lib/export-excel';
import type { Submission } from '@/types';

export function AdminDashboard() {
  const navigate = useNavigate();
  const adminSlug = import.meta.env.VITE_ADMIN_SLUG || 'admin';
  const { isAuthed, logout } = useAdminSession();

  const {
    events,
    activeEvent,
    selectEvent,
    createEventModule,
    toggleEventActive,
    deleteEventModule,
  } = useEvents();

  const activeEventId = activeEvent?.id;

  const {
    submissions,
    loading: subLoading,
    connected,
    newSubmissionAlert,
    refetch,
    deleteSubmission,
    toggleReadStatus,
    toggleArchiveStatus,
  } = useSubmissions(activeEventId);

  const { students } = useStudents(activeEventId);
  const { addToast } = useToast();

  const [selectedSub, setSelectedSub] = useState<Submission | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  
  // Dashboard layout toggle: 'inbox' (default) or 'table'
  const [viewMode, setViewMode] = useState<'inbox' | 'table'>('inbox');

  // Guard: redirect if not authed
  useEffect(() => {
    if (!isAuthed) navigate(`/${adminSlug}`, { replace: true });
  }, [isAuthed, navigate, adminSlug]);

  // Toast + highlight on realtime new submission
  useEffect(() => {
    if (newSubmissionAlert) {
      addToast('info', `New submission from ${newSubmissionAlert.reg_no} — ${newSubmissionAlert.student_name}`);
      setHighlightId(newSubmissionAlert.id);
      setTimeout(() => setHighlightId(null), 2500);
    }
  }, [newSubmissionAlert, addToast]);

  const handleDeleteSubmission = async (sub: Submission) => {
    try {
      await deleteSubmission(sub);
      addToast('success', `Deleted submission for ${sub.student_name} (${sub.reg_no})`);
      if (selectedSub?.id === sub.id) {
        setSelectedSub(null);
      }
    } catch (err: any) {
      addToast('error', err.message || 'Failed to delete submission');
    }
  };

  const handleLogout = () => {
    logout();
    navigate(`/${adminSlug}`, { replace: true });
  };

  const pendingStudents = students.filter((s) => s.status === 'pending');
  const submittedCount = students.filter((s) => s.status === 'submitted').length;
  const pendingCount = students.filter((s) => s.status === 'pending').length;

  const handleExportPDF = () => {
    if (submissions.length === 0) { addToast('warning', 'No submissions to export'); return; }
    setExporting(true);
    setTimeout(() => {
      exportBulkPDF(submissions, activeEvent || undefined);
      setExporting(false);
      addToast('success', 'PDF exported successfully');
    }, 100);
  };

  const handleExportExcel = () => {
    if (submissions.length === 0) { addToast('warning', 'No submissions to export'); return; }
    exportBulkExcel(submissions, activeEvent || undefined);
    addToast('success', 'Excel exported successfully');
  };

  return (
    <PageTransition>
      <div className="min-h-screen flex flex-col bg-[#060b18] text-zinc-100">
        {/* ── Header ─────────────────────────────────────────────── */}
        <header className="sticky top-0 z-20 border-b border-white/10 backdrop-blur-xl bg-[#060B18]/90 shrink-0">
          <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-3 flex-wrap">
            {/* Title & Module Switcher */}
            <div className="flex items-center gap-3 min-w-0">
              <div>
                <h1 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  Admin Dashboard ·{' '}
                  <span className="gradient-text truncate max-w-[280px]">
                    {activeEvent?.title || 'Form Module'}
                  </span>
                </h1>
                <p className="text-[11px] text-slate-500 hidden sm:block">
                  {activeEvent?.department} · {activeEvent?.semester} · {activeEvent?.subject}
                </p>
              </div>

              {events.length > 1 && (
                <div className="relative">
                  <select
                    value={activeEvent?.id || ''}
                    onChange={(e) => selectEvent(e.target.value)}
                    className="appearance-none bg-white/5 border border-white/10 text-xs text-indigo-300 font-semibold rounded-lg pl-3 pr-7 py-1.5 focus:outline-none focus:border-indigo-500/50 cursor-pointer"
                  >
                    {events.map((ev) => (
                      <option key={ev.id} value={ev.id} className="bg-zinc-950 text-slate-200">
                        {ev.title} ({ev.subject})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              )}
            </div>

            {/* Action Bar */}
            <div className="flex items-center gap-2 flex-wrap">
              <EventManagerModal
                events={events}
                activeEvent={activeEvent}
                onSelectEvent={selectEvent}
                onCreateEvent={createEventModule}
                onToggleActive={toggleEventActive}
                onDeleteEvent={deleteEventModule}
              />

              <AddFeedbackModal pendingStudents={pendingStudents} onSuccess={refetch} />

              <Button
                variant="ghost"
                size="sm"
                icon={<Download className="w-3.5 h-3.5" />}
                onClick={handleExportPDF}
                loading={exporting}
                id="export-pdf-btn"
              >
                PDF
              </Button>
              <Button
                variant="ghost"
                size="sm"
                icon={<FileSpreadsheet className="w-3.5 h-3.5" />}
                onClick={handleExportExcel}
                id="export-excel-btn"
              >
                Excel
              </Button>

              {/* Layout Toggle View Button */}
              <div className="flex items-center gap-1 bg-white/5 p-0.5 rounded-lg border border-white/10">
                <button
                  onClick={() => setViewMode('inbox')}
                  className={`p-1.5 rounded-md text-xs font-semibold cursor-pointer ${
                    viewMode === 'inbox' ? 'bg-white text-black shadow-sm' : 'text-zinc-400 hover:text-white'
                  }`}
                  title="Inbox View"
                >
                  <Inbox className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`p-1.5 rounded-md text-xs font-semibold cursor-pointer ${
                    viewMode === 'table' ? 'bg-white text-black shadow-sm' : 'text-zinc-400 hover:text-white'
                  }`}
                  title="Flat Table View"
                >
                  <Table className="w-3.5 h-3.5" />
                </button>
              </div>

              <button
                onClick={handleLogout}
                className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer"
                aria-label="Logout"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>

        {/* ── Main ───────────────────────────────────────────────── */}
        <main className="flex-1 max-w-[1600px] mx-auto w-full px-4 sm:px-6 py-6 flex flex-col gap-5">
          {/* Summary bar */}
          <SummaryBar
            submitted={submittedCount}
            pending={pendingCount}
            connected={connected}
            onRefresh={refetch}
          />

          {/* Interactive Dual Modes Toggle */}
          <div className="flex-1 flex flex-col min-h-0">
            {viewMode === 'inbox' ? (
              <SubmissionsInbox
                submissions={submissions}
                loading={subLoading}
                onDeleteSubmission={handleDeleteSubmission}
                onToggleRead={toggleReadStatus}
                onToggleArchive={toggleArchiveStatus}
              />
            ) : (
              <div className="flex gap-5 min-h-[500px] relative">
                {/* Table */}
                <div className="flex-1 min-w-0 flex flex-col">
                  <SubmissionsTable
                    submissions={submissions}
                    loading={subLoading}
                    selectedId={selectedSub?.id ?? null}
                    onSelect={(sub) => setSelectedSub(sub)}
                    highlightId={highlightId}
                    onDeleteSubmission={handleDeleteSubmission}
                  />
                </div>

                {/* Desktop side detail panel */}
                <AnimatePresence>
                  {selectedSub && (
                    <motion.div
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: '35%' }}
                      exit={{ opacity: 0, width: 0 }}
                      className="hidden lg:flex shrink-0 flex-col"
                      style={{ minWidth: '300px', maxWidth: '480px' }}
                    >
                      <DetailPanel
                        submission={selectedSub}
                        onClose={() => setSelectedSub(null)}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Mobile full-screen overlay detail panel */}
                <AnimatePresence>
                  {selectedSub && (
                    <motion.div
                      initial={{ opacity: 0, y: '100%' }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: '100%' }}
                      transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                      className="lg:hidden fixed inset-0 z-50 bg-[#060b18] flex flex-col overflow-hidden"
                    >
                      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-[#060b18]/95 backdrop-blur shrink-0">
                        <div>
                          <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Student Report</p>
                          <p className="text-sm font-bold text-white">{selectedSub.student_name}</p>
                        </div>
                        <button
                          onClick={() => setSelectedSub(null)}
                          className="p-2 rounded-xl bg-white/5 text-zinc-400 hover:text-white cursor-pointer"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                      <div className="flex-1 overflow-y-auto p-4">
                        <DetailPanel
                          submission={selectedSub}
                          onClose={() => setSelectedSub(null)}
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </main>
      </div>
    </PageTransition>
  );
}
