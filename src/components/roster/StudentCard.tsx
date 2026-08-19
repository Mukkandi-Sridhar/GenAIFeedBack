import { motion } from 'framer-motion';
import { CheckCircle2, ChevronRight } from 'lucide-react';
import type { Student } from '@/types';
import { stagger } from '@/components/layout/PageTransition';

interface StudentCardProps {
  student: Student;
  onClick: () => void;
}

export function StudentCard({ student, onClick }: StudentCardProps) {
  const isSubmitted = student.status === 'submitted';

  return (
    <motion.button
      variants={stagger.item}
      whileHover={isSubmitted ? {} : { scale: 1.03 }}
      whileTap={isSubmitted ? {} : { scale: 0.97 }}
      onClick={isSubmitted ? undefined : onClick}
      disabled={isSubmitted}
      aria-label={`Student ${student.reg_no} — ${isSubmitted ? 'already submitted' : 'click to submit feedback'}`}
      className={`
        relative w-full text-left rounded-xl p-3.5 transition-all duration-200 group glass-card
        ${isSubmitted ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      {/* Status dot */}
      <div className={`absolute top-3 right-3 w-2 h-2 rounded-full ${isSubmitted ? 'bg-emerald-500' : 'bg-slate-900 dark:bg-white animate-pulse'}`} />

      {/* Reg No */}
      <p className="text-xs font-mono font-bold tracking-wider mb-1 text-slate-900 dark:text-zinc-100 group-hover:text-black dark:group-hover:text-white">
        {student.reg_no}
      </p>

      {/* Name */}
      <p className="text-xs leading-tight truncate font-semibold text-slate-700 dark:text-zinc-300">
        {student.name}
      </p>

      {/* Bottom status */}
      <div className="mt-2.5 flex items-center gap-1">
        {isSubmitted ? (
          <>
            <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold truncate">Done</span>
          </>
        ) : (
          <>
            <ChevronRight className="w-3 h-3 text-slate-400 dark:text-zinc-500 group-hover:translate-x-0.5 transition-transform" />
            <span className="text-[9px] text-slate-500 dark:text-zinc-400 group-hover:text-slate-900 dark:group-hover:text-zinc-200 font-bold">Tap to submit</span>
          </>
        )}
      </div>
    </motion.button>
  );
}
