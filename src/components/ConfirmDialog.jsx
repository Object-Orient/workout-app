import { useEffect, useRef } from 'react';

export default function ConfirmDialog({ open, title, message, onConfirm, onCancel }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    if (open) {
      dialogRef.current?.focus();
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="dialog-overlay" onClick={onCancel} ref={dialogRef} tabIndex={-1}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-title">{title}</div>
        <div className="dialog-message">{message}</div>
        <div className="dialog-actions">
          <button className="btn dialog-cancel" onClick={onCancel}>Cancel</button>
          <button className="btn btn-fill dialog-confirm" onClick={onConfirm}>Delete</button>
        </div>
      </div>
    </div>
  );
}
