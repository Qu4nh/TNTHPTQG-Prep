import { useState } from 'react';
import useSettingsStore from '../../stores/settingsStore';
import { Settings, Key, Eye, EyeOff, Save, CheckCircle2, Trash2, Shield } from 'lucide-react';
import './SettingsPage.css';

export default function SettingsPage() {
  const { geminiApiKey, setGeminiApiKey, clearSettings } = useSettingsStore();
  const [apiInput, setApiInput] = useState(geminiApiKey);
  const [showKey, setShowKey] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setGeminiApiKey(apiInput.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleClear = () => {
    setApiInput('');
    setGeminiApiKey('');
    setSaved(false);
  };

  const maskedKey = apiInput
    ? apiInput.substring(0, 8) + '•'.repeat(Math.max(0, apiInput.length - 12)) + apiInput.slice(-4)
    : '';

  return (
    <div className="settings-page">
      <div className="settings-page__header">
        <h1 className="settings-page__title">
          <Settings size={24} />
          Cài đặt
        </h1>
      </div>

      {/* API Key Section */}
      <section className="settings-section">
        <div className="settings-section__header">
          <div className="settings-section__icon" style={{ background: 'var(--color-math-bg)', color: 'var(--color-math)' }}>
            <Key size={20} />
          </div>
          <div>
            <h2 className="settings-section__title">Google Gemini API</h2>
            <p className="settings-section__desc">
              Nhập API key để sử dụng AI phân tích bài thi. Lấy key miễn phí tại{' '}
              <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="settings-link">
                aistudio.google.com/apikey
              </a>
            </p>
          </div>
        </div>

        <div className="settings-field">
          <label className="settings-field__label">API Key</label>
          <div className="settings-field__input-wrap">
            <input
              type={showKey ? 'text' : 'password'}
              className="settings-field__input"
              value={apiInput}
              onChange={(e) => { setApiInput(e.target.value); setSaved(false); }}
              placeholder="AIzaSy... (dán key vào đây)"
              autoComplete="off"
              spellCheck={false}
            />
            <button
              className="settings-field__toggle"
              onClick={() => setShowKey(!showKey)}
              title={showKey ? 'Ẩn key' : 'Hiện key'}
            >
              {showKey ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <div className="settings-field__hint">
            <Shield size={12} />
            <span>Key được lưu trữ trên trình duyệt của bạn (localStorage), không gửi đi đâu khác.</span>
          </div>
        </div>

        <div className="settings-actions">
          <button className={`settings-btn settings-btn--primary ${saved ? 'settings-btn--saved' : ''}`} onClick={handleSave} disabled={!apiInput.trim()}>
            {saved ? <CheckCircle2 size={16} /> : <Save size={16} />}
            <span>{saved ? 'Đã lưu!' : 'Lưu API Key'}</span>
          </button>
          {geminiApiKey && (
            <button className="settings-btn settings-btn--danger" onClick={handleClear}>
              <Trash2 size={16} />
              <span>Xoá key</span>
            </button>
          )}
        </div>

        {/* Status indicator */}
        <div className={`settings-status ${geminiApiKey ? 'settings-status--connected' : 'settings-status--disconnected'}`}>
          <span className="settings-status__dot" />
          <span>{geminiApiKey ? 'Đã kết nối — AI Analysis sẽ sử dụng Gemini API' : 'Chưa kết nối — Đang dùng AI phân tích mẫu (mock)'}</span>
        </div>
      </section>

      {/* Instructions */}
      <section className="settings-section">
        <h2 className="settings-section__title" style={{ marginBottom: 'var(--space-4)' }}>📋 Hướng dẫn lấy API Key</h2>
        <div className="settings-steps">
          <div className="settings-step">
            <span className="settings-step__num">1</span>
            <span>Truy cập <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="settings-link">Google AI Studio</a></span>
          </div>
          <div className="settings-step">
            <span className="settings-step__num">2</span>
            <span>Đăng nhập bằng tài khoản Google</span>
          </div>
          <div className="settings-step">
            <span className="settings-step__num">3</span>
            <span>Nhấn <strong>"Create API Key"</strong></span>
          </div>
          <div className="settings-step">
            <span className="settings-step__num">4</span>
            <span>Copy key và dán vào ô ở trên</span>
          </div>
          <div className="settings-step">
            <span className="settings-step__num">5</span>
            <span>Nhấn <strong>"Lưu API Key"</strong> — xong!</span>
          </div>
        </div>
      </section>
    </div>
  );
}
