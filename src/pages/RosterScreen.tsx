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
      <div className="min-h-screen flex flex-col">
        {/* ── Header ─────────────────────────────────────────────── */}
        <header className="sticky top-0 z-20 border-b border-white/8 backdrop-blur-xl bg-[#060B18]/80">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
            {onBack && (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={onBack}
                className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 transition-colors cursor-pointer mr-2"
                aria-label="Back to landing"
              >
                <LogOut className="w-4 h-4 rotate-180" />
              </motion.button>
            )}

            <div className="flex-1 min-w-0">
              <h1 className="text-sm font-bold text-slate-100 truncate">
                <span className="gradient-text">{eventInfo.title}</span>
              </h1>
              <p className="text-[11px] text-slate-500 hidden sm:block">
                {eventInfo.department} · {eventInfo.semester} · {eventInfo.subject} · {eventInfo.event_date}
              </p>
            </div>

            <ThemeToggle />
          </div>
        </header>

        {/* ── Main ───────────────────────────────────────────────── */}
        <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-8">
          <div className="mb-6">
            <h2 className="text-fluid-xl font-bold text-slate-100 mb-1">Student Registration Roster</h2>
            <p className="text-sm text-slate-400">
              Select your registration number to submit your feedback for <em className="text-indigo-300 not-italic">{eventInfo.title}</em>.
            </p>
          </div>

          <RosterGrid students={students} loading={loading} error={error} />
        </main>
      </div>
    </PageTransition>
  );
}
