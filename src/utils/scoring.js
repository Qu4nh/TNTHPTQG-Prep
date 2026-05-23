/**
 * Scoring utility for THPTQG exams.
 * Implements official scoring rules from Bộ GD&ĐT 2025.
 */

import { SUBJECTS } from '../data/examConfig';

/**
 * Calculate score for a completed exam.
 * @param {string} subjectId - Subject identifier
 * @param {Object} userAnswers - User's answers { questionNumber: answer }
 * @param {Object} correctAnswers - Correct answer key { questionNumber: { type, correct } }
 * @returns {Object} Detailed score breakdown
 */
export function calculateScore(subjectId, userAnswers, correctAnswers) {
  const subject = SUBJECTS[subjectId];
  let totalScore = 0;
  let totalCorrect = 0;
  let totalWrong = 0;
  let totalSkipped = 0;
  const partScores = {};
  const questionResults = {};

  let questionIndex = 1;

  for (const part of subject.parts) {
    let partScore = 0;
    let partCorrect = 0;
    let partWrong = 0;
    let partSkipped = 0;
    let partPartial = 0;

    for (let i = 0; i < part.count; i++) {
      const qNum = questionIndex;
      const userAnswer = userAnswers[qNum];
      const correctAnswer = correctAnswers[qNum];

      if (!correctAnswer) {
        partSkipped++;
        questionResults[qNum] = {
          questionNumber: qNum,
          type: part.type,
          partId: part.id,
          partName: part.name,
          score: 0,
          isCorrect: false,
          status: 'skipped',
          userAnswer: userAnswer || null,
          correctAnswer: null,
        };
        questionIndex++;
        continue;
      }

      let qScore = 0;
      let isCorrect = false;
      let details = {};

      if (part.type === 'multiple_choice') {
        if (!userAnswer || userAnswer === '') {
          partSkipped++;
          details = { status: 'skipped', userAnswer: null, correctAnswer: correctAnswer.correct };
        } else if (userAnswer === correctAnswer.correct) {
          qScore = part.pointsPerCorrect;
          isCorrect = true;
          partCorrect++;
          details = { status: 'correct', userAnswer, correctAnswer: correctAnswer.correct };
        } else {
          partWrong++;
          details = { status: 'wrong', userAnswer, correctAnswer: correctAnswer.correct };
        }
      } else if (part.type === 'true_false') {
        if (!userAnswer || Object.keys(userAnswer).length === 0) {
          partSkipped++;
          details = { status: 'skipped', userAnswer: null, correctAnswer: correctAnswer.correct };
        } else {
          let correctCount = 0;
          const statementResults = {};

          for (const [label, correctVal] of Object.entries(correctAnswer.correct)) {
            const userVal = userAnswer[label];
            const isStatementCorrect = userVal === correctVal;
            if (isStatementCorrect) correctCount++;
            statementResults[label] = {
              userAnswer: userVal,
              correct: correctVal,
              isCorrect: isStatementCorrect,
            };
          }

          qScore = part.scoring[correctCount] || 0;
          isCorrect = correctCount === part.statementsPerQuestion;
          if (isCorrect) {
            partCorrect++;
          } else if (correctCount > 0) {
            partPartial++;
          } else {
            partWrong++;
          }

          details = {
            status: correctCount === 4 ? 'correct' : correctCount > 0 ? 'partial' : 'wrong',
            correctCount,
            statementResults,
            userAnswer,
            correctAnswer: correctAnswer.correct,
          };
        }
      } else if (part.type === 'short_answer') {
        if (!userAnswer || userAnswer === '') {
          partSkipped++;
          details = { status: 'skipped', userAnswer: null, correctAnswer: correctAnswer.correct };
        } else {
          // Normalize answer comparison (trim spaces, handle decimal)
          const normalizedUser = normalizeAnswer(userAnswer);
          const normalizedCorrect = normalizeAnswer(correctAnswer.correct);

          if (normalizedUser === normalizedCorrect) {
            qScore = part.pointsPerCorrect;
            isCorrect = true;
            partCorrect++;
            details = { status: 'correct', userAnswer, correctAnswer: correctAnswer.correct };
          } else {
            partWrong++;
            details = { status: 'wrong', userAnswer, correctAnswer: correctAnswer.correct };
          }
        }
      }

      partScore += qScore;
      questionResults[qNum] = {
        questionNumber: qNum,
        type: part.type,
        partId: part.id,
        partName: part.name,
        score: qScore,
        isCorrect,
        ...details,
      };

      questionIndex++;
    }

    totalScore += partScore;
    totalCorrect += partCorrect;
    totalWrong += partWrong;
    totalSkipped += partSkipped;

    partScores[part.id] = {
      name: part.name,
      type: part.type,
      score: Math.round(partScore * 100) / 100,
      correct: partCorrect,
      wrong: partWrong,
      partial: partPartial,
      skipped: partSkipped,
      total: part.count,
    };
  }

  return {
    totalScore: Math.round(totalScore * 100) / 100,
    maxScore: 10,
    totalCorrect,
    totalWrong,
    totalSkipped,
    totalQuestions: subject.totalQuestions,
    percentage: Math.round((totalScore / 10) * 100),
    partScores,
    questionResults,
    grade: getGrade(totalScore),
  };
}

/**
 * Normalize answer string for comparison.
 */
function normalizeAnswer(answer) {
  return String(answer)
    .trim()
    .replace(/,/g, '.')
    .replace(/\s+/g, '')
    .toLowerCase();
}

/**
 * Get letter grade from score.
 */
function getGrade(score) {
  if (score >= 8.5) return { letter: 'A+', label: 'Xuất sắc', color: 'var(--color-success)' };
  if (score >= 7.0) return { letter: 'A', label: 'Giỏi', color: 'var(--color-success)' };
  if (score >= 5.5) return { letter: 'B', label: 'Khá', color: 'var(--color-info)' };
  if (score >= 4.0) return { letter: 'C', label: 'Trung bình', color: 'var(--color-warning)' };
  return { letter: 'D', label: 'Yếu', color: 'var(--color-error)' };
}
