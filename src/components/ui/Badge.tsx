import { CheckCircle2, Clock, Shield } from 'lucide-react';

type BadgeType = 'pending' | 'submitted' | 'admin_added';

const config: Record<BadgeType, { label: string; cls: string; icon: React.ReactNode }> = {
  pending: {
    label: 'PENDING',
    cls: 'bg-slate-100 text-slate-700 border border-slate-300',
    icon: <Clock className="w-3 h-3 text-slate-500" />,
  },
  submitted: {
    label: 'SUBMITTED',
    cls: 'bg-slate-950 text-white border border-slate-800 shadow-sm',
    icon: <CheckCircle2 className="w-3 h-3 text-emerald-400" />,
  },
  admin_added: {
    label: 'ADMIN',
    cls: 'bg-slate-800 text-white border border-slate-700',
    icon: <Shield className="w-3 h-3 text-slate-300" />,
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
