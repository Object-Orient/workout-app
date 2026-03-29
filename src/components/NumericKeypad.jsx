import { useEffect, useRef } from 'react';

export default function NumericKeypad({ value, onChange, onDone, onCancel, allowDecimal = true, label = '' }) {
  const overlayRef = useRef(null);

  useEffect(() => {
    // Prevent body scroll while keypad is open
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  function handleKey(key) {
    if (key === 'backspace') {
      onChange(value.slice(0, -1));
    } else if (key === '.') {
      if (allowDecimal && !value.includes('.')) {
        onChange(value + '.');
      }
    } else {
      onChange(value + key);
    }
  }

  function handleOverlayClick(e) {
    if (e.target === overlayRef.current) {
      onCancel();
    }
  }

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'backspace'];

  return (
    <div className="keypad-overlay" ref={overlayRef} onClick={handleOverlayClick}>
      <div className="keypad">
        <div className="keypad-display">
          {label && <span className="keypad-label">{label}</span>}
          <span className="keypad-value">{value || '0'}</span>
        </div>
        <div className="keypad-grid">
          {keys.map((key) => (
            <button
              key={key}
              className={`keypad-key${key === 'backspace' ? ' keypad-key-fn' : ''}${key === '.' && !allowDecimal ? ' keypad-key-disabled' : ''}`}
              onClick={() => key === '.' && !allowDecimal ? null : handleKey(key)}
              disabled={key === '.' && !allowDecimal}
            >
              {key === 'backspace' ? '⌫' : key}
            </button>
          ))}
        </div>
        <button className="keypad-done" onClick={onDone}>Done</button>
      </div>
    </div>
  );
}
