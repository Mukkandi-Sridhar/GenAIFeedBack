import { motion } from 'framer-motion';
import { LogOut } from 'lucide-react';
import { RosterGrid } from '@/components/roster/RosterGrid';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
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
      <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100">
        {/* ── Header ─────────────────────────────────────────────── */}
        <header className="sticky top-0 z-20 border-b border-slate-200 dark:border-white/10 backdrop-blur-xl bg-white/80 dark:bg-zinc-900/80 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
            {onBack && (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={onBack}
                className="flex items-center gap-1.5 text-sm font-semibold text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer mr-2"
                aria-label="Back to landing"
              >
                <LogOut className="w-4 h-4 rotate-180" />
                <span>Home</span>
              </motion.button>
            )}

            <div className="flex-1 min-w-0">
              <h1 className="text-sm font-black text-slate-950 dark:text-white truncate tracking-tight">
                {eventInfo.title}
              </h1>
              <p className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400 hidden sm:block">
                {eventInfo.department} · {eventInfo.semester} · {eventInfo.subject} · {eventInfo.event_date}
              </p>
            </div>

            <ThemeToggle />
          </div>
        </header>

        {/* ── Main ───────────────────────────────────────────────── */}
        <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-8">
          <div className="mb-6 space-y-1">
            <h2 className="text-fluid-xl font-extrabold text-slate-950 dark:text-white tracking-tight">
              Student Registration Roster
            </h2>
            <p className="text-sm font-medium text-slate-600 dark:text-zinc-400">
              Select your registration number to submit your feedback for <em className="text-slate-900 dark:text-zinc-200 not-italic font-bold">{eventInfo.title}</em>.
            </p>
          </div>

          <RosterGrid students={students} loading={loading} error={error} />
        </main>
      </div>
    </PageTransition>
  );
}
