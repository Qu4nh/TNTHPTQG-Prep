import { useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useExamStore from '../../stores/examStore';
import useHistoryStore from '../../stores/historyStore';
import { SUBJECTS } from '../../data/examConfig';
import { formatTime } from '../../utils/formatters';
import AnswerSheet from '../../components/exam/AnswerSheet';
import PdfAnnotator from '../../components/exam/PdfAnnotator';
import { Send, AlertTriangle, ChevronLeft } from 'lucide-react';
import { useState } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import './ExamPage.css';

export default function ExamPage() {
  const { subjectId, examId } = useParams();
  const navigate = useNavigate();
  const [showConfirm, setShowConfirm] = useState(false);
  const hasAddedResult = useRef(false);
  const containerRef = useRef(null);
  const modalRef = useRef(null);

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

  // GSAP Entrance Animations
  const { contextSafe } = useGSAP(() => {
    if (!currentExam || !currentSubject) return;

    const tl = gsap.timeline();

    // Header slides down from top
    tl.fromTo('.exam-page__header',
      { y: -30, opacity: 0, filter: 'blur(8px)' },
      { y: 0, opacity: 1, filter: 'blur(0px)', duration: 0.7, ease: 'expo.out', clearProps: 'filter' },
      0
    );

    // PDF panel slides in from left
    tl.fromTo('.exam-page__pdf-panel',
      { x: -40, opacity: 0, scale: 0.98 },
      { x: 0, opacity: 1, scale: 1, duration: 0.8, ease: 'power3.out', clearProps: 'transform,opacity' },
      0.2
    );

    // Answer panel slides in from right
    tl.fromTo('.exam-page__answer-panel',
      { x: 40, opacity: 0, scale: 0.98 },
      { x: 0, opacity: 1, scale: 1, duration: 0.8, ease: 'power3.out', clearProps: 'transform,opacity' },
      0.3
    );

    // Answer sheet parts stagger in
    tl.fromTo('.answer-sheet__part',
      { y: 20, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.6, stagger: 0.15, ease: 'back.out(1.2)', clearProps: 'transform,opacity' },
      0.5
    );
  }, { scope: containerRef, dependencies: [subjectId, examId] });

  // GSAP Clock hands animation (runs once on mount)
  useGSAP(() => {
    // Minute hand: ticks exactly once per second (60 steps per 60 seconds)
    gsap.to('.clock-minute', {
      rotation: 360,
      repeat: -1,
      duration: 60,
      ease: 'steps(60)',
      svgOrigin: '12 12'
    });
    // Hour hand: moves smoothly
    gsap.to('.clock-hour', {
      rotation: 360,
      repeat: -1,
      duration: 720,
      ease: 'linear',
      svgOrigin: '12 12'
    });
  }, { scope: containerRef });

  // GSAP Timer update (runs every second)
  useGSAP(() => {
    if (!currentExam || !currentSubject) return;

    const subject = SUBJECTS[subjectId];
    const totalDuration = subject.duration * 60;
    const timePercent = Math.max(0, Math.min(100, (timeRemaining / totalDuration) * 100));
    
    // Smoothly animate the timer border (1s linear for butter smooth countdown)
    gsap.to('.exam-timer', {
      '--time-percent': `${timePercent}%`,
      duration: 1,
      ease: 'linear',
      overwrite: 'auto'
    });
  }, { scope: containerRef, dependencies: [timeRemaining] });

  // GSAP Progress update (runs only when answer count changes)
  useGSAP(() => {
    if (!currentExam || !currentSubject) return;

    const subject = SUBJECTS[subjectId];
    const answeredCount = getAnsweredCount();
    const totalQuestions = subject.totalQuestions;
    const progress = Math.round((answeredCount / totalQuestions) * 100);

    // Smoothly animate the progress bar width
    gsap.to('.exam-progress__fill', {
      width: `${progress}%`,
      duration: 0.5,
      ease: 'power3.out',
      overwrite: 'auto'
    });

    // Pop the text when a question is answered
    if (answeredCount > 0) {
      gsap.fromTo('.exam-progress__text',
        { scale: 1.15, color: 'var(--subject-color)' },
        { scale: 1, color: 'var(--text-secondary)', duration: 0.4, ease: 'power2.out', clearProps: 'color' }
      );
    }
  }, { scope: containerRef, dependencies: [getAnsweredCount()] });

  // GSAP Hover for Submit button
  const handleSubmitHover = contextSafe((e, isHovering) => {
    gsap.to(e.currentTarget, {
      y: isHovering ? -3 : 0,
      scale: isHovering ? 1.05 : 1,
      boxShadow: isHovering ? '0 10px 25px -5px rgba(0,0,0,0.15)' : 'var(--shadow-sm)',
      duration: 0.4,
      ease: 'back.out(1.5)',
      overwrite: 'auto'
    });
  });

  // GSAP Modal animation
  const openModal = contextSafe(() => {
    setShowConfirm(true);
    // Wait for React to render the modal DOM
    requestAnimationFrame(() => {
      gsap.fromTo('.modal-overlay',
        { opacity: 0 },
        { opacity: 1, duration: 0.3, ease: 'power2.out' }
      );
      gsap.fromTo('.modal',
        { y: 30, opacity: 0, scale: 0.9, filter: 'blur(6px)' },
        { y: 0, opacity: 1, scale: 1, filter: 'blur(0px)', duration: 0.5, ease: 'back.out(1.7)', clearProps: 'filter' }
      );
      // Stagger modal children
      gsap.fromTo('.modal > *',
        { y: 10, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.4, stagger: 0.08, delay: 0.15, ease: 'power2.out' }
      );
    });
  });

  const closeModal = contextSafe(() => {
    gsap.to('.modal', {
      y: -20, opacity: 0, scale: 0.95, duration: 0.25, ease: 'power2.in',
      onComplete: () => setShowConfirm(false)
    });
    gsap.to('.modal-overlay', {
      opacity: 0, duration: 0.25, ease: 'power2.in'
    });
  });

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
    <div className="exam-page" ref={containerRef} style={{ '--subject-color': subject.color, '--subject-gradient': subject.gradient }}>
      {/* Header bar */}
      <div className="exam-page__header">
        <div className="exam-page__header-left">
          <button className="exam-page__back" onClick={() => { resetExam(); navigate('/'); }}>
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 className="exam-page__title">
              <span className="exam-page__title-icon" style={{ display: 'inline-block', width: 28, height: 28, backgroundImage: `url(${subject.icon})`, backgroundSize: '145%', backgroundPosition: 'center', verticalAlign: 'text-bottom', marginRight: '8px', borderRadius: '6px' }}></span>
              {subject.name} — {currentExam.name}
            </h1>
          </div>
        </div>

        <div className="exam-page__header-right">
          {/* Timer */}
          <div 
            className={`exam-timer ${isLowTime ? 'exam-timer--warning' : ''} ${isCriticalTime ? 'exam-timer--critical' : ''}`}
            // CSS variable --time-percent is now managed by GSAP above
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="exam-timer__icon">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="12" x2="12" y2="6" className="clock-minute"></line>
              <line x1="12" y1="12" x2="16" y2="12" className="clock-hour"></line>
            </svg>
            <span className="exam-timer__time">{formatTime(timeRemaining)}</span>
          </div>

          {/* Progress */}
          <div className="exam-progress">
            <div className="exam-progress__bar">
              {/* Width is now managed by GSAP above */}
              <div className="exam-progress__fill" />
            </div>
            <span className="exam-progress__text">{answeredCount}/{totalQuestions}</span>
          </div>

          {/* Submit */}
          <button 
            className="exam-page__submit" 
            onClick={openModal}
            onMouseEnter={(e) => handleSubmitHover(e, true)}
            onMouseLeave={(e) => handleSubmitHover(e, false)}
          >
            <Send size={16} />
            <span>Nộp bài</span>
          </button>
        </div>
      </div>

      {/* Main content - Two column layout: PDF left + Answer Sheet right */}
      <div className="exam-page__content">
        <div className="exam-page__pdf-panel">
          <PdfAnnotator examId={examId} />
        </div>
        <div className="exam-page__answer-panel">
          <AnswerSheet subjectId={subjectId} />
        </div>
      </div>

      {/* Confirm Modal */}
      {showConfirm && (
        <div className="modal-overlay" ref={modalRef} onClick={closeModal}>
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
              <button className="modal__btn modal__btn--cancel" onClick={closeModal}>
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
