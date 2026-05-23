/**
 * Exam configuration based on latest THPTQG 2025 structure.
 * Source: Bộ GD&ĐT - Cấu trúc đề thi từ 2025.
 *
 * Structure per subject:
 * - Part I:   Multiple Choice (4 options, pick 1)
 * - Part II:  True/False (4 statements per question, pick T/F each)
 * - Part III: Short Answer (fill in number/text)
 */

export const EXAM_DATE = '2026-06-11T07:00:00+07:00';

export const SUBJECTS = {
  math: {
    id: 'math',
    name: 'Toán',
    icon: '📐',
    color: 'var(--color-math)',
    colorLight: 'var(--color-math-light)',
    colorBg: 'var(--color-math-bg)',
    gradient: 'var(--gradient-math)',
    shadowGlow: 'var(--shadow-glow-math)',
    duration: 90, // minutes
    totalQuestions: 22,
    parts: [
      {
        id: 'mc',
        name: 'Trắc nghiệm',
        type: 'multiple_choice',
        count: 12,
        pointsPerCorrect: 0.25,
        description: 'Chọn 1 đáp án đúng trong 4 phương án',
      },
      {
        id: 'tf',
        name: 'Đúng/Sai',
        type: 'true_false',
        count: 4,
        statementsPerQuestion: 4,
        scoring: {
          1: 0.1,
          2: 0.25,
          3: 0.5,
          4: 1.0,
        },
        description: 'Mỗi câu 4 mệnh đề, chọn Đúng/Sai cho từng mệnh đề',
      },
      {
        id: 'sa',
        name: 'Trả lời ngắn',
        type: 'short_answer',
        count: 6,
        pointsPerCorrect: 0.5,
        description: 'Điền đáp án bằng số vào ô trả lời',
      },
    ],
  },
  physics: {
    id: 'physics',
    name: 'Vật lý',
    icon: '⚛️',
    color: 'var(--color-physics)',
    colorLight: 'var(--color-physics-light)',
    colorBg: 'var(--color-physics-bg)',
    gradient: 'var(--gradient-physics)',
    shadowGlow: 'var(--shadow-glow-physics)',
    duration: 50,
    totalQuestions: 28,
    parts: [
      {
        id: 'mc',
        name: 'Trắc nghiệm',
        type: 'multiple_choice',
        count: 18,
        pointsPerCorrect: 0.25,
        description: 'Chọn 1 đáp án đúng trong 4 phương án',
      },
      {
        id: 'tf',
        name: 'Đúng/Sai',
        type: 'true_false',
        count: 4,
        statementsPerQuestion: 4,
        scoring: {
          1: 0.1,
          2: 0.25,
          3: 0.5,
          4: 1.0,
        },
        description: 'Mỗi câu 4 mệnh đề, chọn Đúng/Sai cho từng mệnh đề',
      },
      {
        id: 'sa',
        name: 'Trả lời ngắn',
        type: 'short_answer',
        count: 6,
        pointsPerCorrect: 0.25,
        description: 'Điền đáp án vào ô trả lời',
      },
    ],
  },
  english: {
    id: 'english',
    name: 'Tiếng Anh',
    icon: '🌍',
    color: 'var(--color-english)',
    colorLight: 'var(--color-english-light)',
    colorBg: 'var(--color-english-bg)',
    gradient: 'var(--gradient-english)',
    shadowGlow: 'var(--shadow-glow-english)',
    duration: 50,
    totalQuestions: 40,
    parts: [
      {
        id: 'mc',
        name: 'Trắc nghiệm',
        type: 'multiple_choice',
        count: 40,
        pointsPerCorrect: 0.25,
        description: 'Chọn 1 đáp án đúng trong 4 phương án A/B/C/D',
      },
    ],
  },
};

// Sample exam data for demonstration
export const SAMPLE_EXAMS = {
  math: [
    {
      id: 'math-2025-mh',
      name: 'Đề minh hoạ 2025',
      subject: 'math',
      year: 2025,
      pdfFile: '/exams/math/de-minh-hoa-2025.pdf',
      answers: generateSampleAnswers('math'),
    },
    {
      id: 'math-2025-01',
      name: 'Đề tham khảo số 1',
      subject: 'math',
      year: 2025,
      pdfFile: '/exams/math/de-tham-khao-01.pdf',
      answers: generateSampleAnswers('math'),
    },
  ],
  physics: [
    {
      id: 'physics-2025-mh',
      name: 'Đề minh hoạ 2025',
      subject: 'physics',
      year: 2025,
      pdfFile: '/exams/physics/de-minh-hoa-2025.pdf',
      answers: generateSampleAnswers('physics'),
    },
  ],
  english: [
    {
      id: 'english-2025-mh',
      name: 'Đề minh hoạ 2025',
      subject: 'english',
      year: 2025,
      pdfFile: '/exams/english/de-minh-hoa-2025.pdf',
      answers: generateSampleAnswers('english'),
    },
  ],
};

/**
 * Generate sample correct answers for demonstration.
 * In production, these would come from actual answer keys.
 */
function generateSampleAnswers(subjectId) {
  const subject = SUBJECTS[subjectId];
  const answers = {};
  let questionIndex = 1;

  for (const part of subject.parts) {
    if (part.type === 'multiple_choice') {
      for (let i = 0; i < part.count; i++) {
        const options = ['A', 'B', 'C', 'D'];
        answers[questionIndex] = {
          type: 'multiple_choice',
          partId: part.id,
          correct: options[Math.floor(Math.random() * 4)],
        };
        questionIndex++;
      }
    } else if (part.type === 'true_false') {
      for (let i = 0; i < part.count; i++) {
        const statements = {};
        for (let s = 0; s < part.statementsPerQuestion; s++) {
          const label = String.fromCharCode(97 + s); // a, b, c, d
          statements[label] = Math.random() > 0.5;
        }
        answers[questionIndex] = {
          type: 'true_false',
          partId: part.id,
          correct: statements,
        };
        questionIndex++;
      }
    } else if (part.type === 'short_answer') {
      for (let i = 0; i < part.count; i++) {
        answers[questionIndex] = {
          type: 'short_answer',
          partId: part.id,
          correct: String(Math.floor(Math.random() * 100) / 10),
        };
        questionIndex++;
      }
    }
  }

  return answers;
}

/**
 * Get the number label for a question within its part.
 */
export function getQuestionLabel(questionNumber, subjectId) {
  const subject = SUBJECTS[subjectId];
  let count = 0;
  for (const part of subject.parts) {
    if (questionNumber <= count + part.count) {
      return {
        partName: part.name,
        partType: part.type,
        indexInPart: questionNumber - count,
      };
    }
    count += part.count;
  }
  return null;
}
