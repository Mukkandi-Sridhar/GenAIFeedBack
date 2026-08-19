import React from 'react';
import { motion } from 'framer-motion';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
}

const variants = {
  primary: 'bg-slate-950 text-white font-bold shadow-[0_4px_14px_rgba(15,23,42,0.22)] hover:bg-black hover:shadow-[0_6px_20px_rgba(15,23,42,0.32)] disabled:opacity-40 disabled:cursor-not-allowed',
  ghost: 'bg-white/80 text-slate-800 hover:text-slate-950 hover:bg-white border border-slate-200 shadow-sm hover:border-slate-300',
  danger: 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100',
  outline: 'bg-transparent border border-slate-900 text-slate-950 hover:bg-slate-950 hover:text-white',
};

const sizes = {
  sm: 'px-3.5 py-1.5 text-xs gap-1.5 rounded-lg',
  md: 'px-5 py-2.5 text-sm gap-2 rounded-xl',
  lg: 'px-7 py-3.5 text-base gap-2.5 rounded-xl',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      whileHover={{ scale: disabled || loading ? 1 : 1.02 }}
      transition={{ duration: 0.15 }}
      className={`inline-flex items-center justify-center font-semibold transition-all duration-200 cursor-pointer select-none ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || loading}
      {...(props as any)}
    >
      {loading ? (
        <svg className="animate-spin w-4 h-4 mr-1" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
      ) : icon ? (
        <span className="shrink-0">{icon}</span>
      ) : null}
      {children}
    </motion.button>
  );
}
