import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, ArrowRight, ArrowLeft, Send, CheckCircle2, RefreshCw, UploadCloud, File, AlertCircle } from 'lucide-react';
import { APPROVED_QUESTIONS, calculateAverageRating } from '@/lib/questions';
import { Button } from '@/components/ui/Button';
import { FileUpload } from './FileUpload';
import { useToast } from '@/components/ui/Toast';
import { supabase } from '@/lib/supabase';
import { sanitizeName, sanitizeFeedback } from '@/lib/sanitize';
import type { Student } from '@/types';

interface FeedbackWizardProps {
  student: Student;
  onSuccess: () => void;
}

export function FeedbackWizard({ student, onSuccess }: FeedbackWizardProps) {
  const { addToast } = useToast();
  const [currentStep, setCurrentStep] = useState(0); // 0 to 9 are questions, 10 is review screen
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [slideDirection, setSlideDirection] = useState<'forward' | 'backward'>('forward');

  const totalSteps = APPROVED_QUESTIONS.length;

  const handleRatingSelect = (questionId: string, rating: number) => {
    setAnswers((prev) => ({ ...prev, [questionId]: rating }));
    // Auto advance
    setTimeout(() => {
      if (currentStep < totalSteps - 1) {
        setSlideDirection('forward');
        setCurrentStep((s) => s + 1);
      } else {
        setSlideDirection('forward');
        setCurrentStep(totalSteps); // Jump to review screen
      }
    }, 300);
  };

  const handleSelectOption = (questionId: string, option: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: option }));
    // Auto advance
    setTimeout(() => {
      if (currentStep < totalSteps - 1) {
        setSlideDirection('forward');
        setCurrentStep((s) => s + 1);
      } else {
        setSlideDirection('forward');
        setCurrentStep(totalSteps); // Jump to review screen
      }
    }, 300);
  };

  const handleTextChange = (questionId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleNext = () => {
    const currentQuestion = APPROVED_QUESTIONS[currentStep];
    if (currentQuestion.required && !answers[currentQuestion.id]) {
      addToast('warning', 'Please answer this question before continuing.');
      return;
    }
    setSlideDirection('forward');
    setCurrentStep((s) => s + 1);
  };

  const handleBack = () => {
    setSlideDirection('backward');
    setCurrentStep((s) => s - 1);
  };

  const handleJumpToStep = (stepIndex: number) => {
    setSlideDirection(stepIndex > currentStep ? 'forward' : 'backward');
    setCurrentStep(stepIndex);
  };

  const handleSubmit = async () => {
    // Validate required questions
    for (const q of APPROVED_QUESTIONS) {
      if (q.required && !answers[q.id]) {
        addToast('error', `Please complete the required question: "${q.label}"`);
        setCurrentStep(APPROVED_QUESTIONS.indexOf(q));
        return;
      }
    }

    setSubmitting(true);
    setFileError(null);

    try {
      const fileUrls: string[] = [];
      for (const file of files) {
        const ext = file.name.split('.').pop();
        const path = `${student.reg_no}/${Date.now()}_${Math.random().toString(36).slice(2, 7)}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from('submissions')
          .upload(path, file, { cacheControl: '3600', upsert: false });

        if (uploadErr) {
          console.warn('[Storage upload warning]:', uploadErr.message);
          fileUrls.push(`attachment://${file.name}`);
        } else {
          const { data: publicUrlData } = supabase.storage
            .from('submissions')
            .getPublicUrl(path);
          fileUrls.push(publicUrlData.publicUrl);
        }
      }

      // Compile answers
      const sanitizedAnswers: Record<string, any> = {};
      APPROVED_QUESTIONS.forEach((q) => {
        const rawValue = answers[q.id] || '';
        sanitizedAnswers[q.id] = q.type === 'rating' ? Number(rawValue) : sanitizeFeedback(String(rawValue));
      });

      const avgRating = calculateAverageRating(sanitizedAnswers);

      // Create fallback feedback summary string for backward compatibility
      const legacySummary = APPROVED_QUESTIONS.map((q) => `${q.label} -> ${answers[q.id] ?? 'N/A'}`).join(' | ');

      const { error: insertErr } = await supabase.from('submissions').insert({
        event_id: student.event_id,
        reg_no: student.reg_no,
        student_name: student.name,
        feedback_text: legacySummary,
        answers: sanitizedAnswers,
        avg_rating: avgRating,
        is_read: false,
        is_archived: false,
        file_urls: fileUrls,
        source: 'student',
      });

      if (insertErr) {
        // Fallback retry for unmigrated database schemas
        console.warn('[Submissions Schema warning]: answers/avg_rating columns missing, falling back to legacy insertion');
        const { error: retryErr } = await supabase.from('submissions').insert({
          event_id: student.event_id,
          reg_no: student.reg_no,
          student_name: student.name,
          feedback_text: legacySummary,
          file_urls: fileUrls,
          source: 'student',
        });
        if (retryErr) throw retryErr;
      }

      // Reset student status to submitted
      const { error: updateErr } = await supabase
        .from('students')
        .update({ status: 'submitted', submitted_at: new Date().toISOString() })
        .eq('reg_no', student.reg_no);

      if (updateErr) console.warn('[useStudents status reset warning]:', updateErr.message);

      setSubmittedSuccess(true);
      addToast('success', 'Feedback submitted successfully!');
      setTimeout(() => {
        onSuccess();
      }, 1500);
    } catch (err: any) {
      addToast('error', err.message || 'Failed to submit feedback.');
    } finally {
      setSubmitting(false);
    }
  };

  // SUCCESS ANIMATION SCREEN
  if (submittedSuccess) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-6">
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: [0, 1.2, 1], opacity: 1 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="w-20 h-20 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center"
        >
          <CheckCircle2 className="w-12 h-12" />
        </motion.div>
        <motion.div
          initial={{ y: 15, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="space-y-2"
        >
          <h2 className="text-2xl font-black text-white">Thank You!</h2>
          <p className="text-sm font-semibold text-zinc-400 max-w-sm">
            Your structured feedback has been recorded and submitted.
          </p>
        </motion.div>
      </div>
    );
  }

  // WIZARD QUESTIONS FLOW
  const isQuestionStep = currentStep < totalSteps;
  const q = isQuestionStep ? APPROVED_QUESTIONS[currentStep] : null;
  const isRequiredField = q?.required;
  const currentAnswer = q ? answers[q.id] : undefined;

  const slideVariants = {
    enter: (dir: string) => ({
      x: dir === 'forward' ? '100%' : '-100%',
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (dir: string) => ({
      x: dir === 'forward' ? '-100%' : '100%',
      opacity: 0,
    }),
  };

  return (
    <div className="space-y-6">
      {/* Step Progress Header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-extrabold text-zinc-400 tracking-wider">
          <span>{isQuestionStep ? `QUESTION ${currentStep + 1} OF ${totalSteps}` : 'REVIEW SUMMARY'}</span>
          <span>{isQuestionStep ? `${Math.round(((currentStep) / totalSteps) * 100)}%` : '100%'}</span>
        </div>
        <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-500 transition-all duration-300"
            style={{ width: isQuestionStep ? `${((currentStep) / totalSteps) * 100}%` : '100%' }}
          />
        </div>
      </div>

      {isQuestionStep && q ? (
        <div className="glass-card overflow-hidden relative min-h-[360px] flex flex-col justify-between p-6 sm:p-8">
          <AnimatePresence initial={false} custom={slideDirection} mode="wait">
            <motion.div
              key={currentStep}
              custom={slideDirection}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="flex-1 flex flex-col justify-center space-y-6"
            >
              {/* Question Label */}
              <div className="space-y-1">
                <span className="text-xs font-extrabold text-indigo-400 uppercase tracking-widest">
                  {isRequiredField ? 'Required Field' : 'Optional Field'}
                </span>
                <h3 className="text-lg sm:text-xl font-bold leading-snug text-white">
                  {q.label}
                </h3>
              </div>

              {/* Input Type Renderers */}
              <div className="pt-2">
                {/* 1. Rating (Stars Selector) */}
                {q.type === 'rating' && (
                  <div className="flex items-center gap-3 justify-center sm:justify-start">
                    {Array.from({ length: q.scale || 5 }).map((_, i) => {
                      const starVal = i + 1;
                      const isSelected = currentAnswer >= starVal;
                      return (
                        <motion.button
                          key={i}
                          type="button"
                          whileHover={{ scale: 1.15 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleRatingSelect(q.id, starVal)}
                          className={`p-2.5 rounded-xl transition-all cursor-pointer ${
                            isSelected
                              ? 'text-yellow-400 bg-yellow-400/10 border border-yellow-500/20 shadow-[0_0_15px_rgba(234,179,8,0.2)]'
                              : 'text-zinc-600 border border-transparent hover:text-zinc-400'
                          }`}
                        >
                          <Star className="w-8 h-8 fill-current" />
                        </motion.button>
                      );
                    })}
                  </div>
                )}

                {/* 2. Single Select (Horizontal Chips/Stacked Mobile) */}
                {q.type === 'single_select' && q.options && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                    {q.options.map((opt, i) => {
                      const isSelected = currentAnswer === opt;
                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={() => handleSelectOption(q.id, opt)}
                          className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                            isSelected
                              ? 'bg-white text-black border-white shadow-md'
                              : 'bg-white/5 text-zinc-300 border-white/10 hover:bg-white/10 hover:border-white/20'
                          }`}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* 3. Short Text */}
                {q.type === 'short_text' && (
                  <input
                    type="text"
                    value={currentAnswer || ''}
                    onChange={(e) => handleTextChange(q.id, e.target.value)}
                    placeholder="Type your response here..."
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm font-semibold text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 transition-all"
                  />
                )}

                {/* 4. Textarea */}
                {q.type === 'textarea' && (
                  <textarea
                    rows={4}
                    value={currentAnswer || ''}
                    onChange={(e) => handleTextChange(q.id, e.target.value)}
                    placeholder="Type your suggestions or details..."
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm font-semibold text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 transition-all resize-none"
                  />
                )}
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Navigation Controls */}
          <div className="flex items-center justify-between border-t border-white/5 pt-4 mt-6">
            <button
              type="button"
              disabled={currentStep === 0}
              onClick={handleBack}
              className="flex items-center gap-1.5 text-xs font-bold text-zinc-400 hover:text-white transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>

            {/* Manual Advance indicator for text fields */}
            {(q.type === 'short_text' || q.type === 'textarea') && (
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleNext}
                disabled={isRequiredField && !currentAnswer}
                icon={<ArrowRight className="w-3.5 h-3.5" />}
              >
                Next
              </Button>
            )}
          </div>
        </div>
      ) : (
        /* REVIEW SUMMARY SCREEN */
        <div className="space-y-6">
          <div className="glass-card p-6 sm:p-8 space-y-6">
            <h3 className="text-lg font-black text-white tracking-tight border-b border-white/5 pb-3">
              Review and Edit Your Responses
            </h3>

            {/* Questions list overview */}
            <div className="space-y-4">
              {APPROVED_QUESTIONS.map((question, idx) => {
                const answer = answers[question.id];
                const isAnswered = answer !== undefined && answer !== '';

                return (
                  <div
                    key={question.id}
                    onClick={() => handleJumpToStep(idx)}
                    className="p-3.5 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.06] hover:border-white/10 transition-all cursor-pointer group flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <p className="text-[10px] font-extrabold text-indigo-400 tracking-wider">
                        QUESTION {idx + 1}
                      </p>
                      <p className="text-xs font-bold text-zinc-200 group-hover:text-white truncate">
                        {question.label}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {isAnswered ? (
                        <div className="px-3 py-1 rounded-lg bg-zinc-800 text-xs font-extrabold text-white">
                          {question.type === 'rating' ? `⭐ ${answer}/5` : answer}
                        </div>
                      ) : (
                        <span className="text-[10px] font-extrabold text-zinc-500">Not Answered</span>
                      )}
                      <ArrowRight className="w-3.5 h-3.5 text-zinc-600 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Attachments Section */}
            <div className="space-y-2 border-t border-white/5 pt-4">
              <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider block">
                Intake Attachments (Optional)
              </label>
              <FileUpload files={files} onChange={setFiles} error={fileError} />
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <Button
                type="button"
                variant="primary"
                size="lg"
                loading={submitting}
                onClick={handleSubmit}
                icon={<Send className="w-4 h-4" />}
                className="w-full py-3.5"
              >
                Submit Feedback
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
