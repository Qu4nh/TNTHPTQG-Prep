import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useHistoryStore from '../../stores/historyStore';
import { SUBJECTS } from '../../data/examConfig';
import { BookX, Calendar, FileText, Clock, Eye, Brain, Sparkles, X, RotateCw } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import PdfViewer from '../../components/exam/PdfViewer';
import { loadPdf, loadAiCache, saveAiCache } from '../../services/localDbService';
import { generateQuestionExplanation } from '../../services/aiService';
import './ErrorLogPage.css';

export default function ErrorLogPage() {
  const navigate = useNavigate();
  const history = useHistoryStore((s) => s.history);

  // Filter states
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [selectedType, setSelectedType] = useState('all');

  // Modal states
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [questionAnalysis, setQuestionAnalysis] = useState('');
  const [questionAiLoading, setQuestionAiLoading] = useState(false);
  const [cachedPdfUrl, setCachedPdfUrl] = useState(null);
  const [loadingStatus, setLoadingStatus] = useState('Đang kết nối với Gemini AI...');

  useEffect(() => {
    if (!questionAiLoading) return;
    const statuses = [
      'Đang đọc và phân tích đề bài từ PDF...',
      'Đang đối chiếu phương án trả lời...',
      'Đang tính toán lời giải chi tiết từng bước...',
      'Đang xác định lỗi tư duy thường gặp...',
      'Đang tối ưu hóa phương pháp giải nhanh...',
      'Đang định hình khung kiến thức ôn tập...'
    ];
    let idx = 0;
    setLoadingStatus(statuses[0]);
    const interval = setInterval(() => {
      idx = (idx + 1) % statuses.length;
      setLoadingStatus(statuses[idx]);
    }, 2500);
    return () => clearInterval(interval);
  }, [questionAiLoading]);

  // Extract and flatten all wrong/partial questions
  const errorLog = useMemo(() => {
    let errors = [];
    history.forEach((result) => {
      if (!result.questionResults) return;
      
      Object.values(result.questionResults).forEach((q) => {
        if (q.status === 'wrong' || q.status === 'partial') {
          errors.push({
            ...q,
            submittedAt: result.submittedAt,
            examId: result.examId,
            examName: result.examName,
            subjectId: result.subjectId,
            subjectName: result.subjectName,
          });
        }
      });
    });

    // Sort by most recent first
    return errors.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
  }, [history]);

  // Calculate stats for summary banner
  const stats = useMemo(() => {
    const total = errorLog.length;
    const bySubject = {};
    errorLog.forEach(err => {
      if (!bySubject[err.subjectId]) bySubject[err.subjectId] = 0;
      bySubject[err.subjectId]++;
    });
    return { total, bySubject };
  }, [errorLog]);

  // Filter the error log items
  const filteredErrorLog = useMemo(() => {
    return errorLog.filter(error => {
      const matchesSubject = selectedSubject === 'all' || error.subjectId === selectedSubject;
      const matchesType = selectedType === 'all' || error.type === selectedType;
      return matchesSubject && matchesType;
    });
  }, [errorLog, selectedSubject, selectedType]);

  const openQuestionDetail = (error) => {
    setSelectedQuestion(error);
    setQuestionAiLoading(false);
    setQuestionAnalysis('');
    setCachedPdfUrl(null);

    // Load cached PDF from IndexedDB
    loadPdf(error.submittedAt).then((pdfData) => {
      if (pdfData) {
        setCachedPdfUrl(pdfData.url);
      }
    });

    // Load cached AI analysis from IndexedDB
    loadAiCache(error.submittedAt).then((cache) => {
      const cached = cache?.questions?.[error.questionNumber];
      if (cached) {
        setQuestionAnalysis(cached);
      }
    });
  };

  const handleGenerateQuestionAnalysis = async (q) => {
    let apiKey = localStorage.getItem('gemini_api_key') || localStorage.getItem('thpt_gemini_api_key');
    if (!apiKey) {
      try {
        const settings = JSON.parse(localStorage.getItem('thpt_settings') || localStorage.getItem('settings'));
        if (settings?.geminiApiKey) {
          apiKey = settings.geminiApiKey;
        }
      } catch (e) {}
    }
    if (!apiKey) {
      apiKey = window.prompt('Để sử dụng AI, vui lòng nhập Google Gemini API Key của bạn:\n(Hoàn toàn miễn phí, bạn có thể lấy tại aistudio.google.com)');
      if (apiKey) {
        localStorage.setItem('gemini_api_key', apiKey.trim());
      } else {
        return;
      }
    }

    setQuestionAiLoading(true);
    setQuestionAnalysis('');
    
    try {
      const pdfUrl = cachedPdfUrl;
      const resultText = await generateQuestionExplanation(q, q.subjectId, pdfUrl);
      setQuestionAnalysis(resultText);

      // Save to IndexedDB cache
      const cache = await loadAiCache(q.submittedAt) || {};
      const updatedQuestions = {
        ...(cache.questions || {}),
        [q.questionNumber]: resultText
      };
      await saveAiCache(q.submittedAt, {
        ...cache,
        questions: updatedQuestions
      });
    } catch (error) {
      console.error(error);
      setQuestionAnalysis('❌ Đã có lỗi xảy ra khi gọi AI. Vui lòng kiểm tra lại API Key hoặc kết nối mạng.');
    } finally {
      setQuestionAiLoading(false);
    }
  };

  // Format user answer vs correct answer for display
  const renderAnswerContent = (error) => {
    if (error.type === 'multiple_choice' || error.type === 'short_answer') {
      const userAns = error.userAnswer || '(Bỏ trống)';
      const correctAns = error.correctAnswer;
      return (
        <div className="error-card__body">
          <div className="error-card__answer-box">
            <div className="answer-label">BẠN ĐÃ CHỌN</div>
            <div className="answer-value answer-value--user">{userAns}</div>
          </div>
          <div className="error-card__answer-box">
            <div className="answer-label">ĐÁP ÁN ĐÚNG</div>
            <div className="answer-value answer-value--correct">{correctAns}</div>
          </div>
          <div className="error-card__action-box">
            <button className="btn-view-detail" onClick={() => openQuestionDetail(error)}>
              <Eye size={16} /> Xem chi tiết
            </button>
          </div>
        </div>
      );
    } 
    
    if (error.type === 'true_false') {
       return (
        <div className="error-card__body">
          <div className="tf-blocks-container">
            {['a', 'b', 'c', 'd'].map(label => {
              const val = error.userAnswer?.[label];
              const correctVal = error.correctAnswer?.[label];
              const isCorrect = val === correctVal;
              const color = (val === undefined || val === null) 
                ? 'var(--text-tertiary)' 
                : (isCorrect ? 'var(--color-success)' : 'var(--color-error)');
              return (
                <div key={label} className="tf-block">
                  <div className="answer-label" style={{ marginBottom: 'var(--space-2)', borderBottom: '1px solid var(--surface-glass-border)', paddingBottom: '4px', textTransform: 'lowercase' }}>
                    {label})
                  </div>
                  <div className="tf-block__compare">
                    <div className="tf-compare-item">
                      <span className="tf-compare-label">Bạn chọn:</span>
                      <span className="tf-compare-value" style={{ color }}>
                        {val === true ? 'Đúng' : (val === false ? 'Sai' : 'Bỏ trống')}
                      </span>
                    </div>
                    <div className="tf-compare-item">
                      <span className="tf-compare-label">Đáp án:</span>
                      <span className="tf-compare-value" style={{ color: 'var(--color-success)' }}>
                        {correctVal === true ? 'Đúng' : 'Sai'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="error-card__action-box">
            <button className="btn-view-detail" onClick={() => openQuestionDetail(error)}>
              <Eye size={16} /> Xem chi tiết
            </button>
          </div>
        </div>
       );
    }

    return null;
  };

  const getTypeLabel = (type) => {
    if (type === 'multiple_choice') return 'Trắc nghiệm';
    if (type === 'true_false') return 'Đúng/Sai';
    if (type === 'short_answer') return 'Trả lời ngắn';
    return type;
  };

  return (
    <div className="error-log-page page-transition">
      
      {/* Title */}
      <div className="error-log__header" style={{ marginBottom: 'var(--space-6)' }}>
        <h1 className="error-log__title" style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--weight-bold)', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <BookX size={28} className="text-primary" />
          Câu làm sai
        </h1>
        <p className="error-log__subtitle" style={{ color: 'var(--text-secondary)', marginTop: 'var(--space-2)' }}>
          Tổng hợp tất cả các câu hỏi bạn đã làm sai hoặc chưa hoàn thành để dễ dàng ôn tập lại.
        </p>
      </div>

      {/* Filters Row */}
      <div className="error-log__filters-row">
        <div className="error-log__filters-left">
          <div className="filter-group">
            <label htmlFor="subject-filter">Môn học:</label>
            <select 
              id="subject-filter" 
              className="filter-select"
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
            >
              <option value="all">Tất cả các môn</option>
              {Object.entries(SUBJECTS).map(([id, sub]) => (
                <option key={id} value={id}>{sub.name}</option>
              ))}
            </select>
          </div>
          
          <div className="filter-group">
            <label htmlFor="type-filter">Dạng câu hỏi:</label>
            <select 
              id="type-filter" 
              className="filter-select"
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
            >
              <option value="all">Tất cả các dạng</option>
              <option value="multiple_choice">Trắc nghiệm</option>
              <option value="true_false">Đúng/Sai</option>
              <option value="short_answer">Trả lời ngắn</option>
            </select>
          </div>
        </div>
      </div>

      {/* Summary Banner */}
      <div className="error-log__summary">
        <div className="summary-total">
          <div className="summary-total__icon">
            <BookX size={24} />
          </div>
          <div className="summary-total__text">
            <span className="summary-total__label">Tổng số câu sai</span>
            <span className="summary-total__value">{stats.total}</span>
          </div>
        </div>
        <div className="summary-subjects">
          {Object.entries(stats.bySubject).map(([subId, count]) => {
            const sub = SUBJECTS[subId];
            if (!sub) return null;
            return (
              <div key={subId} className="subject-stat" style={{ background: sub.colorBg }}>
                <div className="subject-stat__header" style={{ color: sub.color }}>
                  {sub.icon ? (
                    <div 
                      style={{ 
                        width: 16, 
                        height: 16, 
                        backgroundImage: `url(${sub.icon})`, 
                        backgroundSize: '150%', 
                        backgroundPosition: 'center', 
                        backgroundRepeat: 'no-repeat',
                        flexShrink: 0
                      }} 
                    />
                  ) : null}
                  {sub.name}
                </div>
                <div className="subject-stat__value" style={{ color: sub.color }}>
                  {count} câu sai
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* List */}
      <div className="error-log__list">
        {filteredErrorLog.length === 0 ? (
          <div className="error-log__empty">
            Không tìm thấy câu làm sai nào phù hợp với bộ lọc.
          </div>
        ) : (
          filteredErrorLog.map((error, idx) => {
            const sub = SUBJECTS[error.subjectId];
            const subjectColor = sub?.color || 'var(--color-math)';
            const subjectBg = sub?.colorBg || 'var(--color-math-bg)';
            
            return (
              <div 
                key={`${error.submittedAt}-${error.questionNumber}-${idx}`} 
                className="error-card"
                style={{ borderLeftColor: subjectColor }}
              >
                <div className="error-card__icon-col">
                  <div 
                    className="error-card__main-icon" 
                    style={{ 
                      backgroundColor: subjectBg, 
                      color: subjectColor,
                      backgroundImage: sub?.icon ? `url(${sub.icon})` : 'none',
                      backgroundSize: '150%',
                      backgroundPosition: 'center',
                      backgroundRepeat: 'no-repeat'
                    }}
                  >
                    {!sub?.icon && <BookX size={24} />}
                  </div>
                </div>
                
                <div className="error-card__content-col">
                  <div className="error-card__header">
                    <div className="error-card__meta">
                      <span className="error-card__subject-name" style={{ color: subjectColor }}>
                        {error.subjectName}
                      </span>
                      <span 
                        className="error-card__meta-item error-card__meta-link"
                        onClick={() => navigate(`/review/${error.subjectId}/${error.examId}`)}
                        style={{ cursor: 'pointer', textDecoration: 'underline' }}
                        title="Xem lại toàn bộ đề thi này"
                      >
                        <FileText size={14} /> {error.examName}
                      </span>
                      <span className="error-card__meta-item">
                        <Calendar size={14} /> {new Date(error.submittedAt).toLocaleDateString('vi-VN')}
                      </span>
                      <span className="error-card__meta-item">
                        <Clock size={14} /> {new Date(error.submittedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="error-card__qnum">
                      Câu {error.questionNumber} ({getTypeLabel(error.type)})
                    </div>
                  </div>

                  {renderAnswerContent(error)}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Question Detail Modal (Exactly like review page's "Xem AI") */}
      {selectedQuestion && (
        <div className="modal-overlay" onClick={() => setSelectedQuestion(null)}>
          <div className="modal modal--full" onClick={(e) => e.stopPropagation()}>
            <button className="modal__close" onClick={() => setSelectedQuestion(null)}>
              <X size={20} />
            </button>
            
            <div className="modal__split">
              {/* Left Column: PDF Viewer */}
              <div className="modal__split-pdf">
                <div className="modal__pdf-wrap">
                  <PdfViewer examId={selectedQuestion.examId} initialPdfUrl={cachedPdfUrl} />
                </div>
              </div>

              {/* Right Column: Details & AI */}
              <div className="modal__split-details">
                <h3 className="modal__title">Chi tiết câu {selectedQuestion.questionNumber}</h3>
                <p className="modal__subtitle">{selectedQuestion.examName}</p>
                
                <div className="question-compare">
                  <div className="question-compare__item">
                    <span className="question-compare__label">Bạn chọn:</span>
                    <span className="question-compare__value">
                      {renderUserAnswerForCompare(selectedQuestion)}
                    </span>
                  </div>
                  <div className="question-compare__item">
                    <span className="question-compare__label">Đáp án đúng:</span>
                    <span className="question-compare__value">
                      {renderCorrectAnswerForCompare(selectedQuestion)}
                    </span>
                  </div>
                  <div className={`question-compare__status status--${selectedQuestion.status}`}>
                    {getStatusLabel(selectedQuestion)} ({selectedQuestion.score || 0} điểm)
                  </div>
                </div>

                <div className="question-ai-box">
                  {!questionAnalysis && !questionAiLoading ? (
                    <button className="ai-start-btn" onClick={() => handleGenerateQuestionAnalysis(selectedQuestion)}>
                      <Brain size={16} />
                      AI Giải thích câu này
                    </button>
                  ) : (
                    <div className="ai-content">
                      {questionAiLoading && (
                        <div className="ai-loading-container">
                          <div className="ai-loading-brain">
                            <Brain className="ai-loading-icon--brain" />
                            <div className="ai-loading-pulse" />
                            <Sparkles className="ai-loading-icon--sparkles" />
                          </div>
                          <div className="ai-loading-text-wrap">
                            <span className="ai-loading-title">Trí tuệ nhân tạo đang phân tích</span>
                            <span className="ai-loading-status">{loadingStatus}</span>
                          </div>
                        </div>
                      )}
                      {questionAnalysis && !questionAiLoading && (
                        <div className="ai-content__header">
                          <span className="ai-content__title">✨ Lời giải từ AI:</span>
                          <button className="btn-ai-regenerate" onClick={() => handleGenerateQuestionAnalysis(selectedQuestion)} title="Giải thích lại bằng AI">
                            <Brain size={16} className="btn-ai-regenerate__icon-ai" />
                            <RotateCw size={14} className="btn-ai-regenerate__icon-refresh" />
                          </button>
                        </div>
                      )}
                      {questionAnalysis && !questionAiLoading && (
                        <div className="ai-content__text markdown-body">
                          <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                            {questionAnalysis}
                          </ReactMarkdown>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// Modal helper functions for rendering answers
function renderUserAnswerForCompare(q) {
  if (q.type === 'true_false') {
    const results = q.statementResults || {};
    const labels = ['a', 'b', 'c', 'd'];
    return (
      <div className="tf-answer-group">
        {labels.map((label) => {
          const res = results[label] || {};
          const userVal = res.userAnswer !== undefined ? res.userAnswer : q.userAnswer?.[label];
          const valStr = userVal === undefined || userVal === null ? '?' : (userVal === 'T' || userVal === true ? 'Đ' : 'S');
          const isCorrect = res.isCorrect !== undefined ? res.isCorrect : (userVal === q.correctAnswer?.[label]);
          const badgeClass = userVal === undefined || userVal === null 
            ? 'ans-badge--skipped' 
            : (isCorrect ? 'ans-badge--correct' : 'ans-badge--wrong');
          return (
            <span key={label} className={`ans-badge ${badgeClass} tf-badge-item`}>
              <span className="tf-badge-label">{label})</span> {valStr}
            </span>
          );
        })}
      </div>
    );
  }
  return <span className={`ans-badge ans-badge--${q.status}`}>{formatAnswer(q.userAnswer, q.type)}</span>;
}

function renderCorrectAnswerForCompare(q) {
  if (!q.correctAnswer) return <span className="ans-badge ans-badge--skipped">Không có</span>;
  if (q.type === 'true_false') {
    return (
      <div className="tf-answer-group">
        {Object.entries(q.correctAnswer).map(([label, val]) => (
          <span key={label} className="ans-badge ans-badge--correct tf-badge-item">
            <span className="tf-badge-label">{label})</span> {val === 'T' || val === true ? 'Đ' : 'S'}
          </span>
        ))}
      </div>
    );
  }
  return <span className={`ans-badge ${q.correctAnswer ? 'ans-badge--correct' : 'ans-badge--skipped'}`}>{formatAnswer(q.correctAnswer, q.type)}</span>;
}

function formatAnswer(ans, type) {
  if (ans === undefined || ans === null || ans === '') return 'Chưa làm';
  if (type === 'true_false') {
    if (typeof ans !== 'object') return 'Chưa làm';
    const keys = Object.keys(ans);
    if (keys.length === 0) return 'Chưa làm';
    return keys.map(k => `${k}) ${ans[k] === 'T' || ans[k] === true ? 'Đ' : 'S'}`).join(' • ');
  }
  return String(ans);
}

function getStatusLabel(q) {
  if (q.type === 'true_false') {
    if (q.status === 'partial') return `Đúng ${q.correctCount}/4 ý`;
    if (q.status === 'correct') return `Đúng 4/4 ý`;
    if (q.status === 'wrong' && q.correctCount !== undefined) return `Đúng 0/4 ý`;
  }

  switch (q.status) {
    case 'correct': return 'Đúng';
    case 'wrong': return 'Sai';
    case 'partial': return 'Đúng 1 phần';
    case 'skipped': return 'Chưa làm';
    default: return '';
  }
}
