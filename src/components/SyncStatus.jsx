import { useState, useEffect } from 'react';
import { db } from '../db';

export default function SyncStatus() {
  const [user, setUser] = useState(null);
  const [syncState, setSyncState] = useState(null);
  const [open, setOpen] = useState(false);

  const cloudReady = !!db.cloud;

  useEffect(() => {
    if (!cloudReady) return;

    const subs = [];
    subs.push(db.cloud.currentUser.subscribe((u) => setUser(u)));
    subs.push(db.cloud.syncState.subscribe((s) => setSyncState(s)));

    return () => subs.forEach((s) => s.unsubscribe());
  }, [cloudReady]);

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

  async function handleLogin() {
    try {
      await db.cloud.login();
    } catch (err) {
      console.error('Login failed:', err);
    }
  }

  async function handleLogout() {
    try {
      await db.cloud.logout();
    } catch (err) {
      console.error('Logout failed:', err);
    }
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
          <div className="sync-panel-status">{statusLabel()}</div>
          {isLoggedIn && user.email && (
            <div className="sync-panel-email">{user.email}</div>
          )}
          {isLoggedIn ? (
            <button className="sync-panel-btn" onClick={handleLogout}>
              Log out
            </button>
          ) : (
            <button className="sync-panel-btn" onClick={handleLogin}>
              Sign in to sync
            </button>
          )}
        </div>
      )}

      {open && <div className="sync-overlay" onClick={() => setOpen(false)} />}
    </>
  );
}
