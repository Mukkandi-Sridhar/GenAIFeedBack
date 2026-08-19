import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { FeedbackForm } from '@/components/feedback/FeedbackForm';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { PageTransition } from '@/components/layout/PageTransition';
import type { Student } from '@/types';

export function FeedbackScreen() {
  const { regNo } = useParams<{ regNo: string }>();
  const navigate = useNavigate();
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!regNo) { navigate('/roster', { replace: true }); return; }

    (async () => {
      const decodedReg = decodeURIComponent(regNo);
      const { data, error: err } = await supabase
        .from('students')
        .select('*')
        .eq('reg_no', decodedReg)
        .limit(1);

      if (err || !data || data.length === 0) {
        setError('Student not found in the roster.');
      } else if (data[0].status === 'submitted') {
        navigate('/roster', { replace: true });
        return;
      } else {
        setStudent(data[0]);
      }
      setLoading(false);
    })();
  }, [regNo, navigate]);

  return (
    <PageTransition>
      <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100">
        {/* Header */}
        <header className="sticky top-0 z-20 border-b border-slate-200 dark:border-white/10 backdrop-blur-xl bg-white/80 dark:bg-zinc-900/80 shadow-sm">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black text-slate-950 dark:text-white uppercase tracking-wider">
                Conference Feedback & Intake Portal
              </p>
            </div>
            <ThemeToggle />
          </div>
        </header>

        <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 py-8">
          {loading ? (
            <div className="flex items-center justify-center py-32 gap-3 text-slate-600 dark:text-zinc-400">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="text-sm font-semibold">Loading student data…</span>
            </div>
          ) : error ? (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card rounded-2xl p-10 text-center flex flex-col items-center gap-4 border border-slate-200"
            >
              <AlertCircle className="w-12 h-12 text-red-600" />
              <p className="text-slate-950 font-bold">{error}</p>
              <button
                onClick={() => navigate('/roster')}
                className="text-sm font-bold text-slate-950 hover:underline cursor-pointer"
              >
                Return to Roster
              </button>
            </motion.div>
          ) : student ? (
            <>
              <div className="mb-8 space-y-1">
                <h1 className="text-fluid-xl font-black text-slate-950 dark:text-white tracking-tight">Submit Your Feedback</h1>
                <p className="text-sm font-medium text-slate-600 dark:text-zinc-400">
                  Share your experience and key takeaways from the session.
                </p>
              </div>
              <FeedbackForm student={student} />
            </>
          ) : null}
        </main>
      </div>
    </PageTransition>
  );
}
