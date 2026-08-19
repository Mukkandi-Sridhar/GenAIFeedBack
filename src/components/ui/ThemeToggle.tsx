import { Moon } from 'lucide-react';

export function ThemeToggle() {
  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-semibold text-zinc-300">
      <Moon className="w-3.5 h-3.5 text-indigo-400" />
      <span>Dark Mode</span>
    </div>
  );
}
