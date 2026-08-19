import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  /** If true, renders as a bottom-sheet on mobile, centered modal on desktop */
  adaptiveSheet?: boolean;
  size?: 'md' | 'lg' | 'xl';
}

export function Modal({ open, onClose, title, children, adaptiveSheet = true, size = 'lg' }: ModalProps) {
  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (open) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const maxWMap = { md: 'max-w-md', lg: 'max-w-2xl', xl: 'max-w-4xl' };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="bottom-sheet-overlay"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Panel — bottom-sheet on mobile, centered on desktop */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className={`fixed z-[101] w-full glass-card border border-white/10 flex flex-col
              ${adaptiveSheet
                ? 'bottom-0 left-0 right-0 rounded-b-none sm:bottom-auto sm:left-1/2 sm:-translate-x-1/2 sm:top-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:w-auto sm:${maxWMap[size]}'
                : `left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-2xl ${maxWMap[size]}`
              }
              max-h-[90vh]`}
            initial={adaptiveSheet ? { y: '100%', opacity: 0 } : { scale: 0.95, opacity: 0 }}
            animate={adaptiveSheet ? { y: 0, opacity: 1 } : { scale: 1, opacity: 1 }}
            exit={adaptiveSheet ? { y: '100%', opacity: 0 } : { scale: 0.95, opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 380 }}
          >
            {/* Header */}
            {title && (
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 shrink-0">
                <h2 className="text-base font-semibold text-slate-100">{title}</h2>
                <button
                  onClick={onClose}
                  className="text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                  aria-label="Close modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}
            <div className="overflow-y-auto flex-1 p-6">{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
