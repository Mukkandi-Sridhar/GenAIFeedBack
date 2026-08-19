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
      const { data, error: err } = await supabase
        .from('students')
        .select('*')
        .eq('reg_no', decodeURIComponent(regNo))
        .single();

      if (err || !data) {
        setError('Student not found in the roster.');
      } else if (data.status === 'submitted') {
        navigate('/roster', { replace: true });
        return;
      } else {
        setStudent(data);
      }
      setLoading(false);
    })();
  }, [regNo, navigate]);

  return (
    <PageTransition>
      <div className="min-h-screen flex flex-col">
        {/* Header */}
        <header className="sticky top-0 z-20 border-b border-white/8 backdrop-blur-xl bg-[#060B18]/80">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
            <div className="flex-1">
              <p className="text-xs font-semibold text-slate-300">
                Conference Feedback & Intake Portal
              </p>
            </div>
            <ThemeToggle />
          </div>
        </header>

        <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 py-8">
          {loading ? (
            <div className="flex items-center justify-center py-32 gap-3 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="text-sm">Loading student data…</span>
            </div>
          ) : error ? (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card rounded-2xl p-10 text-center flex flex-col items-center gap-4"
            >
              <AlertCircle className="w-12 h-12 text-red-400" />
              <p className="text-slate-300 font-medium">{error}</p>
              <button
                onClick={() => navigate('/roster')}
                className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer underline underline-offset-2"
              >
                Return to Roster
              </button>
            </motion.div>
          ) : student ? (
            <>
              <div className="mb-8">
                <h1 className="text-fluid-xl font-bold text-slate-100 mb-1">Submit Your Feedback</h1>
                <p className="text-sm text-slate-400">
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
