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
      whileHover={isSubmitted ? {} : { scale: 1.04, boxShadow: '12px 18px 40px rgba(15,23,42,0.1)' }}
      whileTap={isSubmitted ? {} : { scale: 0.97 }}
      onClick={isSubmitted ? undefined : onClick}
      disabled={isSubmitted}
      aria-label={`Student ${student.reg_no} — ${isSubmitted ? 'already submitted' : 'click to submit feedback'}`}
      className={`
        relative w-full text-left rounded-xl p-3.5 transition-all duration-200 group
        ${isSubmitted
          ? 'glass-card opacity-55 cursor-not-allowed border-slate-200'
          : 'glass-card cursor-pointer pulse-ring border border-slate-200 hover:border-slate-400 bg-white/80'
        }
      `}
    >
      {/* Status dot */}
      <div className={`absolute top-3 right-3 w-2 h-2 rounded-full ${isSubmitted ? 'bg-emerald-500' : 'bg-slate-950 animate-pulse'}`} />

      {/* Reg No */}
      <p className={`text-xs font-mono font-bold tracking-wider mb-1 ${isSubmitted ? 'text-slate-400' : 'text-slate-950 group-hover:text-black'}`}>
        {student.reg_no}
      </p>

      {/* Name */}
      <p className={`text-xs leading-tight truncate font-semibold ${isSubmitted ? 'text-slate-400' : 'text-slate-700'}`}>
        {student.name}
      </p>

      {/* Bottom status */}
      <div className="mt-2.5 flex items-center gap-1">
        {isSubmitted ? (
          <>
            <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
            <span className="text-[9px] text-emerald-600 font-bold truncate">Done</span>
          </>
        ) : (
          <>
            <ChevronRight className="w-3 h-3 text-slate-500 group-hover:translate-x-0.5 transition-transform" />
            <span className="text-[9px] text-slate-600 group-hover:text-slate-950 font-bold">Tap to submit</span>
          </>
        )}
      </div>
    </motion.button>
  );
}
