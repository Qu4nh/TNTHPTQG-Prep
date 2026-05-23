import { useState, useEffect, Fragment } from 'react';
import { getCountdown } from '../../utils/formatters';
import { EXAM_DATE } from '../../data/examConfig';
import './FlipClock.css';

export default function FlipClock() {
  const [countdown, setCountdown] = useState(getCountdown(EXAM_DATE));

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(getCountdown(EXAM_DATE));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  if (countdown.expired) {
    return (
      <div className="flip-clock">
        <div className="flip-clock__expired">Kỳ thi đã diễn ra!</div>
      </div>
    );
  }

  const units = [
    { value: countdown.days, label: 'Ngày' },
    { value: countdown.hours, label: 'Giờ' },
    { value: countdown.minutes, label: 'Phút' },
    { value: countdown.seconds, label: 'Giây' },
  ];

  return (
    <div className="flip-clock">
      <div className="flip-clock__label">⏰ Đếm ngược đến ngày thi</div>
      <div className="flip-clock__units">
        {units.map((unit, index) => (
          <Fragment key={unit.label}>
            <div className="flip-clock__unit">
              <div className="flip-clock__card">
                <span className="flip-clock__number" key={unit.value}>
                  {String(unit.value).padStart(2, '0')}
                </span>
              </div>
              <span className="flip-clock__unit-label">{unit.label}</span>
            </div>
            {index < units.length - 1 && (
              <div className="flip-clock__separator-wrapper">
                <span className="flip-clock__separator">:</span>
              </div>
            )}
          </Fragment>
        ))}
      </div>
      <div className="flip-clock__date">Ngày thi: 11/06/2026</div>
    </div>
  );
}
