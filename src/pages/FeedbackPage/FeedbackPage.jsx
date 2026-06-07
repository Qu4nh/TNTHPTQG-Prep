import { useState, useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { Send, CheckCircle, Star } from 'lucide-react';
import './FeedbackPage.css';

export default function FeedbackPage() {
  const containerRef = useRef(null);
  const [formData, setFormData] = useState({
    name: '',
    rating: 0,
    message: ''
  });
  const [hoverRating, setHoverRating] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const { contextSafe } = useGSAP(() => {
    const tl = gsap.timeline();

    tl.fromTo('.feedback-page__header',
      { y: -30, opacity: 0, filter: 'blur(10px)' },
      { y: 0, opacity: 1, filter: 'blur(0px)', duration: 0.8, ease: 'expo.out' }
    );

    tl.fromTo('.feedback-card',
      { y: 40, opacity: 0, scale: 0.95 },
      { y: 0, opacity: 1, scale: 1, duration: 0.7, ease: 'back.out(1.2)' },
      '-=0.5'
    );
  }, { scope: containerRef });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleRating = (value) => {
    setFormData(prev => ({ ...prev, rating: value }));
  };

  const handleMouseMove = (e, index) => {
    const { left, width } = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - left;
    const isHalf = x < width / 2;
    setHoverRating(index - (isHalf ? 0.5 : 0));
  };

  const handleSubmit = contextSafe(async (e) => {
    e.preventDefault();
    if (!formData.message.trim()) return;

    setIsSubmitting(true);
    
    // Animate button click
    gsap.to('.feedback-form__submit', { scale: 0.95, duration: 0.1, yoyo: true, repeat: 1 });

    const formUrl = import.meta.env.VITE_FEEDBACK_FORM_URL;
    
    const submitData = new FormData();
    submitData.append(import.meta.env.VITE_FEEDBACK_ENTRY_NAME || 'entry.1022302224', formData.name || 'Ẩn danh');
    submitData.append(import.meta.env.VITE_FEEDBACK_ENTRY_RATING || 'entry.499657825', formData.rating.toString());
    submitData.append(import.meta.env.VITE_FEEDBACK_ENTRY_MESSAGE || 'entry.869642352', formData.message);

    try {
      await fetch(formUrl, {
        method: 'POST',
        mode: 'no-cors',
        body: submitData
      });

      setIsSubmitting(false);
      setIsSuccess(true);
      
      // Animate success message entrance
      gsap.fromTo('.feedback-success', 
        { scale: 0.8, opacity: 0, rotationX: 15 },
        { scale: 1, opacity: 1, rotationX: 0, duration: 0.6, ease: 'back.out(1.5)', delay: 0.1 }
      );
    } catch (error) {
      console.error('Lỗi khi gửi góp ý:', error);
      setIsSubmitting(false);
      alert('Có lỗi xảy ra. Vui lòng thử lại sau!');
    }
  });

  const resetForm = contextSafe(() => {
    gsap.to('.feedback-success', {
      opacity: 0,
      scale: 0.9,
      duration: 0.3,
      onComplete: () => {
        setIsSuccess(false);
        setFormData({ name: '', rating: 0, message: '' });
        
        // Re-animate form entrance
        gsap.fromTo('.feedback-form',
          { opacity: 0, y: 20 },
          { opacity: 1, y: 0, duration: 0.5, delay: 0.1 }
        );
      }
    });
  });

  return (
    <div className="feedback-page" ref={containerRef}>
      <div className="feedback-page__header">
        <h1 className="feedback-page__title">Góp Ý & Báo Lỗi</h1>
        <p className="feedback-page__subtitle">Giúp chúng tôi cải thiện trải nghiệm luyện thi của bạn</p>
      </div>

      <div className="feedback-card">
        {isSuccess ? (
          <div className="feedback-success">
            <CheckCircle className="feedback-success__icon" size={64} />
            <h2 className="feedback-success__title">Cảm ơn bạn!</h2>
            <p className="feedback-success__desc">Góp ý của bạn đã được ghi nhận và sẽ giúp hệ thống ngày một tốt hơn.</p>
            <button className="feedback-success__back" onClick={resetForm}>
              Gửi thêm góp ý
            </button>
          </div>
        ) : (
          <form className="feedback-form" onSubmit={handleSubmit}>
            <div className="feedback-form__group">
              <label className="feedback-form__label" htmlFor="name">Tên</label>
              <input
                type="text"
                id="name"
                name="name"
                className="feedback-form__input"
                placeholder="Ví dụ: Nguyễn Văn A"
                value={formData.name}
                onChange={handleChange}
              />
            </div>
            
            <div className="feedback-form__group">
              <label className="feedback-form__label">Đánh giá trải nghiệm (1-5 sao) *</label>
              <div className="feedback-rating__stars" onMouseLeave={() => setHoverRating(0)}>
                {[1, 2, 3, 4, 5].map((star) => {
                  const currentRating = hoverRating || formData.rating;
                  return (
                    <div 
                      key={star}
                      className="feedback-rating__star-wrapper"
                      onMouseMove={(e) => handleMouseMove(e, star)}
                      onClick={() => handleRating(hoverRating || star)}
                    >
                      <Star size={28} className="feedback-rating__star" />
                      {currentRating >= star && (
                        <Star size={28} className="feedback-rating__star--filled" />
                      )}
                      {currentRating === star - 0.5 && (
                        <Star size={28} className="feedback-rating__star--half" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="feedback-form__group">
              <label className="feedback-form__label" htmlFor="message">Nội dung góp ý / Báo lỗi *</label>
              <textarea
                id="message"
                name="message"
                className="feedback-form__textarea"
                placeholder="Mô tả chi tiết vấn đề bạn gặp phải, hoặc ý tưởng muốn đóng góp..."
                value={formData.message}
                onChange={handleChange}
                required
                data-gramm="false"
              />
            </div>

            <button 
              type="submit" 
              className="feedback-form__submit"
              disabled={isSubmitting || !formData.message.trim()}
            >
              {isSubmitting ? 'Đang gửi...' : (
                <>
                  <Send size={18} />
                  <span>Gửi Góp Ý</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
