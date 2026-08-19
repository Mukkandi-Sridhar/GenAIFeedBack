import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, ShieldAlert, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAdminSession } from '@/hooks/useAdminSession';
import { Button } from '@/components/ui/Button';

const MAX_ATTEMPTS = 5;
const LOCKOUT_SECS = 60;

export function AdminGate() {
  const [code, setCode] = useState('');
  const [showCode, setShowCode] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const adminSlug = import.meta.env.VITE_ADMIN_SLUG || 'admin';
  const { isAuthed, login } = useAdminSession();

  // Redirect if already authed
  useEffect(() => {
    if (isAuthed) navigate(`/${adminSlug}/dashboard`, { replace: true });
  }, [isAuthed, navigate, adminSlug]);

  // Countdown timer
  useEffect(() => {
    if (!lockedUntil) return;
    const tick = () => {
      const diff = Math.max(0, Math.ceil((lockedUntil.getTime() - Date.now()) / 1000));
      setCountdown(diff);
      if (diff === 0) setLockedUntil(null);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [lockedUntil]);

  const isLocked = !!lockedUntil && countdown > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked || checking || !code.trim()) return;
    setChecking(true);
    setError(null);

    try {
      // Call Supabase RPC to verify the admin code
      const { data, error: rpcErr } = await supabase.rpc('verify_admin_code', { p_code: code });

      if (rpcErr) throw new Error(rpcErr.message);

      if (data?.locked_until) {
        const until = new Date(data.locked_until);
        setLockedUntil(until);
        setError(`Too many attempts. Locked for ${LOCKOUT_SECS}s.`);
        setCode('');
        return;
      }

      if (!data?.ok) {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        const remaining = MAX_ATTEMPTS - newAttempts;
        setError(
          remaining > 0
            ? `Incorrect code. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`
            : 'Account locked. Please wait.'
        );
        setCode('');
        inputRef.current?.focus();
        return;
      }

      // Success
      login();
      navigate(`/${adminSlug}/dashboard`, { replace: true });
    } catch (err: any) {
      setError(err.message || 'Verification failed. Check Supabase connection.');
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      {/* BG */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#060B18] via-[#0D1530] to-[#060B18]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60vw] h-[60vw] rounded-full bg-indigo-900/10 blur-[100px]" />

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-sm glass-card rounded-2xl p-8 space-y-6"
      >
        {/* Icon */}
        <div className="flex flex-col items-center gap-3">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${isLocked ? 'bg-red-500/15' : 'bg-indigo-500/15'}`}>
            {isLocked ? (
              <ShieldAlert className="w-7 h-7 text-red-400" />
            ) : (
              <Lock className="w-7 h-7 text-indigo-400" />
            )}
          </div>
          <div className="text-center">
            <h1 className="text-lg font-bold text-slate-100">Admin Access</h1>
            <p className="text-xs text-slate-500 mt-1">Form Modules Review Portal</p>
          </div>
        </div>

        {/* Lockout */}
        {isLocked && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3"
          >
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <p className="text-sm text-red-300">
              Locked — retry in <span className="font-bold tabular-nums">{countdown}s</span>
            </p>
          </motion.div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="admin-code" className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Access Code
            </label>
            <div className="relative">
              <input
                ref={inputRef}
                id="admin-code"
                type={showCode ? 'text' : 'password'}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Enter access code"
                disabled={isLocked || checking}
                maxLength={32}
                autoComplete="off"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 pr-10 py-3 text-sm font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-all disabled:opacity-40"
                aria-describedby="admin-code-error"
              />
              <button
                type="button"
                onClick={() => setShowCode((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                tabIndex={-1}
                aria-label={showCode ? 'Hide code' : 'Show code'}
              >
                {showCode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <p id="admin-code-error" className="text-xs text-red-400 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              {error}
            </p>
          )}

          <Button
            type="submit"
            size="md"
            loading={checking}
            disabled={isLocked || !code.trim() || checking}
            className="w-full"
            id="admin-login-btn"
          >
            {checking ? 'Verifying…' : 'Access Dashboard'}
          </Button>
        </form>

        <p className="text-center text-[11px] text-slate-600">
          This page is not publicly linked. Authorised personnel only.
        </p>
      </motion.div>
    </div>
  );
}
