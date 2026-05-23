import { useParams, useNavigate } from 'react-router-dom';
import useHistoryStore from '../../stores/historyStore';
import { SUBJECTS } from '../../data/examConfig';
import { formatTime, formatScore } from '../../utils/formatters';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { Trophy, Target, Clock, TrendingUp, Brain, ChevronLeft, Sparkles, X, Filter, RotateCw } from 'lucide-react';
import { useState, useEffect } from 'react';
import { generateOverallAnalysis, generateQuestionExplanation } from '../../services/aiService';
import { loadPdf, loadAiCache, saveAiCache } from '../../services/localDbService';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import PdfViewer from '../../components/exam/PdfViewer';
import './ReviewPage.css';

const CHART_COLORS = ['#10B981', '#EF4444', '#9CA3AF'];

export default function ReviewPage() {
  const { subjectId, examId } = useParams();
  const navigate = useNavigate();
  const history = useHistoryStore((s) => s.history);

  const [hasStartedAnalysis, setHasStartedAnalysis] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [questionAnalysis, setQuestionAnalysis] = useState('');
  const [questionAiLoading, setQuestionAiLoading] = useState(false);

  const [filter, setFilter] = useState('all');

  // Cached PDF URL from IndexedDB
  const [cachedPdfUrl, setCachedPdfUrl] = useState(null);
  const [loadingStatus, setLoadingStatus] = useState('Đang kết nối với Gemini AI...');
  const [overallLoadingStatus, setOverallLoadingStatus] = useState('Đang kết nối với Gemini AI...');

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

  useEffect(() => {
    if (!aiLoading) return;
    const statuses = [
      'Đang thu thập điểm số và chi tiết bài thi...',
      'Đang đối chiếu với khung kiến thức môn học...',
      'Đang phân tích và dự đoán kỹ năng yếu...',
      'Đang hoạch định lộ trình ôn tập tối ưu...',
      'Đang tổng hợp lời khuyên từ chuyên gia...'
    ];
    let idx = 0;
    setOverallLoadingStatus(statuses[0]);
    const interval = setInterval(() => {
      idx = (idx + 1) % statuses.length;
      setOverallLoadingStatus(statuses[idx]);
    }, 2500);
    return () => clearInterval(interval);
  }, [aiLoading]);

  // Find the latest result for this exam
  const result = history.find(
    (r) => r.subjectId === subjectId && r.examId === examId
  );

  const subject = SUBJECTS[subjectId];

  // Load cached data from IndexedDB on mount
  useEffect(() => {
    if (!result) return;
    const resultKey = result.submittedAt;

    // Load cached PDF
    loadPdf(resultKey).then(pdfData => {
      if (pdfData) {
        setCachedPdfUrl(pdfData.url);
      }
    });

    // Load cached AI analysis
    loadAiCache(resultKey).then(cache => {
      if (cache?.overallAnalysis) {
        setAiAnalysis(cache.overallAnalysis);
        setHasStartedAnalysis(true);
      }
    });
  }, [result?.submittedAt]);

  // Real AI analysis for Overall
  const handleGenerateAiAnalysis = async (examResult) => {
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
      apiKey = window.prompt('Để sử dụng AI, vui lòng nhập Google Gemini API Key của bạn:\n(Hoàn toàn miễn phí, bạn có thể lấy tại aistudio.google.com)');
      if (apiKey) {
        localStorage.setItem('gemini_api_key', apiKey.trim());
      } else {
        return;
      }
    }

    setHasStartedAnalysis(true);
    setAiLoading(true);
    setAiAnalysis('');

    try {
      const pdfUrl = cachedPdfUrl || sessionStorage.getItem('current_pdf');
      const resultText = await generateOverallAnalysis(examResult, subjectId, pdfUrl);
      setAiAnalysis(resultText);

      // Save to IndexedDB cache
      await saveAiCache(result.submittedAt, { overallAnalysis: resultText });
    } catch (error) {
      console.error(error);
      setAiAnalysis('❌ Đã có lỗi xảy ra khi gọi AI. Vui lòng kiểm tra lại API Key hoặc thử lại sau.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleGenerateQuestionAnalysis = async (q) => {
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
      // Use cached PDF URL from IndexedDB, fall back to session
      const pdfUrl = cachedPdfUrl || sessionStorage.getItem('current_pdf');
      const resultText = await generateQuestionExplanation(q, subjectId, pdfUrl);
      setQuestionAnalysis(resultText);

      // Save to IndexedDB cache
      await saveAiCache(result.submittedAt, {
        questions: { [q.questionNumber]: resultText }
      });
    } catch (error) {
      console.error(error);
      setQuestionAnalysis('❌ Đã có lỗi xảy ra khi gọi AI. Vui lòng kiểm tra lại API Key hoặc kết nối mạng.');
    } finally {
      setQuestionAiLoading(false);
    }
  };

  const openQuestionDetail = async (q) => {
    setSelectedQuestion(q);
    setQuestionAiLoading(false);

    // Check cache for this question's analysis
    const cache = await loadAiCache(result.submittedAt);
    const cached = cache?.questions?.[q.questionNumber];
    if (cached) {
      setQuestionAnalysis(cached);
    } else {
      setQuestionAnalysis('');
    }
  };

  if (!result || !subject) {
    return (
      <div className="review-page__empty">
        <p>Chưa có kết quả cho đề thi này.</p>
        <button className="review-page__back-btn" onClick={() => navigate('/')}>Về trang chủ</button>
      </div>
    );
  }

  const pieData = [
    { name: 'Đúng', value: result.totalCorrect },
    { name: 'Sai', value: result.totalWrong },
    { name: 'Bỏ', value: result.totalSkipped },
  ];

  const allQuestions = Object.values(result.questionResults || {}).sort((a, b) => a.questionNumber - b.questionNumber).map(q => ({
    ...q,
    isBookmarked: result.bookmarkedQuestions?.includes(q.questionNumber) || false
  }));

  const barData = Object.values(result.partScores || {}).map((part) => {
    // Recalculate accurately from allQuestions to support old history data
    const partQs = allQuestions.filter(q => q.partId === part.id || q.partName === part.name);
    const total = partQs.length || part.total || 1;
    const correct = partQs.filter(q => q.status === 'correct').length;
    const partial = partQs.filter(q => q.status === 'partial').length;
    const wrong = partQs.filter(q => q.status === 'wrong').length;
    const skipped = partQs.filter(q => q.status === 'skipped').length;

    return {
      name: part.name,
      'Đúng': Math.round((correct / total) * 100),
      'Đúng một phần': Math.round((partial / total) * 100),
      'Sai': Math.round((wrong / total) * 100),
      'Bỏ': Math.round((skipped / total) * 100),
    };
  });

  const filteredQuestions = allQuestions.filter(q => {
    if (filter === 'all') return true;
    if (filter === 'correct') return q.status === 'correct';
    if (filter === 'wrong') return q.status === 'wrong' || q.status === 'partial';
    if (filter === 'skipped') return q.status === 'skipped';
    if (filter === 'bookmarked') return q.isBookmarked;
    return true;
  });

  return (
    <div className="review-page">
      {/* Header */}
      <div className="review-page__header">
        <button className="review-page__back" onClick={() => navigate('/')}>
          <ChevronLeft size={20} />
          <span>Trang chủ</span>
        </button>
        <h1 className="review-page__title">
          📊 Đánh giá — {subject.name} — {result.examName}
        </h1>
      </div>

      {/* Score Board with Integrated AI Analysis */}
      <div className="review-page__scoreboard">
        <div className="score-main">
          <div className="score-main__circle" style={{ '--score-color': result.grade.color }}>
            <span className="score-main__value">{formatScore(result.totalScore)}</span>
            <span className="score-main__max">/10</span>
          </div>
          <div className="score-main__grade" style={{ color: result.grade.color }}>
            {result.grade.letter} — {result.grade.label}
          </div>
        </div>

        <div className="score-stats">
          <div className="score-stat">
            <Trophy size={18} className="score-stat__icon" style={{ color: 'var(--color-success)' }} />
            <div>
              <span className="score-stat__value">{result.totalCorrect}</span>
              <span className="score-stat__label">Đúng</span>
            </div>
          </div>
          <div className="score-stat">
            <Target size={18} className="score-stat__icon" style={{ color: 'var(--color-error)' }} />
            <div>
              <span className="score-stat__value">{result.totalWrong}</span>
              <span className="score-stat__label">Sai</span>
            </div>
          </div>
          <div className="score-stat">
            <Clock size={18} className="score-stat__icon" style={{ color: 'var(--color-info)' }} />
            <div>
              <span className="score-stat__value">{formatTime(result.timeTaken)}</span>
              <span className="score-stat__label">Thời gian</span>
            </div>
          </div>
          <div className="score-stat">
            <TrendingUp size={18} className="score-stat__icon" style={{ color: 'var(--color-math)' }} />
            <div>
              <span className="score-stat__value">{result.percentage}%</span>
              <span className="score-stat__label">Tỷ lệ</span>
            </div>
          </div>
        </div>

        <div className="score-ai-box">
          <div className="score-ai-box__header">
            <div className="score-ai-box__header-title">
              <Brain size={16} />
              <span>Đánh giá chung (AI)</span>
            </div>
            {hasStartedAnalysis && !aiLoading && (
              <button
                className="ai-refresh-btn"
                onClick={() => handleGenerateAiAnalysis(result)}
                title="Yêu cầu AI đánh giá lại"
              >
                <RotateCw size={13} />
              </button>
            )}
          </div>
          {!hasStartedAnalysis ? (
            <div className="score-ai-box__start">
              <button className="ai-start-btn" onClick={() => handleGenerateAiAnalysis(result)}>
                <Sparkles size={14} />
                Phân tích bằng AI
              </button>
            </div>
          ) : (
            <div className="score-ai-box__content">
              {aiAnalysis ? (
                <div className="ai-content__text markdown-body">
                  <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                    {aiAnalysis}
                  </ReactMarkdown>
                </div>
              ) : (
                <div className="ai-loading-container">
                  <div className="ai-loading-brain">
                    <Brain className="ai-loading-icon--brain" />
                    <div className="ai-loading-pulse" />
                    <Sparkles className="ai-loading-icon--sparkles" />
                  </div>
                  <div className="ai-loading-text-wrap">
                    <span className="ai-loading-title">Trí tuệ nhân tạo đang phân tích bài thi</span>
                    <span className="ai-loading-status">{overallLoadingStatus}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Charts */}
      <div className="review-page__charts">
        <div className="chart-card">
          <h3 className="chart-card__title">Phân bổ kết quả</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={4}
                dataKey="value"
                label={({ name, value }) => `${name}: ${value}`}
              >
                {pieData.map((entry, index) => (
                  <Cell key={entry.name} fill={CHART_COLORS[index]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3 className="chart-card__title">Theo dạng câu hỏi</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={barData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} tickFormatter={(tick) => `${tick}%`} />
              <Tooltip formatter={(value) => `${value}%`} />
              <Legend />
              <Bar dataKey="Đúng" stackId="correctGroup" fill="#10B981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Đúng một phần" stackId="correctGroup" fill="#F59E0B" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Sai" fill="#EF4444" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Bỏ" fill="#9CA3AF" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detailed Question Table */}
      <div className="review-page__table-section">
        <div className="table-section__header">
          <div>
            <h2 className="review-page__section-title">Chi tiết bài làm</h2>
            <p className="review-page__section-desc">So sánh đáp án và xem AI giải thích chi tiết cho từng câu.</p>
          </div>
          <div className="table-actions">
            <div className="filter-wrapper">
              <Filter size={14} className="filter-icon" />
              <select value={filter} onChange={(e) => setFilter(e.target.value)} className="table-filter">
                <option value="all">Tất cả</option>
                <option value="correct">Câu đúng</option>
                <option value="wrong">Câu sai</option>
                <option value="skipped">Chưa làm/Chưa chấm</option>
                <option value="bookmarked">Câu đánh dấu</option>
              </select>
            </div>
          </div>
        </div>

        <div className="table-responsive">
          <table className="review-table">
            <thead>
              <tr>
                <th width="100">Câu</th>
                <th>Dạng câu hỏi</th>
                <th>Bạn chọn</th>
                <th>Đáp án</th>
                <th width="80" className="text-center">Điểm</th>
                <th width="140">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {filteredQuestions.map((q) => (
                <tr key={q.questionNumber} className={q.isBookmarked ? 'row-bookmarked' : ''}>
                  <td className="text-center font-bold">
                    <div className="review-page__qnumber-wrap">
                      <span>Câu {q.questionNumber}</span>
                    </div>
                  </td>
                  <td className="text-muted">{q.partName}</td>
                  <td>
                    {renderUserAnswer(q)}
                  </td>
                  <td>
                    {renderCorrectAnswer(q)}
                  </td>
                  <td className="text-center font-bold" style={{ color: 'var(--color-math)' }}>
                    {q.score || 0}
                  </td>
                  <td>
                    <button className="btn-ai-explain" onClick={() => openQuestionDetail(q)}>
                      <Sparkles size={14} />
                      Xem AI
                    </button>
                  </td>
                </tr>
              ))}
              {filteredQuestions.length === 0 && (
                <tr>
                  <td colSpan="6" className="text-center text-muted" style={{ padding: '2rem' }}>
                    Không có câu hỏi nào phù hợp với bộ lọc.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Question Detail Modal */}
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
                  <PdfViewer examId={examId} initialPdfUrl={cachedPdfUrl} />
                </div>
              </div>

              {/* Right Column: Details & AI */}
              <div className="modal__split-details">
                <h3 className="modal__title">Chi tiết câu {selectedQuestion.questionNumber}</h3>
                <p className="modal__subtitle">{selectedQuestion.partName}</p>

                <div className="question-compare">
                  <div className="question-compare__item">
                    <span className="question-compare__label">Bạn chọn:</span>
                    <span className="question-compare__value">
                      {renderUserAnswer(selectedQuestion)}
                    </span>
                  </div>
                  <div className="question-compare__item">
                    <span className="question-compare__label">Đáp án đúng:</span>
                    <span className="question-compare__value">
                      {renderCorrectAnswer(selectedQuestion)}
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
                            <span className="ai-loading-title">AI đang phân tích</span>
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
                      {questionAnalysis && !questionAiLoading && (() => {
                        let displayAnalysis = questionAnalysis;
                        let searchQuery = `Đề thi ${subject.name} ${result.examName} Câu ${selectedQuestion.questionNumber}`;
                        const searchMatch = questionAnalysis.match(/SEARCH_QUERY:\s*(.*)/i);
                        if (searchMatch) {
                          searchQuery = searchMatch[1].trim().replace(/^["']|["']$/g, '');
                          displayAnalysis = questionAnalysis.replace(/SEARCH_QUERY:\s*(.*)/i, '').trim();
                        }

                        return (
                          <div className="ai-content__text markdown-body">
                            <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                              {displayAnalysis}
                            </ReactMarkdown>

                            <div className="ai-content__actions">
                              <a
                                href={`https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn-google-search"
                              >
                                🔍 Tìm kiếm câu này trên Google
                              </a>
                            </div>
                          </div>
                        );
                      })()}
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

function renderUserAnswer(q) {
  if (q.type === 'true_false') {
    if (!q.statementResults) return <span className="ans-badge ans-badge--skipped">Chưa làm</span>;
    return (
      <div className="tf-answer-group">
        {Object.entries(q.statementResults).map(([label, res]) => {
          const valStr = res.userAnswer === undefined || res.userAnswer === null ? '?' : (res.userAnswer ? 'Đ' : 'S');
          const badgeClass = res.userAnswer === undefined || res.userAnswer === null
            ? 'ans-badge--skipped'
            : (res.isCorrect ? 'ans-badge--correct' : 'ans-badge--wrong');
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

function renderCorrectAnswer(q) {
  if (!q.correctAnswer) return <span className="ans-badge ans-badge--skipped">Không có</span>;
  if (q.type === 'true_false') {
    return (
      <div className="tf-answer-group">
        {Object.entries(q.correctAnswer).map(([label, val]) => (
          <span key={label} className="ans-badge ans-badge--correct tf-badge-item">
            <span className="tf-badge-label">{label})</span> {val ? 'Đ' : 'S'}
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
    return keys.map(k => `${k}) ${ans[k] ? 'Đ' : 'S'}`).join(' • ');
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


