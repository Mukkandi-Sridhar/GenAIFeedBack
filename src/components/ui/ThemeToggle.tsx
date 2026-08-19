import { Sun, Moon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(false); // Default to Light theme

  useEffect(() => {
    document.body.classList.toggle('dark', isDark);
    document.body.classList.toggle('light', !isDark);
  }, [isDark]);

  return (
    <motion.button
      whileTap={{ scale: 0.92 }}
      onClick={() => setIsDark((d) => !d)}
      className="p-2 rounded-xl bg-white/80 border border-slate-200 shadow-sm text-slate-700 hover:text-black hover:bg-white transition-all cursor-pointer"
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Light mode' : 'Dark mode'}
    >
      {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4 text-slate-800" />}
    </motion.button>
  );
}
