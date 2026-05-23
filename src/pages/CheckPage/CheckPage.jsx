import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { SUBJECTS, SAMPLE_EXAMS } from '../../data/examConfig';
import useExamStore from '../../stores/examStore';
import useHistoryStore from '../../stores/historyStore';
import { savePdf } from '../../services/localDbService';
import { CheckCircle2, ArrowRight, ChevronLeft, KeyRound } from 'lucide-react';
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

  if (!subject || !exam) {
    return (
      <div className="check-page__empty">
        <p>Không tìm thấy đề thi.</p>
        <button onClick={() => navigate('/')}>Về trang chủ</button>
      </div>
    );
  }

  const handleSetCustomKeyMC = (qNum, partId, value) => {
    setCustomKeys(prev => ({
      ...prev,
      [qNum]: { type: 'multiple_choice', partId, correct: value }
    }));
  };

  const handleSetCustomKeyTF = (qNum, partId, label, value) => {
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
  };

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

  let questionNumber = 1;

  return (
    <div className="check-page">
      <div className="check-page__header">
        <button className="check-page__back" onClick={() => navigate('/')}>
          <ChevronLeft size={20} />
          <span>Về trang chủ</span>
        </button>
        <h1 className="check-page__title">
          {isCustom ? <KeyRound size={24} /> : <CheckCircle2 size={24} />}
          {isCustom ? 'Nhập đáp án (Key) — ' : 'Đáp án — '}{subject.name} — {exam.name}
        </h1>
        {isCustom ? (
          <button className="check-page__review-btn check-page__review-btn--grade" onClick={handleGradeCustomExam}>
            <span>Chấm điểm</span>
            <ArrowRight size={16} />
          </button>
        ) : (
          <button className="check-page__review-btn" onClick={() => navigate(`/review/${subjectId}/${examId}`)}>
            <span>Xem đánh giá</span>
            <ArrowRight size={16} />
          </button>
        )}
      </div>

      <p className="check-page__note">
        {isCustom 
          ? <>📌 Vui lòng <strong>nhập đáp án đúng (Key)</strong> của đề thi này để hệ thống có thể chấm điểm bài làm của bạn.</>
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
                <div key={qNum} className="check-item">
                  <span className="check-item__num">Câu {qNum}</span>
                  {isCustom ? (
                    <div className="check-item__inputs-mc">
                      {['A', 'B', 'C', 'D'].map(opt => (
                        <button 
                          key={opt}
                          className={`check-item__input-btn ${answer?.correct === opt ? 'check-item__input-btn--active' : ''}`}
                          onClick={() => handleSetCustomKeyMC(qNum, part.id, opt)}
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
              partAnswers.push(
                <div key={qNum} className="check-item check-item--tf">
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
                              onClick={() => handleSetCustomKeyTF(qNum, part.id, label, true)}
                            >
                              Đ
                            </button>
                            <button 
                              className={`check-item__input-btn check-item__input-btn--false ${val === false ? 'check-item__input-btn--active' : ''}`}
                              onClick={() => handleSetCustomKeyTF(qNum, part.id, label, false)}
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
                <div key={qNum} className="check-item">
                  <span className="check-item__num">Câu {qNum}</span>
                  {isCustom ? (
                    <input 
                      type="text" 
                      className="check-item__input-text"
                      placeholder="Nhập..."
                      value={answer?.correct || ''}
                      onChange={(e) => handleSetCustomKeySA(qNum, part.id, e.target.value)}
                    />
                  ) : (
                    <span className="check-item__answer check-item__answer--sa">
                      {answer?.correct}
                    </span>
                  )}
                </div>
              );
            }

            questionNumber++;
          }

          return (
            <div key={part.id} className="check-page__section">
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
