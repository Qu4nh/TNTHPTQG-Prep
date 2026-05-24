/**
 * History state management with Zustand + localStorage persistence.
 * Stores all exam results and provides analytics.
 */

import { create } from 'zustand';
import { loadFromStorage, saveToStorage } from '../utils/storage';

const HISTORY_KEY = 'exam_history';

const useHistoryStore = create((set, get) => ({
  history: loadFromStorage(HISTORY_KEY, []),

  // Add exam result to history
  addResult: (result) => {
    set((state) => {
      const newHistory = [result, ...state.history];
      saveToStorage(HISTORY_KEY, newHistory);
      return { history: newHistory };
    });
  },

  // Get history filtered by subject
  getBySubject: (subjectId) => {
    return get().history.filter((r) => r.subjectId === subjectId);
  },

  // Get overall statistics
  getStatistics: () => {
    const { history } = get();
    if (history.length === 0) {
      return {
        totalExams: 0,
        averageScore: 0,
        a01Score: 0,
        currentStreak: 0,
        highestScore: 0,
        lowestScore: 0,
        bySubject: {},
      };
    }

    const bySubject = {};
    let totalScore = 0;
    let highest = 0;
    let lowest = 10;

    for (const result of history) {
      totalScore += result.totalScore;
      if (result.totalScore > highest) highest = result.totalScore;
      if (result.totalScore < lowest) lowest = result.totalScore;

      if (!bySubject[result.subjectId]) {
        bySubject[result.subjectId] = {
          subjectName: result.subjectName,
          count: 0,
          totalScore: 0,
          highest: 0,
          scores: [],
        };
      }
      const sub = bySubject[result.subjectId];
      sub.count++;
      sub.totalScore += result.totalScore;
      if (result.totalScore > sub.highest) sub.highest = result.totalScore;
      sub.scores.push({
        score: result.totalScore,
        date: result.submittedAt,
      });
    }

    // Calculate averages and predicted scores
    for (const sub of Object.values(bySubject)) {
      sub.average = Math.round((sub.totalScore / sub.count) * 10) / 10;
      
      const recentScores = sub.scores.slice(0, 3);
      sub.predictedScore = recentScores.reduce((sum, s) => sum + s.score, 0) / recentScores.length;
    }

    // Calculate A01 combination score (Toán, Lý, Anh) using predicted scores
    const mathPred = bySubject['math']?.predictedScore || 0;
    const physicsPred = bySubject['physics']?.predictedScore || 0;
    const englishPred = bySubject['english']?.predictedScore || 0;
    const a01Score = mathPred + physicsPred + englishPred;

    // Calculate current streak
    let currentStreak = 0;
    let completedToday = false;
    if (history.length > 0) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const uniqueDays = [...new Set(history.map(r => {
        const d = new Date(r.submittedAt);
        d.setHours(0, 0, 0, 0);
        return d.getTime();
      }))].sort((a, b) => b - a);

      if (uniqueDays.length > 0) {
        const firstDay = uniqueDays[0];
        const diffDays = Math.round((today.getTime() - firstDay) / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) completedToday = true;

        if (diffDays === 0 || diffDays === 1) {
          currentStreak = 1;
          for (let i = 1; i < uniqueDays.length; i++) {
            const diff = Math.round((uniqueDays[i-1] - uniqueDays[i]) / (1000 * 60 * 60 * 24));
            if (diff === 1) {
              currentStreak++;
            } else {
              break;
            }
          }
        }
      }
    }

    return {
      totalExams: history.length,
      averageScore: Math.round((totalScore / history.length) * 10) / 10,
      a01Score,
      currentStreak,
      completedToday,
      highestScore: highest,
      lowestScore: lowest === 10 && history.length === 0 ? 0 : lowest,
      bySubject,
    };
  },

  // Clear all history
  clearHistory: () => {
    saveToStorage(HISTORY_KEY, []);
    set({ history: [] });
  },

  // Toggle bookmark for a specific question in a specific exam result
  toggleQuestionBookmark: (submittedAt, questionNumber) => {
    set((state) => {
      const newHistory = state.history.map((r) => {
        if (r.submittedAt === submittedAt) {
          const qResults = { ...r.questionResults };
          if (qResults[questionNumber]) {
            qResults[questionNumber] = {
              ...qResults[questionNumber],
              isBookmarked: !qResults[questionNumber].isBookmarked
            };
          }
          return { ...r, questionResults: qResults };
        }
        return r;
      });
      saveToStorage(HISTORY_KEY, newHistory);
      return { history: newHistory };
    });
  },

  // Delete single result
  deleteResult: (submittedAt) => {
    // Also clean up IndexedDB caches
    import('../services/localDbService').then(({ deletePdf, deleteAiCache }) => {
      deletePdf(submittedAt);
      deleteAiCache(submittedAt);
    });

    set((state) => {
      const newHistory = state.history.filter((r) => r.submittedAt !== submittedAt);
      saveToStorage(HISTORY_KEY, newHistory);
      return { history: newHistory };
    });
  },
}));

export default useHistoryStore;
