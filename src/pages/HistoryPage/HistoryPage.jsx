import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import useHistoryStore from '../../stores/historyStore';
import { SUBJECTS } from '../../data/examConfig';
import { formatDate, formatTime, formatScore, formatRelativeTime } from '../../utils/formatters';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts';
import { BarChart3, Trash2, Eye, Calendar, TrendingUp } from 'lucide-react';
import './HistoryPage.css';

/**
 * Compute statistics from history array.
 * Extracted to a pure function to avoid Zustand selector infinite loop.
 */
function computeStats(history) {
  if (history.length === 0) return [];
  
  const subjectStats = {};
  
  for (const r of history) {
    if (!subjectStats[r.subjectId]) {
      subjectStats[r.subjectId] = {
        subjectId: r.subjectId,
        subjectName: r.subjectName,
        totalExams: 0,
        totalScore: 0,
        highestScore: 0,
        lowestScore: 10,
      };
    }
    const stat = subjectStats[r.subjectId];
    stat.totalExams++;
    stat.totalScore += r.totalScore;
    if (r.totalScore > stat.highestScore) stat.highestScore = r.totalScore;
    if (r.totalScore < stat.lowestScore) stat.lowestScore = r.totalScore;
  }
  
  const results = [];
  for (const id in subjectStats) {
    const stat = subjectStats[id];
    stat.averageScore = Math.round((stat.totalScore / stat.totalExams) * 10) / 10;
    results.push(stat);
  }
  
  results.sort((a, b) => a.subjectName.localeCompare(b.subjectName));
  return results;
}

export default function HistoryPage() {
  const navigate = useNavigate();
  const history = useHistoryStore((s) => s.history);
  const deleteResult = useHistoryStore((s) => s.deleteResult);
  const stats = useMemo(() => computeStats(history), [history]);

  // Prepare chart data - scores over time
  const chartData = useMemo(() => {
    return [...history].reverse().map((r, i) => {
      const dateStr = new Date(r.submittedAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
      return {
        name: `Lần ${i + 1}`,
        date: dateStr,
        [r.subjectName]: r.totalScore,
      };
    });
  }, [history]);

  return (
    <div className="history-page">
      <div className="history-page__header">
        <h1 className="history-page__title">
          <BarChart3 size={24} />
          Lịch sử làm bài
        </h1>
      </div>

      {/* Dashboard Overview */}
      {history.length > 0 && (
        <div className="history-page__dashboard">
          {/* Summary Table */}
          <div className="history-page__summary-card">
            <h3 className="history-page__chart-title">
              <BarChart3 size={18} />
              Tổng quan
            </h3>
            <div className="summary-table-wrap">
              <table className="summary-table">
                <thead>
                  <tr>
                    <th>Môn</th>
                    <th className="text-center">Bài thi</th>
                    <th className="text-center">TB</th>
                    <th className="text-center">Cao</th>
                    <th className="text-center">Thấp</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.map((stat) => {
                    const sub = SUBJECTS[stat.subjectId];
                    return (
                      <tr key={stat.subjectId}>
                        <td>
                          <div className="summary-table__subject" style={{ color: sub?.color || 'var(--text-primary)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            {sub?.icon && <span style={{ display: 'inline-block', width: 20, height: 20, backgroundImage: `url(${sub.icon})`, backgroundSize: '145%', backgroundPosition: 'center', borderRadius: '4px' }}></span>}
                            {stat.subjectName}
                          </div>
                        </td>
                        <td className="text-center font-mono font-bold">{stat.totalExams}</td>
                        <td className="text-center font-mono">{formatScore(stat.averageScore)}</td>
                        <td className="text-center font-mono text-success font-bold">{formatScore(stat.highestScore)}</td>
                        <td className="text-center font-mono text-error font-bold">{formatScore(stat.lowestScore)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Performance Chart */}
          {chartData.length > 0 && (
            <div className="history-page__chart">
              <h3 className="history-page__chart-title">
                <TrendingUp size={18} />
                Xu hướng điểm số
              </h3>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 10]} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  {Object.values(SUBJECTS).map((sub) => (
                    <Line
                      key={sub.id}
                      type="monotone"
                      dataKey={sub.name}
                      stroke={sub.id === 'math' ? '#6366F1' : sub.id === 'physics' ? '#06B6D4' : '#F43F5E'}
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      connectNulls
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* History Table */}
      {history.length === 0 ? (
        <div className="history-page__empty">
          <Calendar size={48} />
          <p>Chưa có lịch sử làm bài.</p>
          <p className="history-page__empty-sub">Hãy chọn một đề thi để bắt đầu!</p>
          <button className="history-page__start-btn" onClick={() => navigate('/')}>
            Bắt đầu làm bài
          </button>
        </div>
      ) : (
        <div className="history-page__table-wrap">
          <table className="history-table">
            <thead>
              <tr>
                <th>Ngày</th>
                <th>Môn</th>
                <th>Đề</th>
                <th>Điểm</th>
                <th>Thời gian</th>
                <th>Kết quả</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {history.map((r, index) => {
                const sub = SUBJECTS[r.subjectId];
                return (
                  <tr key={`${r.submittedAt}-${index}`} className="history-table__row">
                    <td className="history-table__date">
                      <span>{formatRelativeTime(r.submittedAt)}</span>
                    </td>
                    <td>
                      <span
                        className="history-table__subject"
                        style={{
                          background: sub?.colorBg,
                          color: sub?.color?.replace('var(', '').replace(')', ''),
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        {sub?.icon && <span style={{ display: 'inline-block', width: 18, height: 18, backgroundImage: `url(${sub.icon})`, backgroundSize: '145%', backgroundPosition: 'center', borderRadius: '4px' }}></span>} {r.subjectName}
                      </span>
                    </td>
                    <td className="history-table__exam">{r.examName}</td>
                    <td>
                      <span
                        className="history-table__score"
                        style={{ color: r.grade?.color }}
                      >
                        {formatScore(r.totalScore)}
                      </span>
                    </td>
                    <td className="history-table__time">{formatTime(r.timeTaken)}</td>
                    <td>
                      <span className="history-table__grade" style={{ color: r.grade?.color }}>
                        {r.grade?.letter}
                      </span>
                    </td>
                    <td className="history-table__actions">
                      <button
                        className="history-table__btn"
                        title="Xem lại"
                        onClick={() => navigate(`/review/${r.subjectId}/${r.examId}`)}
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        className="history-table__btn history-table__btn--delete"
                        title="Xoá"
                        onClick={() => {
                          if (window.confirm('Bạn có chắc chắn muốn xoá kết quả thi này không?')) {
                            deleteResult(r.submittedAt);
                          }
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
