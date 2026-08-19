import { motion } from 'framer-motion';
import { LogOut } from 'lucide-react';
import { RosterGrid } from '@/components/roster/RosterGrid';
import { useStudents } from '@/hooks/useStudents';
import { PageTransition } from '@/components/layout/PageTransition';
import type { EventModule } from '@/types';

interface RosterScreenProps {
  eventInfo: EventModule;
  onBack?: () => void;
}

export function RosterScreen({ eventInfo, onBack }: RosterScreenProps) {
  const { students, loading, error } = useStudents(eventInfo.id);

  return (
    <PageTransition>
      <div className="min-h-screen flex flex-col bg-[#060b18] text-zinc-100">
        {/* ── Header ─────────────────────────────────────────────── */}
        <header className="sticky top-0 z-20 border-b border-white/10 backdrop-blur-xl bg-[#060b18]/90">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {onBack && (
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={onBack}
                  className="flex items-center gap-1.5 text-xs font-bold text-zinc-400 hover:text-white transition-colors cursor-pointer mr-2 px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10"
                  aria-label="Back to landing"
                >
                  <LogOut className="w-3.5 h-3.5 rotate-180" />
                  <span>Home</span>
                </motion.button>
              )}

              <div className="flex-1 min-w-0">
                <h1 className="text-sm font-black text-white truncate tracking-tight gradient-text">
                  {eventInfo.title}
                </h1>
                <p className="text-[11px] font-semibold text-zinc-400 hidden sm:block">
                  {eventInfo.department} · {eventInfo.semester} · {eventInfo.subject} · {eventInfo.event_date}
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* ── Main ───────────────────────────────────────────────── */}
        <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-8">
          <div className="mb-6 space-y-1">
            <h2 className="text-fluid-xl font-extrabold text-white tracking-tight">
              Student Registration Roster
            </h2>
            <p className="text-sm font-medium text-zinc-400">
              Select your registration number to submit your feedback for <em className="text-white not-italic font-bold">{eventInfo.title}</em>.
            </p>
          </div>

          <RosterGrid students={students} loading={loading} error={error} />
        </main>
      </div>
    </PageTransition>
  );
}
