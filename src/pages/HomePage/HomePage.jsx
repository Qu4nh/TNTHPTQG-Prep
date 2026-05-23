import { useState, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { SUBJECTS } from '../../data/examConfig';
import FlipClock from '../../components/ui/FlipClock';
import { Clock, Upload, ArrowRight, Sparkles, FileText, X, Target, TrendingUp, CheckCircle, Flame } from 'lucide-react';
import useHistoryStore from '../../stores/historyStore';
import './HomePage.css';

export default function HomePage() {
  const navigate = useNavigate();
  const subjects = Object.values(SUBJECTS);
  const [pdfUrl, setPdfUrl] = useState(() => sessionStorage.getItem('current_pdf') || null);
  const [pdfName, setPdfName] = useState(() => sessionStorage.getItem('current_pdf_name') || null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const history = useHistoryStore(state => state.history);
  const stats = useMemo(() => useHistoryStore.getState().getStatistics(), [history]);

  const handleFileUpload = (file) => {
    if (!file || file.type !== 'application/pdf') {
      alert('Vui lòng chọn file PDF.');
      return;
    }
    const url = URL.createObjectURL(file);
    setPdfUrl(url);
    setPdfName(file.name);
    sessionStorage.setItem('current_pdf', url);
    sessionStorage.setItem('current_pdf_name', file.name);
  };

  const handleClearPdf = () => {
    setPdfUrl(null);
    setPdfName(null);
    sessionStorage.removeItem('current_pdf');
    sessionStorage.removeItem('current_pdf_name');
  };

  const handleStartExam = (subjectId) => {
    if (!pdfUrl) {
      alert('Vui lòng tải file PDF đề thi lên trước!');
      return;
    }
    // We use a special examId 'custom' for uploaded PDFs
    navigate(`/exam/${subjectId}/custom`);
  };

  return (
    <div className="home">
      {/* Hero Section (Dashboard Grid) */}
      <section className="home__hero">
        <div className="home__hero-grid">
          {/* Top Left: Title & Welcome */}
          <div className="home__hero-card home__hero-title-card">
            <div className="home__hero-badge">
              <Sparkles size={14} />
              <span>Chào mừng các sĩ tử 2k8</span>
            </div>
            <h1 className="home__hero-title">
              Luyện thi <span className="home__hero-highlight">TNTHPTQG</span>
            </h1>
            <p className="home__hero-desc">
              Hệ thống ôn luyện thông minh. Tải PDF đề thi, điền đáp án và nhận phân tích chuyên sâu từ AI.
            </p>
          </div>

          {/* Top Right: Countdown */}
          <div className="home__hero-card home__hero-countdown-card">
            <Clock className="home__hero-bg-icon" size={160} strokeWidth={1} />
            <FlipClock />
          </div>

          {/* Bottom Left: Streak */}
          <div className={`home__hero-card home__hero-stat-card home__hero-streak-card ${!stats?.completedToday ? 'home__hero-streak-card--inactive' : ''}`}>
            <Flame className="home__hero-bg-icon" size={120} strokeWidth={1} />
            <div className="stat-card__icon stat-card__icon--orange">
              <Flame size={28} />
            </div>
            <div className="stat-card__info">
              <span className="stat-card__value">{stats?.currentStreak || 0}</span>
              <span className="stat-card__label">Chuỗi ngày học</span>
            </div>
          </div>

          {/* Bottom Middle: Đề đã làm */}
          <div className="home__hero-card home__hero-stat-card home__hero-completed-card">
            <CheckCircle className="home__hero-bg-icon" size={120} strokeWidth={1} />
            <div className="stat-card__icon stat-card__icon--blue">
              <CheckCircle size={28} />
            </div>
            <div className="stat-card__info">
              <span className="stat-card__value">{stats.totalExams}</span>
              <span className="stat-card__label">Đề thi đã hoàn thành</span>
            </div>
          </div>

          {/* Bottom Right: Predict điểm */}
          <div className="home__hero-card home__hero-stat-card home__hero-predict-card">
            <TrendingUp className="home__hero-bg-icon" size={120} strokeWidth={1} />
            <div className="stat-card__icon stat-card__icon--purple">
              <TrendingUp size={28} />
            </div>
            <div className="stat-card__info" style={{ gap: '2px' }}>
              <span className="stat-card__label" style={{ marginBottom: '0px' }}>Dự đoán điểm A01</span>
              <span className="stat-card__value" style={{ marginBottom: '6px' }}>{(Number(stats?.a01Score) || 0).toFixed(1)}</span>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {Object.keys(stats?.bySubject || {}).length > 0 ? (
                  Object.values(stats.bySubject).map(sub => (
                    <div key={sub.subjectName} style={{ 
                      fontSize: '12px',
                    }}>
                      <span style={{ color: 'var(--text-tertiary)' }}>{sub.subjectName}:</span>{' '}
                      <strong style={{ color: 'var(--color-primary)' }}>{sub.predictedScore?.toFixed(1) || '0.0'}</strong>
                    </div>
                  ))
                ) : (
                  <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Chưa có dữ liệu môn</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PDF Upload Section */}
      <section className="home__upload-section">
        <h2 className="home__section-title">1. Tải đề thi (PDF)</h2>
        {!pdfUrl ? (
          <div
            className={`home__upload-box ${isDragging ? 'home__upload-box--dragging' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              handleFileUpload(e.dataTransfer.files[0]);
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              onChange={(e) => handleFileUpload(e.target.files[0])}
              style={{ display: 'none' }}
            />
            <div className="home__upload-icon">
              <Upload size={32} />
            </div>
            <h3 className="home__upload-title">Tải PDF đề thi lên đây</h3>
            <p className="home__upload-desc">Kéo thả file hoặc click để chọn</p>
          </div>
        ) : (
          <div className="home__uploaded-file">
            <div className="home__uploaded-info">
              <div className="home__uploaded-icon"><FileText size={24} /></div>
              <div className="home__uploaded-details">
                <div className="home__uploaded-name">{pdfName || 'Đề thi đã tải lên'}</div>
                <div className="home__uploaded-status">Sẵn sàng để làm bài</div>
              </div>
            </div>
            <button className="home__uploaded-clear" onClick={handleClearPdf} title="Xoá file">
              <X size={20} />
            </button>
          </div>
        )}
      </section>

      {/* Subject Selection */}
      <section className="home__subjects" style={{ opacity: pdfUrl ? 1 : 0.5, pointerEvents: pdfUrl ? 'auto' : 'none' }}>
        <h2 className="home__section-title">2. Chọn môn thi để bắt đầu</h2>
        <div className="home__subject-grid">
          {subjects.map((subject, index) => (
            <div
              key={subject.id}
              className="subject-card"
              style={{
                '--subject-color': subject.color,
                '--subject-bg': subject.colorBg,
                '--subject-light': subject.colorLight,
                '--subject-gradient': subject.gradient,
                '--subject-glow': subject.shadowGlow,
                animationDelay: `${index * 100}ms`,
                cursor: 'pointer',
              }}
              onClick={() => handleStartExam(subject.id)}
            >
              <div className="subject-card__header">
                <span 
                  className="subject-card__icon" 
                  style={{ backgroundImage: `url(${subject.icon})`, backgroundSize: '145%', backgroundPosition: 'center', borderRadius: 'inherit' }}
                ></span>
                <div>
                  <h3 className="subject-card__name">{subject.name}</h3>
                  <div className="subject-card__meta">
                    <Clock size={14} />
                    <span>{subject.duration} phút</span>
                    <span className="subject-card__dot">•</span>
                    <span>{subject.totalQuestions} câu</span>
                  </div>
                </div>
              </div>

              <div className="subject-card__parts">
                {subject.parts.map((part) => (
                  <div key={part.id} className="subject-card__part">
                    <span className="subject-card__part-name">{part.name}</span>
                    <span className="subject-card__part-count">{part.count} câu</span>
                  </div>
                ))}
              </div>

              <div className="subject-card__actions" style={{ marginTop: 'var(--space-4)' }}>
                <button className="exam-item__btn exam-item__btn--start" style={{ width: '100%', justifyContent: 'center' }}>
                  <span>Bắt đầu làm bài</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
