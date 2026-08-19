import { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Users, CheckCircle2, ShieldAlert, Volume2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { StudentCard } from './StudentCard';
import { RosterSkeleton } from '@/components/ui/Skeleton';
import { stagger } from '@/components/layout/PageTransition';
import { Modal } from '@/components/ui/Modal';
import type { Student } from '@/types';

interface RosterGridProps {
  students: Student[];
  loading: boolean;
  error: string | null;
}

const ANONYMITY_MESSAGE =
  'Please note: Your registration number is used only to track completion status and prevent duplicate submissions. ' +
  'Your name and registration number are never attached to your feedback responses in any report. ' +
  'Your feedback is completely anonymous. Proceeding now.';

export function RosterGrid({ students, loading, error }: RosterGridProps) {
  const [query, setQuery] = useState('');
  const [confirmStudent, setConfirmStudent] = useState<Student | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const [speechDone, setSpeechDone] = useState(false);
  const navigate = useNavigate();
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const pendingStudents = useMemo(() =>
    students.filter((s) => s.status === 'pending'), [students]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return pendingStudents;
    return pendingStudents.filter(
      (s) => s.reg_no.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)
    );
  }, [pendingStudents, query]);

  const submittedCount = students.filter((s) => s.status === 'submitted').length;
  const pendingCount = pendingStudents.length;

  const speakAndProceed = (student: Student) => {
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    setSpeaking(true);
    setSpeechDone(false);

    const utterance = new SpeechSynthesisUtterance(ANONYMITY_MESSAGE);
    utterance.lang = 'en-IN';
    utterance.rate = 0.92;
    utterance.pitch = 1.05;
    utterance.volume = 1;

    // Try to pick a clear voice — safe even if voices not yet loaded
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      const preferred = voices.find(
        (v) =>
          v.lang.startsWith('en') &&
          (v.name.toLowerCase().includes('google') ||
            v.name.toLowerCase().includes('female') ||
            v.name.toLowerCase().includes('zira') ||
            v.name.toLowerCase().includes('samantha'))
      ) || voices.find((v) => v.lang.startsWith('en'));
      if (preferred) utterance.voice = preferred;
    }

    utterance.onstart = () => setSpeaking(true);

    utterance.onend = () => {
      setSpeaking(false);
      setSpeechDone(true);
      setTimeout(() => {
        setConfirmStudent(null);
        navigate(`/feedback/${encodeURIComponent(student.reg_no)}`);
      }, 400);
    };

    utterance.onerror = (e) => {
      console.warn('[TTS error]', e);
      setSpeaking(false);
      setSpeechDone(true);
      setTimeout(() => {
        setConfirmStudent(null);
        navigate(`/feedback/${encodeURIComponent(student.reg_no)}`);
      }, 400);
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  const handleSelectStudent = (student: Student) => {
    setConfirmStudent(student);
    setSpeechDone(false);
    setSpeaking(false);

    // Use requestAnimationFrame so modal renders first, then speak.
    // Always call speak() directly — browser queues utterances and
    // resolves voices internally, even on first load.
    requestAnimationFrame(() => {
      speakAndProceed(student);
    });
  };

  // Cancel speech if modal is closed manually
  const handleClose = () => {
    window.speechSynthesis.cancel();
    setSpeaking(false);
    setSpeechDone(false);
    setConfirmStudent(null);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => { window.speechSynthesis.cancel(); };
  }, []);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 glass-card p-8 rounded-2xl">
        <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center">
          <X className="w-7 h-7 text-red-400" />
        </div>
        <p className="text-zinc-300 font-bold text-sm">Failed to load roster. Please refresh.</p>
        <p className="text-xs text-zinc-500 max-w-sm text-center">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats bar */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2 glass-card px-4 py-2 rounded-xl">
          <Users className="w-4 h-4 text-indigo-400" />
          <span className="text-sm font-extrabold text-white">{students.length} Total</span>
        </div>
        <div className="flex items-center gap-2 glass-card px-4 py-2 rounded-xl">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span className="text-sm font-extrabold text-emerald-400">{submittedCount} Submitted</span>
        </div>
        <div className="flex items-center gap-2 glass-card px-4 py-2 rounded-xl">
          <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
          <span className="text-sm font-extrabold text-zinc-200">{pendingCount} Pending</span>
        </div>
      </div>

      {/* Search */}
      {pendingStudents.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
          <input
            type="search"
            placeholder="Search by reg no or name…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-zinc-900/90 border border-zinc-800 rounded-xl pl-10 pr-10 py-3 text-sm font-medium text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-600 transition-all shadow-md"
            aria-label="Search pending students"
            id="roster-search"
          />
          {query && (
            <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors cursor-pointer" aria-label="Clear search">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* Grid */}
      {loading ? (
        <RosterSkeleton count={69} />
      ) : pendingStudents.length === 0 ? (
        <div className="glass-card p-12 text-center space-y-3 rounded-2xl">
          <div className="w-14 h-14 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-black text-white">All Submissions Complete! 🎉</h3>
          <p className="text-sm font-medium text-zinc-400 max-w-md mx-auto">
            Every registered student in this session has submitted their feedback.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-zinc-400 font-medium">
          <Search className="w-8 h-8 mx-auto mb-3 opacity-40" />
          <p>No pending students match "{query}"</p>
        </div>
      ) : (
        <motion.div
          variants={stagger.container}
          initial="initial"
          animate="animate"
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5"
        >
          {filtered.map((student) => (
            <StudentCard
              key={student.reg_no}
              student={student}
              onClick={() => handleSelectStudent(student)}
            />
          ))}
        </motion.div>
      )}

      {query && filtered.length > 0 && (
        <p className="text-xs text-zinc-500 font-semibold text-center">
          Showing {filtered.length} of {pendingStudents.length} pending students
        </p>
      )}

      {/* Anonymity Confirmation Modal — auto-proceeds after voice */}
      <Modal
        open={confirmStudent !== null}
        onClose={handleClose}
        title="🔒 Privacy Notice"
        size="md"
      >
        {confirmStudent && (
          <div className="space-y-5 text-center py-2">
            {/* Shield icon with pulse ring while speaking */}
            <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
              <AnimatePresence>
                {speaking && (
                  <>
                    <motion.div
                      key="ring1"
                      initial={{ scale: 0.8, opacity: 0.6 }}
                      animate={{ scale: 1.6, opacity: 0 }}
                      transition={{ duration: 1.4, repeat: Infinity, ease: 'easeOut' }}
                      className="absolute inset-0 rounded-full bg-indigo-500/30"
                    />
                    <motion.div
                      key="ring2"
                      initial={{ scale: 0.8, opacity: 0.4 }}
                      animate={{ scale: 2.2, opacity: 0 }}
                      transition={{ duration: 1.4, repeat: Infinity, ease: 'easeOut', delay: 0.4 }}
                      className="absolute inset-0 rounded-full bg-indigo-500/20"
                    />
                  </>
                )}
              </AnimatePresence>
              <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-colors ${speaking ? 'bg-indigo-500/20' : 'bg-indigo-500/10'}`}>
                {speaking ? (
                  <Volume2 className="w-7 h-7 text-indigo-400 animate-pulse" />
                ) : (
                  <ShieldAlert className="w-7 h-7 text-indigo-400" />
                )}
              </div>
            </div>

            {/* Student identity */}
            <div className="space-y-1">
              <p className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-widest">Selected</p>
              <h3 className="text-base font-black text-white leading-snug">
                {confirmStudent.name}
                <span className="font-mono text-indigo-300 font-bold block sm:inline sm:ml-2">
                  ({confirmStudent.reg_no})
                </span>
              </h3>
            </div>

            {/* Message text */}
            <div className="bg-white/[0.02] border border-white/5 p-4 rounded-xl text-left">
              <p className="text-xs text-zinc-300 font-semibold leading-relaxed">
                🔒 <strong className="text-white">Your privacy is protected.</strong> Your registration number is used{' '}
                <em className="text-indigo-300 not-italic font-bold">only</em> to track completion status and prevent duplicate submissions.
                Your name and registration number are{' '}
                <strong className="text-white">never</strong> attached to your feedback in any report.
                <br /><br />
                <span className="text-zinc-400">Please listen to the announcement and wait — you will be redirected automatically.</span>
              </p>
            </div>

            {/* Speaking status bar */}
            <div className="flex items-center justify-center gap-2">
              {speaking ? (
                <>
                  <div className="flex items-end gap-0.5 h-4">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <motion.div
                        key={i}
                        className="w-1 bg-indigo-400 rounded-full"
                        animate={{ height: ['6px', '16px', '6px'] }}
                        transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.1, ease: 'easeInOut' }}
                      />
                    ))}
                  </div>
                  <span className="text-xs font-bold text-indigo-400">Speaking… please listen</span>
                </>
              ) : speechDone ? (
                <span className="text-xs font-bold text-emerald-400">✓ Redirecting you now…</span>
              ) : (
                <span className="text-xs font-bold text-zinc-500">Preparing voice…</span>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
