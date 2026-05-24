import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import useHistoryStore from '../../stores/historyStore';
import { loadAiCache, loadPdf, saveAiCache } from '../../services/localDbService';
import { generateQuestionExplanation } from '../../services/aiService';
import { SUBJECTS } from '../../data/examConfig';
import { FunctionSquare, BookOpen, ChevronDown, ChevronRight, Eye, Brain, Sparkles, X, RotateCw } from 'lucide-react';
import PdfViewer from '../../components/exam/PdfViewer';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import './FormulaPage.css';
import '../ReviewPage/ReviewPage.css';

// Regex to extract from AI Explanation
const TOPIC_REGEX = /### 🎯 Dạng bài\s+([^\n]+)/i;
const FORMULA_REGEX = /### 📚 Kiến thức & Công thức áp dụng\s+([\s\S]*?)(?=###|$)/i;

export default function FormulaPage() {
  const navigate = useNavigate();
  const history = useHistoryStore((s) => s.history);
  
  const [formulas, setFormulas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [expandedTopics, setExpandedTopics] = useState({});

  // Modal State
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [questionAnalysis, setQuestionAnalysis] = useState('');
  const [questionAiLoading, setQuestionAiLoading] = useState(false);
  const [cachedPdfUrl, setCachedPdfUrl] = useState(null);
  const [loadingStatus, setLoadingStatus] = useState('Đang kết nối với Gemini AI...');

  useEffect(() => {
    let isMounted = true;
    const fetchFormulas = async () => {
      setLoading(true);
      const extractedFormulas = [];

      for (const result of history) {
        if (!result.questionResults) continue;

        // Check if there are any wrong/partial questions to fetch cache for
        const hasWrong = Object.values(result.questionResults).some(q => q.status === 'wrong' || q.status === 'partial');
        if (!hasWrong) continue;

        const cache = await loadAiCache(result.submittedAt);
        if (!cache || !cache.questions) continue;

        for (const [qNumStr, explanation] of Object.entries(cache.questions)) {
          if (!explanation) continue;

          const topicMatch = explanation.match(TOPIC_REGEX);
          const formulaMatch = explanation.match(FORMULA_REGEX);

          if (topicMatch && formulaMatch) {
            let topic = topicMatch[1].trim();
            let formulaText = formulaMatch[1].trim();
            
            // Clean up Markdown bullet points if needed, but keeping it raw is fine
            if (formulaText && formulaText.length > 5) {
              const parsedNum = qNumStr.replace('q-', '');
              const qObj = result.questionResults[parsedNum] || Object.values(result.questionResults).find(q => String(q.questionNumber) === parsedNum);

              extractedFormulas.push({
                id: `${result.submittedAt}-${qNumStr}`,
                subjectId: result.subjectId,
                subjectName: result.subjectName,
                examId: result.examId,
                examName: result.examName,
                submittedAt: result.submittedAt,
                questionNumber: parsedNum,
                topic: topic,
                content: formulaText,
                question: qObj ? { ...qObj, submittedAt: result.submittedAt, examId: result.examId, examName: result.examName, subjectId: result.subjectId } : null
              });
            }
          }
        }
      }

      if (isMounted) {
        setFormulas(extractedFormulas);
        setLoading(false);
      }
    };

    fetchFormulas();
    return () => { isMounted = false; };
  }, [history]);

  // Group by Subject -> Topic
  const groupedData = useMemo(() => {
    const filtered = selectedSubject === 'all' 
      ? formulas 
      : formulas.filter(f => f.subjectId === selectedSubject);

    const grouped = {};
    filtered.forEach(f => {
      if (!grouped[f.subjectId]) {
        grouped[f.subjectId] = {
          subjectName: f.subjectName,
          topics: {}
        };
      }
      
      const subjectGroup = grouped[f.subjectId];
      // Clean and normalize the topic string
      const prefixesToRemove = ["Toán học", "Vật lý", "Hóa học", "Sinh học", "Tiếng Anh", "Lịch sử", "Địa lý", "GDCD", "Toán", "Lý", "Hóa", "Sinh", "Sử", "Địa"];
      const parts = f.topic.split('>').map(p => p.trim());
      
      // If the first part is just the subject name, remove it
      if (parts.length > 1 && prefixesToRemove.some(p => parts[0].toLowerCase() === p.toLowerCase())) {
        parts.shift();
      }

      // Remove "Chương X: " or "Phần X: " prefixes from the main topic for consistency
      if (parts.length > 0) {
        parts[0] = parts[0].replace(/^(Chương|Phần)\s+\d+\s*:\s*/i, '');
      }

      const mainTopic = parts[0] || 'Chủ đề chung';
      const subTopic = parts.slice(1).join(' > ') || 'Công thức chung';

      if (!subjectGroup.topics[mainTopic]) {
        subjectGroup.topics[mainTopic] = [];
      }
      
      // Aggregate sources for identical formulas
      const existingItem = subjectGroup.topics[mainTopic].find(existing => existing.content === f.content);
      
      const source = {
        examId: f.examId,
        examName: f.examName,
        submittedAt: f.submittedAt,
        questionNumber: f.questionNumber,
        id: f.id,
        question: f.question
      };

      if (!existingItem) {
        subjectGroup.topics[mainTopic].push({
          subTopic,
          content: f.content,
          id: f.id,
          sources: [source]
        });
      } else {
        // Only add source if it's not already in the list
        const sourceExists = existingItem.sources.some(s => s.id === f.id);
        if (!sourceExists) {
          existingItem.sources.push(source);
        }
      }
    });

    return grouped;
  }, [formulas, selectedSubject]);

  const toggleTopic = (subjectId, topic) => {
    const key = `${subjectId}-${topic}`;
    setExpandedTopics(prev => ({
      ...prev,
      [key]: prev[key] === false ? true : false // default is true if undefined
    }));
  };

  const openQuestionDetail = (src) => {
    if (!src.question) return;
    const q = src.question;
    setSelectedQuestion(q);
    setQuestionAiLoading(false);
    setQuestionAnalysis('');
    setCachedPdfUrl(null);

    // Load cached PDF from IndexedDB
    loadPdf(q.submittedAt).then((pdfData) => {
      if (pdfData) {
        setCachedPdfUrl(pdfData.url);
      }
    });

    // Load cached AI analysis from IndexedDB
    loadAiCache(q.submittedAt).then((cache) => {
      const qNumStr = q.id || `q-${q.questionNumber}`;
      const cached = cache?.questions?.[qNumStr] || cache?.questions?.[q.questionNumber];
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
      const qNumStr = q.id || `q-${q.questionNumber}`;
      const updatedQuestions = {
        ...(cache.questions || {}),
        [qNumStr]: resultText
      };
      await saveAiCache(q.submittedAt, { ...cache, questions: updatedQuestions });
    } catch (err) {
      console.error(err);
      setQuestionAnalysis(`❌ Có lỗi xảy ra khi gọi AI: ${err.message}`);
    } finally {
      setQuestionAiLoading(false);
    }
  };

  const subjectOptions = [
    { value: 'all', label: 'Tất cả các môn' },
    ...Object.values(SUBJECTS).map(s => ({ value: s.id, label: s.name }))
  ];

  return (
    <div className="formula-page">
      <div className="formula-page__header">
        <h1 className="formula-page__title">
          <FunctionSquare size={24} />
          Sổ tay Công thức
        </h1>
        <p className="formula-page__subtitle">Tổng hợp các công thức và kiến thức từ những câu bạn đã làm sai.</p>
      </div>

      <div className="formula-page__filters">
        <div className="formula-page__filters-left">
          <div className="filter-group">
            <label>Môn học</label>
            <div className="select-wrapper">
              <select 
                className="filter-select"
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
              >
                {subjectOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
        <div className="formula-page__filters-right">
          <div className="formula-page__stats">
            <BookOpen size={16} />
            Đã thu thập <strong>{formulas.length}</strong> công thức
          </div>
        </div>
      </div>

      {loading ? (
        <div className="formula-page__loading">
          <div className="spinner"></div>
          <p>Đang tổng hợp công thức từ dữ liệu AI...</p>
        </div>
      ) : formulas.length === 0 ? (
        <div className="formula-page__empty">
          <FunctionSquare size={48} />
          <p>Chưa có công thức nào được lưu.</p>
          <p className="formula-page__empty-sub">Hãy thi và dùng AI giải thích các câu sai để tích lũy công thức nhé!</p>
        </div>
      ) : (
        <div className="formula-page__content">
          {Object.entries(groupedData).map(([subjectId, subjectData]) => {
            const subConfig = SUBJECTS[subjectId];
            return (
              <div key={subjectId} className="formula-subject-group">
                <div className="formula-subject-header" style={{ borderBottomColor: subConfig?.colorBg }}>
                  <div className="formula-subject-icon" style={{ backgroundColor: subConfig?.colorBg }}>
                    {subConfig?.icon ? (
                      <span style={{ display: 'inline-block', width: 24, height: 24, backgroundImage: `url(${subConfig.icon})`, backgroundSize: '145%', backgroundPosition: 'center', borderRadius: '4px' }}></span>
                    ) : (
                      <BookOpen size={20} color={subConfig?.color || '#000'} />
                    )}
                  </div>
                  <h2 style={{ color: subConfig?.color }}>{subjectData.subjectName}</h2>
                </div>

                <div className="formula-topics">
                  {Object.entries(subjectData.topics).map(([mainTopic, items]) => {
                    const topicKey = `${subjectId}-${mainTopic}`;
                    const isExpanded = expandedTopics[topicKey] !== false; // Default true

                    return (
                      <div key={mainTopic} className="formula-topic-card">
                        <div 
                          className="formula-topic-header" 
                          onClick={() => toggleTopic(subjectId, mainTopic)}
                        >
                          <div className="formula-topic-title">
                            {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                            <h3>{mainTopic}</h3>
                            <span className="formula-topic-count">{items.length} công thức</span>
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="formula-topic-content">
                            <div className="formula-grid">
                              {items.map((item, idx) => (
                                <div key={item.id + idx} className="formula-item">
                                  {item.subTopic !== 'Công thức chung' && (
                                    <div className="formula-item-subtopic">{item.subTopic}</div>
                                  )}
                                  <div className="formula-item-body">
                                    <ReactMarkdown 
                                      remarkPlugins={[remarkMath]} 
                                      rehypePlugins={[rehypeKatex]}
                                    >
                                      {item.content}
                                    </ReactMarkdown>
                                  </div>
                                  {item.sources && item.sources.length > 0 && (
                                    <div className="formula-item-footer">
                                      {item.sources.map((src) => (
                                        <span 
                                          key={src.id}
                                          className="formula-item-link"
                                          onClick={() => openQuestionDetail(src)}
                                          title={`Xem câu ${src.questionNumber} trong đề ${src.examName}`}
                                        >
                                          <Eye size={12} /> Câu {src.questionNumber} • {src.examName}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Question Detail Modal */}
      {selectedQuestion && (
        <div className="modal-overlay" onClick={() => setSelectedQuestion(null)}>
          <div className="modal modal--full" onClick={(e) => e.stopPropagation()}>
            <button className="modal__close" onClick={() => setSelectedQuestion(null)}>
              <X size={20} />
            </button>
            
            <div className="modal__split">
              <div className="modal__split-pdf">
                <div className="modal__pdf-wrap">
                  <PdfViewer examId={selectedQuestion.examId} initialPdfUrl={cachedPdfUrl} />
                </div>
              </div>

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

// Modal helper functions
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
