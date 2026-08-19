import { motion } from 'framer-motion';
import { Brain, Calendar, BookOpen, ArrowRight, Sparkles, Building, CheckCircle2 } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import type { EventModule } from '@/types';

interface CoverScreenProps {
  events: EventModule[];
  onSelectEvent: (eventId: string) => void;
  onEnter: () => void;
}

export function CoverScreen({ events, onSelectEvent, onEnter }: CoverScreenProps) {
  const activeEvents = events.filter((e) => e.is_active);
  const displayEvents = activeEvents.length > 0 ? activeEvents : events;

  const handleCardClick = (eventId: string) => {
    onSelectEvent(eventId);
    onEnter();
  };

  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden bg-slate-50 text-slate-900">
      {/* ── Minimalist Reflective Light Background ───────────────── */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        {/* Ambient top light reflection */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[450px] bg-gradient-to-b from-white via-slate-100/60 to-transparent blur-[120px]" />

        {/* Clean geometric light grid lines */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.04]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="light-grid" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M40 0L0 0 0 40" fill="none" stroke="#0f172a" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#light-grid)" />
        </svg>
      </div>

      {/* ── Top Bar ──────────────────────────────────────────────── */}
      <header className="relative z-10 flex justify-between items-center px-6 py-5 max-w-7xl mx-auto w-full border-b border-slate-200/60">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white border border-slate-200/90 shadow-sm flex items-center justify-center">
            <Brain className="w-5 h-5 text-slate-900" />
          </div>
          <span className="text-xs font-extrabold tracking-widest text-slate-900 uppercase">
            CSE (AI & ML) Intake Portal
          </span>
        </div>
        <ThemeToggle />
      </header>

      {/* ── Main Content ─────────────────────────────────────────── */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 sm:px-8 text-center py-12">
        <motion.div
          initial="initial"
          animate="animate"
          className="space-y-10 max-w-5xl w-full"
          variants={{ animate: { transition: { staggerChildren: 0.1 } } }}
        >
          {/* Header Pill */}
          <motion.div
            variants={{ initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 } }}
            className="inline-flex items-center gap-2 glass-card px-4 py-1.5 rounded-full mx-auto shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5 text-slate-700" />
            <span className="text-xs font-bold text-slate-800 tracking-widest uppercase">
              CSE (AI & ML) · IV Year I Semester
            </span>
          </motion.div>

          {/* Hero Heading */}
          <motion.div
            variants={{ initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 } }}
            className="space-y-3"
          >
            <h1 className="text-fluid-2xl sm:text-fluid-3xl font-black leading-tight gradient-text tracking-tight">
              Conference & Session Feedback Portal
            </h1>
            <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto font-medium">
              Select an active technical session or conference below to access your student registration roster and submit feedback.
            </p>
          </motion.div>

          {/* Event Cards Grid */}
          <motion.div
            variants={{ initial: { opacity: 0, y: 24 }, animate: { opacity: 1, y: 0 } }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-left pt-2"
          >
            {displayEvents.map((ev) => (
              <motion.div
                key={ev.id}
                whileHover={{ y: -6 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleCardClick(ev.id)}
                className="glass-card p-6 rounded-2xl cursor-pointer flex flex-col justify-between group relative"
              >
                {/* Hairline reflective top highlight */}
                <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-white to-transparent" />

                <div className="space-y-4 mb-6">
                  {/* Badges */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold tracking-wider text-slate-800 px-3 py-1 rounded-full bg-slate-100 border border-slate-200">
                      <BookOpen className="w-3 h-3 text-slate-600" />
                      {ev.subject}
                    </span>
                    <span className="text-[10px] font-extrabold text-slate-900 px-2.5 py-1 rounded-full bg-slate-900 text-white flex items-center gap-1.5 shadow-sm">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      Open
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="text-xl font-extrabold text-slate-950 group-hover:text-slate-800 transition-colors leading-snug tracking-tight">
                    {ev.title}
                  </h3>

                  {/* Meta */}
                  <div className="space-y-1.5 pt-1 text-xs font-medium text-slate-600">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span>{ev.event_date}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Building className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span>{ev.department} · {ev.semester}</span>
                    </div>
                  </div>
                </div>

                {/* Card CTA */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-200/80">
                  <span className="text-xs font-extrabold text-slate-950 group-hover:text-slate-700 transition-colors tracking-wide">
                    Enter Portal
                  </span>
                  <div className="w-9 h-9 rounded-xl bg-slate-950 text-white font-bold flex items-center justify-center group-hover:bg-black transition-all shadow-md">
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>

          <p className="text-xs text-slate-500 font-medium">
            Showing {displayEvents.length} active module{displayEvents.length !== 1 ? 's' : ''}
          </p>
        </motion.div>
      </main>

      {/* ── Footer ───────────────────────────────────────────────── */}
      <footer className="relative z-10 text-center py-6 text-xs font-medium text-slate-500 border-t border-slate-200/60">
        Department of CSE (AI & ML) · IV Year I Semester · Feedback & Intake System
      </footer>
    </div>
  );
}
