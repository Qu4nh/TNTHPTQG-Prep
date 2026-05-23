import { NavLink, useLocation } from 'react-router-dom';
import { Home, History, BookOpen, Menu, X, Settings, BookX } from 'lucide-react';
import { useState } from 'react';
import './Sidebar.css';

const NAV_ITEMS = [
  { path: '/', label: 'Trang chủ', icon: Home },
  { path: '/history', label: 'Lịch sử', icon: History },
  { path: '/error-log', label: 'Câu làm sai', icon: BookX },
  { path: '/settings', label: 'Cài đặt', icon: Settings },
];

export default function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const closeMobile = () => setMobileOpen(false);

  return (
    <>
      {/* Mobile toggle */}
      <button
        className="sidebar-toggle"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label="Toggle menu"
      >
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Overlay */}
      <div
        className={`sidebar-overlay ${mobileOpen ? 'sidebar-overlay--visible' : ''}`}
        onClick={closeMobile}
      />

      {/* Sidebar */}
      <aside className={`sidebar ${mobileOpen ? 'sidebar--open' : ''}`}>
        <div className="sidebar__brand">
          <div className="sidebar__logo">
            <img src="/logo.svg" alt="THPT Logo" style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: 'var(--radius-sm)' }} />
          </div>
          <div>
            <div className="sidebar__title">TNTHPTQG Prep</div>
            <div className="sidebar__subtitle">Luyện thi 2026</div>
          </div>
        </div>

        <nav className="sidebar__nav">
          <span className="sidebar__label">Menu</span>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={`sidebar__link ${isActive ? 'sidebar__link--active' : ''}`}
                onClick={closeMobile}
              >
                <Icon className="sidebar__link-icon" size={20} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="sidebar__footer">
          <div className="sidebar__version">v1.0.0 • TNTHPTQG Prep</div>
          <div className="sidebar__credit">
            Made with ❤️ by{' '}
            <a href="https://github.com/Qu4nh" target="_blank" rel="noopener noreferrer">
              <span>Qu4nh</span>
            </a>
          </div>
        </div>
      </aside>
    </>
  );
}
