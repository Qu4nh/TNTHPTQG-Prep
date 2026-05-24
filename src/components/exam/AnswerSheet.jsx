import { SUBJECTS } from '../../data/examConfig';
import useExamStore from '../../stores/examStore';
import { Bookmark, BookmarkCheck } from 'lucide-react';
import ShortAnswerInput from '../ui/ShortAnswerInput';
import './AnswerSheet.css';

export default function AnswerSheet({ subjectId }) {
  const subject = SUBJECTS[subjectId];
  const {
    selectedAnswers,
    setAnswer,
    setTrueFalseAnswer,
    bookmarkedQuestions,
    toggleBookmark,
  } = useExamStore();

  if (!subject) return null;

  let questionNumber = 1;

  return (
    <div className="answer-sheet">
      {subject.parts.map((part) => {
        const partQuestions = [];

        for (let i = 0; i < part.count; i++) {
          const qNum = questionNumber;

          if (part.type === 'multiple_choice') {
            partQuestions.push(
              <MultipleChoiceQuestion
                key={qNum}
                number={qNum}
                answer={selectedAnswers[qNum]}
                isBookmarked={bookmarkedQuestions.has(qNum)}
                onSelect={(val) => setAnswer(qNum, val)}
                onToggleBookmark={() => toggleBookmark(qNum)}
              />
            );
          } else if (part.type === 'true_false') {
            partQuestions.push(
              <TrueFalseQuestion
                key={qNum}
                number={qNum}
                answer={selectedAnswers[qNum] || {}}
                isBookmarked={bookmarkedQuestions.has(qNum)}
                onSelect={(label, val) => setTrueFalseAnswer(qNum, label, val)}
                onToggleBookmark={() => toggleBookmark(qNum)}
              />
            );
          } else if (part.type === 'short_answer') {
            partQuestions.push(
              <ShortAnswerQuestion
                key={qNum}
                number={qNum}
                answer={selectedAnswers[qNum] || ''}
                isBookmarked={bookmarkedQuestions.has(qNum)}
                onChange={(val) => setAnswer(qNum, val)}
                onToggleBookmark={() => toggleBookmark(qNum)}
                subjectId={subjectId}
              />
            );
          }

          questionNumber++;
        }

        if (partQuestions.length === 0) return null;

        return (
          <div key={part.id} className="answer-sheet__part">
            <div className="answer-sheet__part-header">
              <h2 className="answer-sheet__part-title">{part.name}</h2>
              <span className="answer-sheet__part-desc">{part.description}</span>
            </div>
            <div className="answer-sheet__questions">
              {partQuestions}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* Multiple Choice Component */
function MultipleChoiceQuestion({ number, answer, onSelect, isBookmarked, onToggleBookmark }) {
  const options = ['A', 'B', 'C', 'D'];

  const handleSelect = (opt) => {
    onSelect(opt);
    // Auto-scroll to next
    const nextQ = document.getElementById(`question-${number + 1}`);
    if (nextQ) {
      setTimeout(() => nextQ.scrollIntoView({ behavior: 'smooth', block: 'center' }), 150);
    }
  };

  return (
    <div id={`question-${number}`} className={`question-item ${answer ? 'question-item--answered' : ''}`}>
      <div className="question-item__header">
        <span className="question-item__number">Câu {number}</span>
        <button
          className={`question-item__bookmark ${isBookmarked ? 'question-item__bookmark--active' : ''}`}
          onClick={onToggleBookmark}
          title="Đánh dấu câu này"
        >
          {isBookmarked ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
        </button>
      </div>
      <div className="mc-options">
        {options.map((opt) => (
          <button
            key={opt}
            className={`mc-option ${answer === opt ? 'mc-option--selected' : ''}`}
            onClick={() => handleSelect(opt)}
          >
            <span className="mc-option__letter">{opt}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* True/False Component */
function TrueFalseQuestion({ number, answer, onSelect, isBookmarked, onToggleBookmark }) {
  const labels = ['a', 'b', 'c', 'd'];
  const isFullyAnswered = Object.keys(answer).length === 4;

  const handleSelect = (label, val) => {
    onSelect(label, val);
    
    // Check if this is the last missing answer for this question
    const newAnswer = { ...answer, [label]: val };
    if (Object.keys(newAnswer).length === 4) {
      const nextQ = document.getElementById(`question-${number + 1}`);
      if (nextQ) {
        setTimeout(() => nextQ.scrollIntoView({ behavior: 'smooth', block: 'center' }), 200);
      }
    }
  };

  return (
    <div id={`question-${number}`} className={`question-item ${isFullyAnswered ? 'question-item--answered' : ''}`}>
      <div className="question-item__header">
        <span className="question-item__number">Câu {number}</span>
        <button
          className={`question-item__bookmark ${isBookmarked ? 'question-item__bookmark--active' : ''}`}
          onClick={onToggleBookmark}
          title="Đánh dấu câu này"
        >
          {isBookmarked ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
        </button>
      </div>
      <div className="tf-grid">
        <div className="tf-grid__header">
          <span></span>
          <span className="tf-grid__label">Đúng</span>
          <span className="tf-grid__label">Sai</span>
        </div>
        {labels.map((label) => (
          <div key={label} className="tf-row">
            <span className="tf-row__label">{label})</span>
            <button
              className={`tf-btn ${answer[label] === true ? 'tf-btn--selected tf-btn--true' : ''}`}
              onClick={() => handleSelect(label, true)}
            >
              Đ
            </button>
            <button
              className={`tf-btn ${answer[label] === false ? 'tf-btn--selected tf-btn--false' : ''}`}
              onClick={() => handleSelect(label, false)}
            >
              S
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* Short Answer Component */
function ShortAnswerQuestion({ number, answer, onChange, isBookmarked, onToggleBookmark, subjectId }) {
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      const nextQ = document.getElementById(`question-${number + 1}`);
      if (nextQ) {
        nextQ.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const input = nextQ.querySelector('input');
        if (input) input.focus();
      }
    }
  };

  return (
    <div id={`question-${number}`} className={`question-item ${answer ? 'question-item--answered' : ''}`}>
      <div className="question-item__header">
        <span className="question-item__number">Câu {number}</span>
        <button
          className={`question-item__bookmark ${isBookmarked ? 'question-item__bookmark--active' : ''}`}
          onClick={onToggleBookmark}
          title="Đánh dấu câu này"
        >
          {isBookmarked ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
        </button>
      </div>
      <div className="sa-input-wrap">
        <ShortAnswerInput
          value={answer}
          onChange={onChange}
          onKeyDown={handleKeyDown}
          subjectId={subjectId}
        />
      </div>
    </div>
  );
}
