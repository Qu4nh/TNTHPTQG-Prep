/**
 * Exam state management with Zustand.
 * Manages current exam session: answers, timer, submission.
 */

import { create } from 'zustand';
import { SUBJECTS, SAMPLE_EXAMS } from '../data/examConfig';
import { calculateScore } from '../utils/scoring';

const useExamStore = create((set, get) => ({
  // Current exam state
  currentExam: null,
  currentSubject: null,
  selectedAnswers: {},
  bookmarkedQuestions: new Set(),
  timeRemaining: 0,
  isRunning: false,
  isSubmitted: false,
  examResult: null,
  startTime: null,

  // Set current exam
  startExam: (subjectId, examId) => {
    const subject = SUBJECTS[subjectId];
    const exams = SAMPLE_EXAMS[subjectId] || [];
    let exam = exams.find((e) => e.id === examId);

    if (examId === 'custom') {
      exam = { id: 'custom', name: sessionStorage.getItem('current_pdf_name') || 'Đề thi tự tải', answers: {} };
    }

    if (!subject || !exam) return;

    set({
      currentExam: exam,
      currentSubject: subject,
      selectedAnswers: {},
      bookmarkedQuestions: new Set(),
      timeRemaining: subject.duration * 60,
      isRunning: true,
      isSubmitted: false,
      examResult: null,
      startTime: Date.now(),
    });
  },

  // Set answer for a question
  setAnswer: (questionNumber, answer) => {
    set((state) => ({
      selectedAnswers: {
        ...state.selectedAnswers,
        [questionNumber]: answer,
      },
    }));
  },

  // Set T/F answer for a specific statement
  setTrueFalseAnswer: (questionNumber, statementLabel, value) => {
    set((state) => {
      const currentTF = state.selectedAnswers[questionNumber] || {};
      return {
        selectedAnswers: {
          ...state.selectedAnswers,
          [questionNumber]: {
            ...currentTF,
            [statementLabel]: value,
          },
        },
      };
    });
  },

  // Toggle bookmark
  toggleBookmark: (questionNumber) => {
    set((state) => {
      const newBookmarks = new Set(state.bookmarkedQuestions);
      if (newBookmarks.has(questionNumber)) {
        newBookmarks.delete(questionNumber);
      } else {
        newBookmarks.add(questionNumber);
      }
      return { bookmarkedQuestions: newBookmarks };
    });
  },

  // Tick timer
  tick: () => {
    set((state) => {
      if (!state.isRunning || state.timeRemaining <= 0) {
        return { isRunning: false };
      }
      return { timeRemaining: state.timeRemaining - 1 };
    });
  },

  // Submit exam
  submitExam: () => {
    const state = get();
    if (!state.currentExam || !state.currentSubject) return;

    const result = calculateScore(
      state.currentSubject.id,
      state.selectedAnswers,
      state.currentExam.answers
    );

    const timeTaken = state.currentSubject.duration * 60 - state.timeRemaining;

    set({
      isRunning: false,
      isSubmitted: true,
      examResult: {
        ...result,
        timeTaken,
        examId: state.currentExam.id,
        examName: state.currentExam.name,
        subjectId: state.currentSubject.id,
        subjectName: state.currentSubject.name,
        submittedAt: new Date().toISOString(),
        userAnswers: { ...state.selectedAnswers },
        bookmarkedQuestions: Array.from(state.bookmarkedQuestions || []),
      },
    });
  },

  // Grade custom exam with provided keys
  gradeCustomExam: (customAnswers) => {
    const state = get();
    if (!state.currentExam || !state.currentSubject) return;

    const updatedExam = { ...state.currentExam, answers: customAnswers };

    const result = calculateScore(
      state.currentSubject.id,
      state.selectedAnswers,
      customAnswers
    );

    const timeTaken = state.currentSubject.duration * 60 - state.timeRemaining;

    set({
      currentExam: updatedExam,
      examResult: {
        ...result,
        timeTaken,
        examId: updatedExam.id,
        examName: updatedExam.name,
        subjectId: state.currentSubject.id,
        subjectName: state.currentSubject.name,
        submittedAt: new Date().toISOString(),
        userAnswers: { ...state.selectedAnswers },
        bookmarkedQuestions: Array.from(state.bookmarkedQuestions || []),
      },
    });
    
    return get().examResult;
  },

  // Reset exam
  resetExam: () => {
    set({
      currentExam: null,
      currentSubject: null,
      selectedAnswers: {},
      bookmarkedQuestions: new Set(),
      timeRemaining: 0,
      isRunning: false,
      isSubmitted: false,
      examResult: null,
      startTime: null,
    });
  },

  // Get answered count
  getAnsweredCount: () => {
    const state = get();
    return Object.keys(state.selectedAnswers).filter((key) => {
      const answer = state.selectedAnswers[key];
      if (typeof answer === 'object') {
        return Object.keys(answer).length > 0;
      }
      return answer !== '' && answer !== null && answer !== undefined;
    }).length;
  },
}));

export default useExamStore;
