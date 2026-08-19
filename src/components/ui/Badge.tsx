import { CheckCircle2, Clock, Shield } from 'lucide-react';

type BadgeType = 'pending' | 'submitted' | 'admin_added';

const config: Record<BadgeType, { label: string; cls: string; icon: React.ReactNode }> = {
  pending: {
    label: 'PENDING',
    cls: 'bg-zinc-800 text-zinc-300 border border-zinc-700',
    icon: <Clock className="w-3 h-3 text-zinc-400" />,
  },
  submitted: {
    label: 'SUBMITTED',
    cls: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
    icon: <CheckCircle2 className="w-3 h-3 text-emerald-400" />,
  },
  admin_added: {
    label: 'ADMIN',
    cls: 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/20',
    icon: <Shield className="w-3 h-3 text-indigo-400" />,
  },
};

export function Badge({ type }: { type: BadgeType }) {
  const { label, cls, icon } = config[type];
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-extrabold tracking-widest px-2.5 py-0.5 rounded-full ${cls}`}>
      {icon}
      {label}
    </span>
  );
}
