import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import HomePage from './pages/HomePage/HomePage';
import ExamPage from './pages/ExamPage/ExamPage';
import CheckPage from './pages/CheckPage/CheckPage';
import ReviewPage from './pages/ReviewPage/ReviewPage';
import HistoryPage from './pages/HistoryPage/HistoryPage';
import SettingsPage from './pages/SettingsPage/SettingsPage';
import './App.css';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/exam/:subjectId/:examId" element={<ExamPage />} />
          <Route path="/check/:subjectId/:examId" element={<CheckPage />} />
          <Route path="/review/:subjectId/:examId" element={<ReviewPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
