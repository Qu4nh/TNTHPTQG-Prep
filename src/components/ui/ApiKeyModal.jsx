import { useState, useRef, useEffect } from 'react';
import gsap from 'gsap';
import { KeyRound, Sparkles, ExternalLink, X } from 'lucide-react';
import './ApiKeyModal.css';

export default function ApiKeyModal({ isOpen, onClose, onSubmit }) {
  const [apiKey, setApiKey] = useState('');
  const [error, setError] = useState('');
  const overlayRef = useRef(null);
  const modalRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setApiKey('');
      setError('');
      gsap.fromTo(overlayRef.current, 
        { opacity: 0 }, 
        { opacity: 1, duration: 0.3, ease: 'power2.out' }
      );
      gsap.fromTo(modalRef.current, 
        { y: 30, opacity: 0, scale: 0.95 }, 
        { y: 0, opacity: 1, scale: 1, duration: 0.4, ease: 'back.out(1.2)' }
      );
    }
  }, [isOpen]);

  const handleClose = () => {
    gsap.to(overlayRef.current, { opacity: 0, duration: 0.2 });
    gsap.to(modalRef.current, { 
      y: 20, opacity: 0, scale: 0.95, duration: 0.2, 
      onComplete: onClose 
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!apiKey.trim()) {
      setError('Vui lòng nhập API Key hợp lệ.');
      return;
    }
    onSubmit(apiKey.trim());
    handleClose();
  };

  if (!isOpen) return null;

  return (
    <div className="api-modal-overlay" ref={overlayRef}>
      <div className="api-modal" ref={modalRef}>
        <button className="api-modal__close" onClick={handleClose}>
          <X size={20} />
        </button>
        
        <div className="api-modal__header">
          <div className="api-modal__icon">
            <Sparkles size={24} />
          </div>
          <h2 className="api-modal__title">Google Gemini API</h2>
        </div>

        <div className="api-modal__content">
          <p className="api-modal__desc">
            Để sử dụng tính năng AI (chấm điểm, giải chi tiết, phân tích công thức...), hệ thống cần sử dụng API của Google Gemini.
          </p>
          
          <div className="api-modal__steps">
            <p><strong>Làm theo các bước sau để lấy Key (Miễn phí):</strong></p>
            <ol>
              <li>Truy cập <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer">Google AI Studio <ExternalLink size={14} /></a>.</li>
              <li>Đăng nhập bằng tài khoản Google của bạn.</li>
              <li>Bấm nút <strong>"Create API key"</strong> và copy đoạn mã đó.</li>
              <li>Dán đoạn mã vào ô bên dưới.</li>
            </ol>
          </div>

          <form onSubmit={handleSubmit} className="api-modal__form">
            <div className="api-modal__input-group">
              <KeyRound size={18} className="api-modal__input-icon" />
              <input 
                type="text" 
                placeholder="Nhập API Key của bạn (VD: AIzaSy...)" 
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value);
                  setError('');
                }}
                autoFocus
              />
            </div>
            {error && <p className="api-modal__error">{error}</p>}
            
            <div className="api-modal__actions">
              <button type="button" className="api-modal__btn-cancel" onClick={handleClose}>
                Hủy
              </button>
              <button type="submit" className="api-modal__btn-submit">
                Xác nhận
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
