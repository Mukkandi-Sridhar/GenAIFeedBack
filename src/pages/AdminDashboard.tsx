import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Download, FileSpreadsheet, LogOut, ChevronDown } from 'lucide-react';
import { useAdminSession } from '@/hooks/useAdminSession';
import { useSubmissions } from '@/hooks/useSubmissions';
import { useStudents } from '@/hooks/useStudents';
import { useEvents } from '@/hooks/useEvents';
import { useToast } from '@/components/ui/Toast';
import { SummaryBar } from '@/components/admin/SummaryBar';
import { SubmissionsTable } from '@/components/admin/SubmissionsTable';
import { DetailPanel } from '@/components/admin/DetailPanel';
import { StudentReport } from '@/components/admin/StudentReport';
import { AddFeedbackModal } from '@/components/admin/AddFeedbackModal';
import { EventManagerModal } from '@/components/admin/EventManagerModal';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { PageTransition } from '@/components/layout/PageTransition';
import { exportBulkPDF } from '@/lib/export-pdf';
import { exportBulkExcel } from '@/lib/export-excel';
import type { Submission } from '@/types';

export function AdminDashboard() {
  const navigate = useNavigate();
  const adminSlug = import.meta.env.VITE_ADMIN_SLUG || 'portal-dfa19-review';
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

  const { submissions, loading: subLoading, connected, newSubmissionAlert, refetch } = useSubmissions(activeEventId);
  const { students } = useStudents(activeEventId);
  const { addToast } = useToast();

  const [selectedSub, setSelectedSub] = useState<Submission | null>(null);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

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

  const handleSelectRow = (sub: Submission) => {
    setSelectedSub(sub);
    if (window.innerWidth < 1024) {
      setMobileSheetOpen(true);
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
      <div className="min-h-screen flex flex-col">
        {/* ── Header ─────────────────────────────────────────────── */}
        <header className="sticky top-0 z-20 border-b border-white/8 backdrop-blur-xl bg-[#060B18]/80 shrink-0">
          <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3 flex-wrap">
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
                      <option key={ev.id} value={ev.id} className="bg-navy-900 text-slate-200">
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

              <ThemeToggle />

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

          {/* Desktop two-pane / mobile single-column */}
          <div className="flex-1 flex gap-5 min-h-0" style={{ minHeight: 'calc(100vh - 260px)' }}>
            {/* Table — full width on mobile, 65% on desktop */}
            <div className="flex-1 min-w-0 flex flex-col">
              <SubmissionsTable
                submissions={submissions}
                loading={subLoading}
                selectedId={selectedSub?.id ?? null}
                onSelect={handleSelectRow}
                highlightId={highlightId}
              />
            </div>

            {/* Detail panel — desktop only */}
            <AnimatePresence>
              {(selectedSub || !subLoading) && (
                <motion.div
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: '35%' }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
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
          </div>
        </main>

        {/* Mobile bottom-sheet for student report */}
        <Modal
          open={mobileSheetOpen}
          onClose={() => setMobileSheetOpen(false)}
          title={selectedSub ? `${selectedSub.reg_no} — ${selectedSub.student_name}` : 'Report'}
          adaptiveSheet
          size="xl"
        >
          {selectedSub && <StudentReport submission={selectedSub} />}
        </Modal>
      </div>
    </PageTransition>
  );
}
