import React, { useRef, useEffect } from 'react';
import './ShortAnswerInput.css';

/**
 * ShortAnswerInput - A custom 4-box input for THPT Part III (Short Answer) questions.
 * Fits the real exam layout where answers have a maximum of 4 characters: digits, comma (,), or minus (-).
 * Supports auto-focus shifting, backspace navigation, arrow key navigation, and pasting.
 */
export default function ShortAnswerInput({
  value = '',
  onChange = () => {},
  disabled = false,
  subjectId = 'math',
  onKeyDown = () => {},
  compact = false
}) {
  const inputRefs = useRef([]);

  // Split string into exactly 4 characters, normalizing dots to commas
  const charArray = (value || '').toString().replace(/\./g, ',').slice(0, 4).split('');
  while (charArray.length < 4) {
    charArray.push('');
  }

  // Set reference for each input box
  const setRef = (el, index) => {
    inputRefs.current[index] = el;
  };

  const handleInputChange = (e, index) => {
    if (disabled) return;
    
    let char = e.target.value;
    
    // Auto convert dot to comma for decimal values
    if (char === '.') {
      char = ',';
    }

    // Allow only digits (0-9), comma (,), and minus (-)
    const isValidChar = /^[0-9,\-]$/.test(char);

    // If multiple characters (due to swift typing), take only the last one
    if (char.length > 1) {
      char = char.charAt(char.length - 1);
    }

    const newChars = [...charArray];

    if (char === '' || isValidChar) {
      newChars[index] = char;
      const newValue = newChars.join('').trim();
      onChange(newValue);

      // Auto-focus next box if a character is entered
      if (char !== '' && index < 3) {
        inputRefs.current[index + 1]?.focus();
        // Delay select to ensure value is updated
        setTimeout(() => {
          inputRefs.current[index + 1]?.select();
        }, 10);
      }
    }
  };

  const handleKeyDown = (e, index) => {
    if (disabled) return;

    if (e.key === 'Backspace') {
      // If current box is empty, clear previous box and focus it
      if (charArray[index] === '' && index > 0) {
        const newChars = [...charArray];
        newChars[index - 1] = '';
        const newValue = newChars.join('').trim();
        onChange(newValue);
        
        inputRefs.current[index - 1]?.focus();
        e.preventDefault();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
      inputRefs.current[index - 1]?.select();
      e.preventDefault();
    } else if (e.key === 'ArrowRight' && index < 3) {
      inputRefs.current[index + 1]?.focus();
      inputRefs.current[index + 1]?.select();
      e.preventDefault();
    } else {
      // Propagate keyboard events like Enter to parent
      onKeyDown(e);
    }
  };

  const handlePaste = (e) => {
    if (disabled) return;
    e.preventDefault();

    const pastedText = e.clipboardData.getData('text')
      .trim()
      .replace(/\./g, ',') // Convert dots to commas
      .slice(0, 4);

    // Clean pasted characters to only include valid symbols
    const cleanedChars = pastedText.split('').filter(c => /^[0-9,\-]$/.test(c));
    
    if (cleanedChars.length > 0) {
      const newChars = [...cleanedChars];
      while (newChars.length < 4) {
        newChars.push('');
      }
      
      const newValue = newChars.join('').trim();
      onChange(newValue);

      // Focus the appropriate input based on paste length
      const focusIndex = Math.min(cleanedChars.length, 3);
      inputRefs.current[focusIndex]?.focus();
    }
  };

  return (
    <div className={`sa-input-grid sa-input-grid--${subjectId} ${disabled ? 'sa-input-grid--disabled' : ''} ${compact ? 'sa-input-grid--compact' : ''}`}>
      {charArray.map((char, index) => (
        <input
          key={index}
          ref={(el) => setRef(el, index)}
          type="text"
          className="sa-input-box"
          value={char}
          onChange={(e) => handleInputChange(e, index)}
          onKeyDown={(e) => handleKeyDown(e, index)}
          onPaste={handlePaste}
          disabled={disabled}
          maxLength={1}
          inputMode="decimal"
          placeholder="•"
          autoComplete="off"
        />
      ))}
    </div>
  );
}
