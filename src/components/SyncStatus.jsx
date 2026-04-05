import { useState, useEffect, useRef } from 'react';
import { db } from '../db';

export default function SyncStatus() {
  const [user, setUser] = useState(null);
  const [syncState, setSyncState] = useState(null);
  const [open, setOpen] = useState(false);
  const [interaction, setInteraction] = useState(null);
  const [inputVal, setInputVal] = useState('');
  const inputRef = useRef(null);

  const cloudReady = !!db.cloud;

  useEffect(() => {
    if (!cloudReady) return;

    const subs = [];
    subs.push(
      db.cloud.currentUser.subscribe((u) => setUser(u))
    );
    subs.push(
      db.cloud.syncState.subscribe((s) => setSyncState(s))
    );
    subs.push(
      db.cloud.userInteraction.subscribe((ia) => {
        setInteraction(ia);
        setInputVal('');
        if (ia) setOpen(true);
      })
    );

    return () => subs.forEach((s) => s.unsubscribe());
  }, [cloudReady]);

  useEffect(() => {
    if (interaction && inputRef.current) {
      inputRef.current.focus();
    }
  }, [interaction]);

  if (!cloudReady) return null;

  const isLoggedIn = user && user.userId !== 'unauthorized';
  const phase = syncState?.phase;

  function statusDot() {
    if (!isLoggedIn) return '○';
    if (phase === 'pushing' || phase === 'pulling') return '◑';
    if (phase === 'in-sync') return '●';
    if (phase === 'error') return '○';
    return '◐';
  }

  function statusLabel() {
    if (!isLoggedIn) return 'Not signed in';
    if (phase === 'pushing' || phase === 'pulling') return 'Syncing…';
    if (phase === 'in-sync') return 'Synced';
    if (phase === 'error') return 'Sync error';
    if (phase === 'offline') return 'Offline';
    return 'Connecting…';
  }

  function handleInteractionSubmit(e) {
    e.preventDefault();
    if (!interaction) return;

    const fields = {};
    const fieldKeys = Object.keys(interaction.fields || {});
    if (fieldKeys.length > 0) {
      fields[fieldKeys[0]] = inputVal;
    }
    interaction.onSubmit(fields);
    setInteraction(null);
    setInputVal('');
  }

  function handleInteractionCancel() {
    if (interaction) interaction.onCancel();
    setInteraction(null);
    setInputVal('');
  }

  function renderPanelContent() {
    if (interaction) {
      const fieldKeys = Object.keys(interaction.fields || {});
      const field = fieldKeys.length > 0 ? interaction.fields[fieldKeys[0]] : null;

      return (
        <>
          <div className="sync-panel-status">{interaction.title || 'Sign in'}</div>
          {interaction.alerts?.map((a, i) => (
            <div key={i} className="sync-panel-alert">{a.message}</div>
          ))}
          <form onSubmit={handleInteractionSubmit} className="sync-panel-form">
            {field && (
              <input
                ref={inputRef}
                className="sync-panel-input"
                type={field.type || 'text'}
                placeholder={field.placeholder || ''}
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                autoComplete={field.type === 'email' ? 'email' : 'off'}
              />
            )}
            <div className="sync-panel-actions">
              <button type="submit" className="sync-panel-btn">
                {interaction.submitLabel || 'Submit'}
              </button>
              <button type="button" className="sync-panel-btn sync-panel-btn-cancel" onClick={handleInteractionCancel}>
                {interaction.cancelLabel || 'Cancel'}
              </button>
            </div>
          </form>
        </>
      );
    }

    return (
      <>
        <div className="sync-panel-status">{statusLabel()}</div>
        {isLoggedIn && user.email && (
          <div className="sync-panel-email">{user.email}</div>
        )}
        {isLoggedIn ? (
          <button className="sync-panel-btn" onClick={() => { db.cloud.logout(); setOpen(false); }}>
            Log out
          </button>
        ) : (
          <button className="sync-panel-btn" onClick={() => db.cloud.login()}>
            Sign in to sync
          </button>
        )}
      </>
    );
  }

  return (
    <>
      <button
        className="sync-btn"
        onClick={() => setOpen(!open)}
        aria-label="Sync status"
      >
        <span className={`sync-dot ${isLoggedIn && phase === 'in-sync' ? 'synced' : ''}`}>
          {statusDot()}
        </span>
      </button>

      {open && (
        <div className="sync-panel">
          {renderPanelContent()}
        </div>
      )}

      {open && !interaction && <div className="sync-overlay" onClick={() => setOpen(false)} />}
    </>
  );
}
