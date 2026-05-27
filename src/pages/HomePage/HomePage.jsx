import { useState, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { SUBJECTS } from '../../data/examConfig';
import FlipClock from '../../components/ui/FlipClock';
import { Clock, Upload, ArrowRight, Sparkles, FileText, X, Target, TrendingUp, CheckCircle, Flame } from 'lucide-react';
import useHistoryStore from '../../stores/historyStore';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import './HomePage.css';

gsap.registerPlugin(useGSAP);

export default function HomePage() {
  const navigate = useNavigate();
  const subjects = Object.values(SUBJECTS);
  const [pdfUrl, setPdfUrl] = useState(() => sessionStorage.getItem('current_pdf') || null);
  const [pdfName, setPdfName] = useState(() => sessionStorage.getItem('current_pdf_name') || null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);
  const containerRef = useRef(null);

  const history = useHistoryStore(state => state.history);
  const stats = useMemo(() => useHistoryStore.getState().getStatistics(), [history]);

  const { contextSafe } = useGSAP(() => {
    const tl = gsap.timeline({ 
      onComplete: () => {
        if (containerRef.current) {
          containerRef.current.classList.add('animations-done');
        }
      }
    });

    // 1. Hero Cards (Apple-style blur & scale reveal)
    tl.fromTo('.home__hero-card', 
      { y: 40, opacity: 0, scale: 0.95, filter: 'blur(10px)' },
      { y: 0, opacity: 1, scale: 1, filter: 'blur(0px)', duration: 1, stagger: 0.1, ease: 'expo.out', clearProps: 'opacity,transform,filter' },
      0 // start at 0s
    );

    // 2. Upload Section
    tl.fromTo('.home__upload-section', 
      { y: 20, opacity: 0, filter: 'blur(5px)' },
      { y: 0, opacity: 1, filter: 'blur(0px)', duration: 0.8, ease: 'power3.out', clearProps: 'opacity,transform,filter' },
      0.3 // overlap
    );

    // 3. Subject Cards (3D Flip & Cascade)
    gsap.set('.home__subject-grid', { perspective: 1000 });
    tl.fromTo('.subject-card', 
      { y: 60, opacity: 0, rotationX: -15, scale: 0.9 },
      { y: 0, opacity: 1, rotationX: 0, scale: 1, duration: 0.8, stagger: 0.1, ease: 'back.out(1.2)', clearProps: 'opacity,transform' },
      0.4 // overlap
    );

    // 4. Continuous floating for background icons (make UI alive)
    gsap.to('.home__hero-bg-icon', {
      y: -15,
      x: 10,
      duration: 4,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
      stagger: {
        amount: 2,
        from: 'random'
      }
    });

    // 5. Continuous gentle float for subject icons
    gsap.to('.subject-card__icon', {
      y: -6,
      duration: 2.5,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
      stagger: {
        amount: 1.5,
        from: 'random'
      }
    });
  }, { scope: containerRef });

  const handleHeroCardHover = contextSafe((e, isHovering) => {
    // 3D subtle tilt and glow on hero cards
    gsap.to(e.currentTarget, {
      y: isHovering ? -4 : 0,
      scale: isHovering ? 1.02 : 1,
      boxShadow: isHovering ? '0 20px 40px rgba(0,0,0,0.08)' : 'var(--shadow-sm)',
      duration: 0.5,
      ease: 'back.out(1.5)',
      overwrite: 'auto'
    });
    
    // Animate background icon (avoiding x/y to not conflict with floating)
    const bgIcon = e.currentTarget.querySelector('.home__hero-bg-icon');
    if (bgIcon) {
      gsap.to(bgIcon, {
        rotation: isHovering ? 0 : -15,
        scale: isHovering ? 1.08 : 1,
        opacity: isHovering ? 0.08 : 0.04,
        duration: 0.6,
        ease: 'power2.out',
        overwrite: 'auto'
      });
    }
  });

  const handleSubjectHover = contextSafe((e, isHovering, subjectGlow) => {
    // 3D flip out on hover
    gsap.to(e.currentTarget, {
      y: isHovering ? -8 : 0,
      scale: isHovering ? 1.03 : 1,
      boxShadow: isHovering ? subjectGlow : 'var(--shadow-sm)',
      borderColor: isHovering ? 'transparent' : 'var(--surface-glass-border)',
      duration: 0.5,
      ease: 'expo.out',
      overwrite: 'auto'
    });

    // Animate inner parts slightly
    const parts = e.currentTarget.querySelectorAll('.subject-card__part');
    if (parts.length > 0) {
      gsap.to(parts, {
        scale: isHovering ? 1.05 : 1,
        y: isHovering ? -2 : 0,
        stagger: isHovering ? 0.05 : 0,
        duration: 0.4,
        ease: 'back.out(2)',
        overwrite: 'auto'
      });
    }
  });

  const handleUploadHover = contextSafe((e, isHovering) => {
    // Only animate border and glow, DO NOT move the box
    gsap.to(e.currentTarget, {
      borderColor: isHovering ? 'var(--color-math)' : 'rgba(99, 102, 241, 0.3)',
      boxShadow: isHovering ? 'var(--shadow-glow-math)' : 'var(--shadow-sm)',
      background: isHovering ? 'rgba(255, 255, 255, 0.8)' : 'rgba(255, 255, 255, 0.6)',
      duration: 0.3,
      ease: 'power2.out',
      overwrite: 'auto'
    });
    
    // Very interesting bounce on the icon to force action
    const icon = e.currentTarget.querySelector('.home__upload-icon');
    if (icon) {
      if (isHovering) {
        // Intense, fast yoyo bounce while hovering
        gsap.to(icon, {
          y: -20,
          scaleY: 1.15,
          scaleX: 0.9,
          duration: 0.3,
          repeat: -1,
          yoyo: true,
          ease: 'power2.out',
          overwrite: 'auto'
        });
      } else {
        // Return to normal static state
        gsap.to(icon, {
          y: 0,
          scaleY: 1,
          scaleX: 1,
          duration: 0.4,
          ease: 'power2.out',
          overwrite: 'auto'
        });
      }
    }
  });

  const handleBtnHover = contextSafe((e, isHovering, subjectColor) => {
    gsap.to(e.currentTarget, {
      y: isHovering ? -3 : 0,
      scale: isHovering ? 1.04 : 1,
      boxShadow: isHovering ? `0 10px 25px -5px ${subjectColor}` : `0 4px 15px -3px ${subjectColor}`,
      duration: 0.5,
      ease: 'elastic.out(1.2, 0.4)',
      overwrite: 'auto'
    });
  });

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
    <div className="home" ref={containerRef}>
      {/* Hero Section (Dashboard Grid) */}
      <section className="home__hero">
        <div className="home__hero-grid">
          {/* Top Left: Title & Welcome */}
          <div 
            className="home__hero-card home__hero-title-card"
            onMouseEnter={(e) => handleHeroCardHover(e, true)}
            onMouseLeave={(e) => handleHeroCardHover(e, false)}
          >
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
          <div 
            className="home__hero-card home__hero-countdown-card"
            onMouseEnter={(e) => handleHeroCardHover(e, true)}
            onMouseLeave={(e) => handleHeroCardHover(e, false)}
          >
            <Clock className="home__hero-bg-icon" size={160} strokeWidth={1} />
            <FlipClock />
          </div>

          {/* Bottom Left: Streak */}
          <div 
            className={`home__hero-card home__hero-stat-card home__hero-streak-card ${!stats?.completedToday ? 'home__hero-streak-card--inactive' : ''}`}
            onMouseEnter={(e) => handleHeroCardHover(e, true)}
            onMouseLeave={(e) => handleHeroCardHover(e, false)}
          >
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
          <div 
            className="home__hero-card home__hero-stat-card home__hero-completed-card"
            onMouseEnter={(e) => handleHeroCardHover(e, true)}
            onMouseLeave={(e) => handleHeroCardHover(e, false)}
          >
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
          <div 
            className="home__hero-card home__hero-stat-card home__hero-predict-card"
            onMouseEnter={(e) => handleHeroCardHover(e, true)}
            onMouseLeave={(e) => handleHeroCardHover(e, false)}
          >
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
            onMouseEnter={(e) => handleUploadHover(e, true)}
            onMouseLeave={(e) => handleUploadHover(e, false)}
          >
            <input
              id="file-upload"
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
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => handleSubjectHover(e, true, subject.shadowGlow)}
              onMouseLeave={(e) => handleSubjectHover(e, false, subject.shadowGlow)}
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
                <button 
                  className="exam-item__btn exam-item__btn--start" 
                  style={{ width: '100%', justifyContent: 'center' }}
                  onMouseEnter={(e) => handleBtnHover(e, true, subject.color)}
                  onMouseLeave={(e) => handleBtnHover(e, false, subject.color)}
                >
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
