import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { SUBJECTS, SAMPLE_EXAMS } from '../../data/examConfig';
import useExamStore from '../../stores/examStore';
import useHistoryStore from '../../stores/historyStore';
import { savePdf } from '../../services/localDbService';
import { generateAnswerKey } from '../../services/aiService';
import { CheckCircle2, ArrowRight, ChevronLeft, KeyRound, Brain, Sparkles, Loader2, Timer } from 'lucide-react';
import ShortAnswerInput from '../../components/ui/ShortAnswerInput';
import './CheckPage.css';

export default function CheckPage() {
  const { subjectId, examId } = useParams();
  const navigate = useNavigate();
  const { gradeCustomExam } = useExamStore();
  const addResult = useHistoryStore((s) => s.addResult);

  const subject = SUBJECTS[subjectId];
  const isCustom = examId === 'custom';

  const exams = SAMPLE_EXAMS[subjectId] || [];
  let exam = exams.find((e) => e.id === examId);

  if (isCustom) {
    exam = {
      id: 'custom',
      name: sessionStorage.getItem('current_pdf_name') || 'Đề thi tự tải',
      answers: {}
    };
  }

  // State to hold user-inputted keys for custom exam
  const [customKeys, setCustomKeys] = useState({});

  // AI solve states
  const [aiSolving, setAiSolving] = useState(false);
  const [aiProgress, setAiProgress] = useState({ current: 0, total: 0, partName: '' });
  const [aiError, setAiError] = useState('');
  const [aiDone, setAiDone] = useState(false);
  const [aiTimer, setAiTimer] = useState(0);
  const [aiAnswersBuffer, setAiAnswersBuffer] = useState({});
  const containerRef = useRef(null);
  const syncedAiKeysRef = useRef(new Set());

  const { contextSafe } = useGSAP(() => {
    if (!subject || !exam) return;
    const tl = gsap.timeline();

    tl.fromTo('.check-page__header',
      { y: -30, opacity: 0, filter: 'blur(8px)' },
      { y: 0, opacity: 1, filter: 'blur(0px)', duration: 0.7, ease: 'expo.out', clearProps: 'filter' },
      0
    );

    tl.fromTo('.check-page__note',
      { y: -20, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.6, ease: 'power3.out', clearProps: 'transform,opacity' },
      0.2
    );

    tl.fromTo('.check-page__section',
      { y: 30, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.7, stagger: 0.15, ease: 'back.out(1.2)', clearProps: 'transform,opacity' },
      0.3
    );
  }, { scope: containerRef, dependencies: [subjectId, examId] });

  useGSAP(() => {
    if (aiSolving) {
      const widthPercent = aiProgress.total > 0 ? (aiProgress.current / aiProgress.total) * 100 : 0;
      gsap.to('.ai-solve-progress__bar', {
        width: `${widthPercent}%`,
        duration: 0.5,
        ease: 'power2.out',
        overwrite: 'auto'
      });
    }
  }, { scope: containerRef, dependencies: [aiProgress, aiSolving] });

  const handleHoverBtn = contextSafe((e, isHovering) => {
    gsap.to(e.currentTarget, {
      y: isHovering ? -2 : 0,
      scale: isHovering ? 1.02 : 1,
      boxShadow: isHovering ? '0 10px 25px -5px rgba(0,0,0,0.1)' : 'var(--shadow-sm)',
      duration: 0.3,
      ease: 'power2.out',
      overwrite: 'auto'
    });
  });

  const handleHoverBack = contextSafe((e, isHovering) => {
    gsap.to(e.currentTarget, {
      x: isHovering ? -4 : 0,
      backgroundColor: isHovering ? 'var(--bg-tertiary)' : 'transparent',
      duration: 0.3,
      ease: 'power2.out',
      overwrite: 'auto'
    });
  });

  useEffect(() => {
    let interval;
    let startTime;
    if (aiSolving) {
      startTime = Date.now();
      interval = setInterval(() => {
        setAiTimer(Date.now() - startTime);
      }, 50);
    }
    return () => clearInterval(interval);
  }, [aiSolving]);

  useEffect(() => {
    const bufferKeys = Object.keys(aiAnswersBuffer);
    
    // Find the first key in buffer that we HAVEN'T synced to the UI yet during this AI run
    const nextKey = bufferKeys.find(k => !syncedAiKeysRef.current.has(k));

    if (nextKey) {
      // Mark it as synced immediately so we don't loop
      syncedAiKeysRef.current.add(nextKey);
      const timer = setTimeout(() => {
        setCustomKeys(prev => {
          // If it's True/False, we merge the specific labels so we don't wipe out other labels if AI generated them sequentially
          if (aiAnswersBuffer[nextKey].type === 'true_false') {
            const currentCorrect = prev[nextKey]?.correct || {};
            return {
              ...prev,
              [nextKey]: {
                ...aiAnswersBuffer[nextKey],
                isAI: true,
                correct: { ...currentCorrect, ...aiAnswersBuffer[nextKey].correct }
              }
            };
          }
          // Otherwise, just overwrite
          return { ...prev, [nextKey]: { ...aiAnswersBuffer[nextKey], isAI: true } };
        });
      }, 50); // Fast typewriter effect
      return () => clearTimeout(timer);
    }
  }, [aiAnswersBuffer, customKeys]);

  const formatTimer = (ms) => {
    const totalSeconds = ms / 1000;
    return totalSeconds.toFixed(2) + 's';
  };

  if (!subject || !exam) {
    return (
      <div className="check-page__empty">
        <p>Không tìm thấy đề thi.</p>
        <button onClick={() => navigate('/')}>Về trang chủ</button>
      </div>
    );
  }

  const handleSetCustomKeyMC = contextSafe((e, qNum, partId, value) => {
    gsap.fromTo(e.currentTarget, { scale: 0.92 }, { scale: 1, duration: 0.25, ease: 'power2.out', overwrite: 'auto' });
    setCustomKeys(prev => ({
      ...prev,
      [qNum]: { type: 'multiple_choice', partId, correct: value }
    }));
  });

  const handleSetCustomKeyTF = contextSafe((e, qNum, partId, label, value) => {
    gsap.fromTo(e.currentTarget, { scale: 0.92 }, { scale: 1, duration: 0.25, ease: 'power2.out', overwrite: 'auto' });
    setCustomKeys(prev => {
      const current = prev[qNum]?.correct || {};
      return {
        ...prev,
        [qNum]: {
          type: 'true_false',
          partId,
          correct: { ...current, [label]: value }
        }
      };
    });
  });

  const handleSetCustomKeySA = (qNum, partId, value) => {
    setCustomKeys(prev => ({
      ...prev,
      [qNum]: { type: 'short_answer', partId, correct: value }
    }));
  };

  const handleGradeCustomExam = async () => {
    const result = gradeCustomExam(customKeys);
    if (result) {
      addResult(result);

      // Save PDF to IndexedDB for later review
      const pdfBlobUrl = sessionStorage.getItem('current_pdf');
      const pdfFileName = sessionStorage.getItem('current_pdf_name') || 'Đề thi';
      if (pdfBlobUrl) {
        try {
          const response = await fetch(pdfBlobUrl);
          const arrayBuffer = await response.arrayBuffer();
          await savePdf(result.submittedAt, arrayBuffer, pdfFileName);
        } catch (err) {
          console.error('Failed to save PDF to IndexedDB:', err);
        }
      }

      navigate(`/review/${subjectId}/${examId}`);
    }
  };

  const handleAiSolve = async () => {
    // Check for API key
    let apiKey = localStorage.getItem('gemini_api_key') || localStorage.getItem('thpt_gemini_api_key');
    if (!apiKey) {
      try {
        const settings = JSON.parse(localStorage.getItem('thpt_settings') || localStorage.getItem('settings'));
        if (settings?.geminiApiKey) {
          apiKey = settings.geminiApiKey;
        }
      } catch (e) { }
    }
    if (!apiKey) {
      apiKey = window.prompt('Để sử dụng AI giải đề, vui lòng nhập Google Gemini API Key:\n(Miễn phí tại aistudio.google.com)');
      if (apiKey) {
        localStorage.setItem('gemini_api_key', apiKey.trim());
      } else {
        return;
      }
    }

    const pdfBlobUrl = sessionStorage.getItem('current_pdf');
    if (!pdfBlobUrl) {
      setAiError('Không tìm thấy file PDF đề thi. Vui lòng quay lại và tải đề lên.');
      return;
    }

    setAiSolving(true);
    setAiError('');
    setAiDone(false);
    setAiProgress({ current: 0, total: subject.totalQuestions, partName: 'Đang chuẩn bị...' });
    setAiAnswersBuffer({});
    syncedAiKeysRef.current.clear();
    setAiTimer(0);

    try {
      const answers = await generateAnswerKey(subjectId, pdfBlobUrl, (current, total, partName, partialAnswers) => {
        setAiProgress({ current, total, partName });
        if (partialAnswers) {
          setAiAnswersBuffer(partialAnswers);
        }
      });

      setAiAnswersBuffer(answers);
      setAiDone(true);
    } catch (error) {
      console.error('AI Solve Error:', error);
      if (error.message === 'API_KEY_MISSING') {
        setAiError('Chưa có API Key. Vui lòng nhập API Key Gemini trong cài đặt.');
      } else if (error.message === 'PDF_MISSING') {
        setAiError('Không tìm thấy file PDF đề thi.');
      } else {
        setAiError(`Lỗi khi gọi AI: ${error.message || 'Vui lòng thử lại.'}`);
      }
    } finally {
      setAiSolving(false);
    }
  };

  let questionNumber = 1;

  return (
    <div className="check-page" ref={containerRef}>
      <div className="check-page__header">
        <button 
          className="check-page__back" 
          onClick={() => navigate('/')}
          onMouseEnter={(e) => handleHoverBack(e, true)}
          onMouseLeave={(e) => handleHoverBack(e, false)}
        >
          <ChevronLeft size={20} />
          <span>Về trang chủ</span>
        </button>
        <h1 className="check-page__title">
          {isCustom ? <KeyRound size={24} /> : <CheckCircle2 size={24} />}
          {isCustom ? 'Nhập đáp án (Key) — ' : 'Đáp án — '}{subject.name} — {exam.name}
        </h1>
        <div className="check-page__header-actions">
          {isCustom && (
            <button
              className="check-page__ai-btn"
              onClick={handleAiSolve}
              disabled={aiSolving}
              onMouseEnter={(e) => { if (!aiSolving) handleHoverBtn(e, true) }}
              onMouseLeave={(e) => { if (!aiSolving) handleHoverBtn(e, false) }}
            >
              {aiSolving ? (
                <>
                  <Loader2 size={16} className="spinning" />
                  <span>Đang giải...</span>
                </>
              ) : (
                <>
                  <Brain size={16} />
                  <Sparkles size={14} />
                  <span>AI Giải đề</span>
                </>
              )}
            </button>
          )}
          {isCustom ? (
            <button 
              className="check-page__review-btn check-page__review-btn--grade" 
              onClick={handleGradeCustomExam}
              onMouseEnter={(e) => handleHoverBtn(e, true)}
              onMouseLeave={(e) => handleHoverBtn(e, false)}
            >
              <span>Chấm điểm</span>
              <ArrowRight size={16} />
            </button>
          ) : (
            <button 
              className="check-page__review-btn" 
              onClick={() => navigate(`/review/${subjectId}/${examId}`)}
              onMouseEnter={(e) => handleHoverBtn(e, true)}
              onMouseLeave={(e) => handleHoverBtn(e, false)}
            >
              <span>Xem đánh giá</span>
              <ArrowRight size={16} />
            </button>
          )}
        </div>
      </div>

      {/* AI Progress Bar */}
      {aiSolving && (
        <div className="ai-solve-progress">
          <div className="ai-solve-progress__header">
            <Brain size={18} className="ai-solve-progress__icon" />
            <span className="ai-solve-progress__title">AI đang giải đề thi...</span>
            <span className="ai-solve-progress__count">{aiProgress.current}/{aiProgress.total}</span>
          </div>
          <div className="ai-solve-progress__bar-wrap">
            {/* GSAP will animate this width */}
            <div className="ai-solve-progress__bar" />
          </div>
          <div className="ai-solve-progress__footer">
            <span className="ai-solve-progress__status">Đang xử lý: {aiProgress.partName}</span>
            <div className="ai-solve-progress__timer">
              <Timer size={14} />
              <span>{formatTimer(aiTimer)}</span>
            </div>
          </div>
        </div>
      )}

      {/* AI Done notification */}
      {aiDone && !aiSolving && (
        <div className="ai-solve-done">
          <Sparkles size={16} />
          <span>AI đã giải xong <strong>{Object.keys(customKeys).length}/{subject.totalQuestions}</strong> câu. Bạn có thể kiểm tra và sửa lại trước khi chấm điểm.</span>
        </div>
      )}

      {/* AI Error */}
      {aiError && (
        <div className="ai-solve-error">
          <span>❌ {aiError}</span>
        </div>
      )}

      <p className="check-page__note">
        {isCustom
          ? <>📌 Vui lòng <strong>nhập đáp án đúng (Key)</strong> của đề thi này để hệ thống có thể chấm điểm bài làm của bạn. Hoặc nhấn <strong>"AI Giải đề"</strong> để AI tự động giải và điền đáp án.</>
          : <>📌 Trang này chỉ hiển thị <strong>đáp án đúng</strong>. Đáp án của bạn sẽ được phân tích ở trang Review.</>}
      </p>

      <div className="check-page__content">
        {subject.parts.map((part) => {
          const partAnswers = [];

          for (let i = 0; i < part.count; i++) {
            const qNum = questionNumber;
            const answer = isCustom ? customKeys[qNum] : exam.answers[qNum];

            if (part.type === 'multiple_choice') {
              partAnswers.push(
                <div key={qNum} className={`check-item ${answer?.correct && answer?.isAI ? 'check-item--filled' : ''}`}>
                  <span className="check-item__num">Câu {qNum}</span>
                  {isCustom ? (
                    <div className="check-item__inputs-mc">
                      {['A', 'B', 'C', 'D'].map(opt => (
                        <button
                          key={opt}
                          className={`check-item__input-btn ${answer?.correct === opt ? 'check-item__input-btn--active' : ''}`}
                          onClick={(e) => handleSetCustomKeyMC(e, qNum, part.id, opt)}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <span className="check-item__answer check-item__answer--mc">
                      {answer?.correct}
                    </span>
                  )}
                </div>
              );
            } else if (part.type === 'true_false') {
              const labels = ['a', 'b', 'c', 'd'];
              const hasTFAnswer = labels.some(l => answer?.correct?.[l] !== undefined);
              partAnswers.push(
                <div key={qNum} className={`check-item check-item--tf ${hasTFAnswer && answer?.isAI ? 'check-item--filled' : ''}`}>
                  <span className="check-item__num">Câu {qNum}</span>
                  <div className="check-item__tf-answers">
                    {labels.map((label) => {
                      const val = answer?.correct?.[label];
                      if (isCustom) {
                        return (
                          <div key={label} className="check-item__input-tf-group">
                            <span className="check-item__tf-label">{label})</span>
                            <button
                              className={`check-item__input-btn check-item__input-btn--true ${val === true ? 'check-item__input-btn--active' : ''}`}
                              onClick={(e) => handleSetCustomKeyTF(e, qNum, part.id, label, true)}
                            >
                              Đ
                            </button>
                            <button
                              className={`check-item__input-btn check-item__input-btn--false ${val === false ? 'check-item__input-btn--active' : ''}`}
                              onClick={(e) => handleSetCustomKeyTF(e, qNum, part.id, label, false)}
                            >
                              S
                            </button>
                          </div>
                        );
                      }

                      if (val === undefined) return null;
                      return (
                        <span
                          key={label}
                          className={`check-item__tf-badge ${val ? 'check-item__tf-badge--true' : 'check-item__tf-badge--false'}`}
                        >
                          {label}) {val ? 'Đ' : 'S'}
                        </span>
                      );
                    })}
                  </div>
                </div>
              );
            } else if (part.type === 'short_answer') {
              partAnswers.push(
                <div key={qNum} className={`check-item ${answer?.correct && answer?.isAI ? 'check-item--filled' : ''}`}>
                  <span className="check-item__num">Câu {qNum}</span>
                  {isCustom ? (
                    <ShortAnswerInput
                      value={answer?.correct || ''}
                      onChange={(val) => handleSetCustomKeySA(qNum, part.id, val)}
                      subjectId={subjectId}
                    />
                  ) : (
                    <ShortAnswerInput
                      value={answer?.correct || ''}
                      disabled={true}
                      subjectId={subjectId}
                    />
                  )}
                </div>
              );
            }

            questionNumber++;
          }

          return (
            <div key={part.id} className={`check-page__section check-page__section--${part.type}`}>
              <h2 className="check-page__section-title">{part.name} ({part.count} câu)</h2>
              <div className="check-page__grid">
                {partAnswers}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
