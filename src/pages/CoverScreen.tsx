import { motion } from 'framer-motion';
import { Brain, Calendar, BookOpen, ArrowRight, Sparkles, Building, CheckCircle2 } from 'lucide-react';
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
    <div className="relative min-h-screen flex flex-col overflow-hidden bg-[#060b18] text-zinc-100">
      {/* ── Animated Dark Background ─────────────────────────────── */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute inset-0 bg-gradient-to-br from-[#060B18] via-[#0D1530] to-[#060B18]" />
        <div className="mesh-animate absolute -top-1/4 -left-1/4 w-[80vw] h-[80vw] rounded-full bg-indigo-900/20 blur-[120px]" />
        <div className="mesh-animate absolute -bottom-1/4 -right-1/4 w-[70vw] h-[70vw] rounded-full bg-teal-900/15 blur-[100px]" style={{ animationDelay: '-4s' }} />

        <svg className="absolute inset-0 w-full h-full opacity-[0.04]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="mono-grid" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M40 0L0 0 0 40" fill="none" stroke="#ffffff" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#mono-grid)" />
        </svg>
      </div>

      {/* ── Top Bar ──────────────────────────────────────────────── */}
      <header className="relative z-10 flex justify-between items-center px-6 py-5 max-w-7xl mx-auto w-full border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center">
            <Brain className="w-4 h-4 text-white" />
          </div>
          <span className="text-xs font-extrabold tracking-widest text-zinc-200 uppercase">
            CSE (AI & ML) Intake Portal
          </span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-semibold text-zinc-300">
          <span>Dark Obsidian</span>
        </div>
      </header>

      {/* ── Main Content ─────────────────────────────────────────── */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 sm:px-8 text-center py-12">
        <motion.div
          initial="initial"
          animate="animate"
          className="space-y-10 max-w-5xl w-full"
          variants={{ animate: { transition: { staggerChildren: 0.1 } } }}
        >
          {/* Header Badge */}
          <motion.div
            variants={{ initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 } }}
            className="inline-flex items-center gap-2 bg-white/5 border border-white/15 px-4 py-1.5 rounded-full mx-auto"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-xs font-bold text-zinc-200 tracking-widest uppercase">
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
            <p className="text-sm sm:text-base text-zinc-400 max-w-2xl mx-auto font-medium">
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
                whileHover={{ y: -6, boxShadow: '0 0 35px rgba(255,255,255,0.12)' }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleCardClick(ev.id)}
                className="glass-card p-6 rounded-2xl cursor-pointer flex flex-col justify-between group relative"
              >
                {/* Hairline gradient top highlight */}
                <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/50 to-transparent" />

                <div className="space-y-4 mb-6">
                  {/* Badges */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold tracking-wider text-zinc-200 px-3 py-1 rounded-full bg-white/10 border border-white/15">
                      <BookOpen className="w-3 h-3 text-indigo-400" />
                      {ev.subject}
                    </span>
                    <span className="text-[10px] font-extrabold text-emerald-400 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      Open
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="text-xl font-extrabold text-white group-hover:text-indigo-300 transition-colors leading-snug tracking-tight">
                    {ev.title}
                  </h3>

                  {/* Meta */}
                  <div className="space-y-1.5 pt-1 text-xs font-medium text-zinc-400">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                      <span>{ev.event_date}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Building className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                      <span>{ev.department} · {ev.semester}</span>
                    </div>
                  </div>
                </div>

                {/* Card CTA */}
                <div className="flex items-center justify-between pt-4 border-t border-white/10">
                  <span className="text-xs font-extrabold text-white group-hover:text-indigo-200 transition-colors tracking-wide">
                    Enter Portal
                  </span>
                  <div className="w-9 h-9 rounded-xl bg-white text-black font-extrabold flex items-center justify-center group-hover:bg-zinc-200 transition-all shadow-md">
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>

          <p className="text-xs text-zinc-500 font-medium">
            Showing {displayEvents.length} active module{displayEvents.length !== 1 ? 's' : ''}
          </p>
        </motion.div>
      </main>

      {/* ── Footer ───────────────────────────────────────────────── */}
      <footer className="relative z-10 text-center py-6 text-xs font-medium text-zinc-500 border-t border-white/10">
        Department of CSE (AI & ML) · IV Year I Semester · Feedback & Intake System
      </footer>
    </div>
  );
}
