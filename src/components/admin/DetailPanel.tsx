import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import type { Submission } from '@/types';
import { StudentReport } from './StudentReport';

interface DetailPanelProps {
  submission: Submission | null;
  onClose: () => void;
}

export function DetailPanel({ submission, onClose }: DetailPanelProps) {
  if (!submission) {
    return (
      <div className="hidden lg:flex flex-col items-center justify-center h-full text-slate-600 gap-3 glass-card rounded-2xl p-8">
        <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center">
          <svg className="w-8 h-8 opacity-30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" d="M9 12h6m-6 4h6M5 8h14M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z" />
          </svg>
        </div>
        <p className="text-sm text-slate-500">Click a row to view full report</p>
      </div>
    );
  }

  return (
    <motion.div
      key={submission.id}
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
      className="glass-card rounded-2xl flex flex-col h-full overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 shrink-0">
        <h3 className="text-sm font-semibold text-slate-200">Student Report</h3>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
          aria-label="Close detail panel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="overflow-y-auto flex-1 p-5">
        <StudentReport submission={submission} compact />
      </div>
    </motion.div>
  );
}
