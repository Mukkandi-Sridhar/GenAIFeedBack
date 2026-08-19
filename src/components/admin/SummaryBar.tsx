import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { Users, CheckCircle2, Clock, Wifi, WifiOff, RefreshCw } from 'lucide-react';

interface SummaryBarProps {
  submitted: number;
  pending: number;
  connected: boolean;
  onRefresh: () => void;
}

const COLORS = ['#09090b', 'rgba(15,23,42,0.12)'];

export function SummaryBar({ submitted, pending, connected, onRefresh }: SummaryBarProps) {
  const total = submitted + pending || 69;
  const pct = Math.round((submitted / total) * 100);

  const data = [
    { name: 'Submitted', value: submitted },
    { name: 'Pending', value: pending },
  ];

  return (
    <div className="glass-card p-4 rounded-2xl border border-slate-200 bg-white/80">
      <div className="flex flex-wrap items-center gap-4">
        {/* Mini donut */}
        <div className="shrink-0 w-20 h-20">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={26}
                outerRadius={36}
                startAngle={90}
                endAngle={-270}
                dataKey="value"
                strokeWidth={0}
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={COLORS[i]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: '#ffffff', border: '1px solid rgba(15,23,42,0.12)', borderRadius: '8px', fontSize: '12px' }}
                labelStyle={{ color: '#64748b' }}
                itemStyle={{ color: '#09090b', fontWeight: 'bold' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Stats */}
        <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 gap-3">
          <StatPill icon={<Users className="w-4 h-4 text-slate-700" />} label="Total" value={total} color="text-slate-950" />
          <StatPill icon={<CheckCircle2 className="w-4 h-4 text-emerald-600" />} label="Submitted" value={submitted} color="text-slate-900" />
          <StatPill icon={<Clock className="w-4 h-4 text-slate-400" />} label="Pending" value={pending} color="text-slate-600" />
        </div>

        {/* Progress */}
        <div className="w-full sm:w-auto sm:min-w-[140px]">
          <div className="flex justify-between text-xs text-slate-600 mb-1.5 font-bold">
            <span>Completion</span>
            <span className="text-slate-950 font-extrabold">{pct}%</span>
          </div>
          <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-slate-950 rounded-full transition-all duration-700 shadow-sm"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* Connection status + refresh */}
        <div className="flex items-center gap-2 ml-auto">
          <div className={`flex items-center gap-1.5 text-xs font-extrabold px-2.5 py-1 rounded-full ${connected ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-600 border border-red-200'}`}>
            {connected ? <Wifi className="w-3 h-3 text-emerald-600" /> : <WifiOff className="w-3 h-3 text-red-500" />}
            {connected ? 'Live' : 'Offline'}
          </div>
          <button
            onClick={onRefresh}
            title="Refresh data"
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-950 hover:bg-slate-100 transition-all cursor-pointer"
            aria-label="Refresh submissions"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function StatPill({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="shrink-0">{icon}</span>
      <div>
        <p className={`text-lg font-black leading-none ${color}`}>{value}</p>
        <p className="text-[10px] text-slate-500 font-semibold mt-0.5">{label}</p>
      </div>
    </div>
  );
}
