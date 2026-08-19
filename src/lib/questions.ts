export interface QuestionConfig {
  id: string;
  label: string;
  type: 'rating' | 'single_select' | 'short_text' | 'textarea';
  scale?: number;
  options?: string[];
  required: boolean;
}

export const APPROVED_QUESTIONS: QuestionConfig[] = [
  {
    id: 'q1',
    label: 'How would you rate the overall teaching for this subject?',
    type: 'rating',
    scale: 5,
    required: true,
  },
  {
    id: 'q2',
    label: 'How clear are the explanations of concepts in general?',
    type: 'single_select',
    options: ['Very Clear', 'Clear', 'Average', 'Unclear', 'Very Unclear'],
    required: true,
  },
  {
    id: 'q3',
    label: 'Is the pace of teaching usually too fast, too slow, or just right?',
    type: 'single_select',
    options: ['Too Fast', 'Slightly Fast', 'Just Right', 'Slightly Slow', 'Too Slow'],
    required: true,
  },
  {
    id: 'q4',
    label: 'How well are your doubts addressed during classes?',
    type: 'rating',
    scale: 5,
    required: true,
  },
  {
    id: 'q5',
    label: 'How engaging and interactive is the teaching style?',
    type: 'rating',
    scale: 5,
    required: true,
  },
  {
    id: 'q6',
    label: 'Do the examples/explanations help you understand the concepts well?',
    type: 'single_select',
    options: ['Always', 'Mostly', 'Sometimes', 'Rarely', 'Never'],
    required: true,
  },
  {
    id: 'q7',
    label: 'How well organized and structured are the classes overall?',
    type: 'rating',
    scale: 5,
    required: true,
  },
  {
    id: 'q8',
    label: 'What do you like most about how the subject is taught?',
    type: 'short_text',
    required: false,
  },
  {
    id: 'q9',
    label: "Is there anything you'd suggest to improve the teaching?",
    type: 'textarea',
    required: false,
  },
  {
    id: 'q10',
    label: 'Any additional feedback for the faculty?',
    type: 'textarea',
    required: false,
  },
];

export function calculateAverageRating(answers: Record<string, any>): number {
  let sum = 0;
  let count = 0;

  APPROVED_QUESTIONS.forEach((q) => {
    if (q.type === 'rating') {
      const val = Number(answers[q.id]);
      if (!isNaN(val) && val > 0) {
        sum += val;
        count++;
      }
    }
  });

  return count > 0 ? Number((sum / count).toFixed(2)) : 0;
}
