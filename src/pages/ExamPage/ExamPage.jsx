import { useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useExamStore from '../../stores/examStore';
import useHistoryStore from '../../stores/historyStore';
import { SUBJECTS } from '../../data/examConfig';
import { formatTime } from '../../utils/formatters';
import AnswerSheet from '../../components/exam/AnswerSheet';
import PdfViewer from '../../components/exam/PdfViewer';
import { Clock, Send, AlertTriangle, ChevronLeft } from 'lucide-react';
import { useState, useRef } from 'react';
import './ExamPage.css';

export default function ExamPage() {
  const { subjectId, examId } = useParams();
  const navigate = useNavigate();
  const [showConfirm, setShowConfirm] = useState(false);
  const hasAddedResult = useRef(false);

  const {
    currentExam,
    currentSubject,
    timeRemaining,
    isRunning,
    isSubmitted,
    examResult,
    startExam,
    tick,
    submitExam,
    resetExam,
    getAnsweredCount,
  } = useExamStore();

  const addResult = useHistoryStore((s) => s.addResult);

  // Start exam on mount
  useEffect(() => {
    hasAddedResult.current = false;
    if (subjectId && examId) {
      startExam(subjectId, examId);
    }
  }, [subjectId, examId, startExam]);

  // Timer tick
  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [isRunning, tick]);

  // Auto-submit when time runs out
  useEffect(() => {
    if (isRunning && timeRemaining <= 0) {
      handleSubmit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRemaining, isRunning]);

  const handleSubmit = useCallback(() => {
    submitExam();
    setShowConfirm(false);
  }, [submitExam]);

  // Save to history when exam is submitted (only once)
  useEffect(() => {
    if (isSubmitted && examResult && !hasAddedResult.current) {
      hasAddedResult.current = true;
      if (examId !== 'custom') {
        addResult(examResult);
      }
      navigate(`/check/${subjectId}/${examId}`);
    }
  }, [isSubmitted, examResult, addResult, navigate, subjectId, examId]);

  if (!currentExam || !currentSubject) {
    return (
      <div className="exam-page__loading">
        <div className="exam-page__loading-spinner" />
        <p>Đang tải đề thi...</p>
      </div>
    );
  }

  const subject = SUBJECTS[subjectId];
  const answeredCount = getAnsweredCount();
  const totalQuestions = subject.totalQuestions;
  const progress = Math.round((answeredCount / totalQuestions) * 100);
  const totalDuration = subject.duration * 60; // minutes to seconds
  const timePercent = Math.max(0, Math.min(100, (timeRemaining / totalDuration) * 100));
  const isLowTime = timeRemaining < 300;
  const isCriticalTime = timeRemaining < 60;

  return (
    <div className="exam-page" style={{ '--subject-color': subject.color, '--subject-gradient': subject.gradient }}>
      {/* Header bar */}
      <div className="exam-page__header">
        <div className="exam-page__header-left">
          <button className="exam-page__back" onClick={() => { resetExam(); navigate('/'); }}>
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 className="exam-page__title">{subject.icon} {subject.name} — {currentExam.name}</h1>
          </div>
        </div>

        <div className="exam-page__header-right">
          {/* Timer */}
          <div 
            className={`exam-timer ${isLowTime ? 'exam-timer--warning' : ''} ${isCriticalTime ? 'exam-timer--critical' : ''}`}
            style={{ '--time-percent': `${timePercent}%` }}
          >
            <Clock size={18} />
            <span className="exam-timer__time">{formatTime(timeRemaining)}</span>
          </div>

          {/* Progress */}
          <div className="exam-progress">
            <div className="exam-progress__bar">
              <div className="exam-progress__fill" style={{ width: `${progress}%` }} />
            </div>
            <span className="exam-progress__text">{answeredCount}/{totalQuestions}</span>
          </div>

          {/* Submit */}
          <button className="exam-page__submit" onClick={() => setShowConfirm(true)}>
            <Send size={16} />
            <span>Nộp bài</span>
          </button>
        </div>
      </div>

      {/* Main content - Two column layout: PDF left + Answer Sheet right */}
      <div className="exam-page__content">
        <div className="exam-page__pdf-panel">
          <PdfViewer examId={examId} />
        </div>
        <div className="exam-page__answer-panel">
          <AnswerSheet subjectId={subjectId} />
        </div>
      </div>

      {/* Confirm Modal */}
      {showConfirm && (
        <div className="modal-overlay" onClick={() => setShowConfirm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal__icon">
              <AlertTriangle size={32} />
            </div>
            <h3 className="modal__title">Xác nhận nộp bài</h3>
            <p className="modal__desc">
              Bạn đã làm <strong>{answeredCount}/{totalQuestions}</strong> câu.
              {answeredCount < totalQuestions && (
                <span className="modal__warning"> Còn {totalQuestions - answeredCount} câu chưa trả lời!</span>
              )}
            </p>
            <div className="modal__actions">
              <button className="modal__btn modal__btn--cancel" onClick={() => setShowConfirm(false)}>
                Tiếp tục làm
              </button>
              <button className="modal__btn modal__btn--confirm" onClick={handleSubmit}>
                Nộp bài
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
