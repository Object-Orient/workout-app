import { StrictMode, useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import { seedExercises } from './db/seed';
import { db } from './db/index';
import * as actions from './db/actions';

// Seed exercise library on first load
seedExercises();

// Expose DB and actions on window for console testing
window.db = db;
window.actions = actions;

// ── Service Worker Registration ───────────────────────────────
let swWaiting = null;
const swListeners = new Set();

function notifyListeners() {
  swListeners.forEach((fn) => fn(swWaiting));
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    const reg = await navigator.serviceWorker.register('/sw.js');

    // If there's already a waiting worker (e.g. from a previous visit)
    if (reg.waiting) {
      swWaiting = reg.waiting;
      notifyListeners();
    }

    // Detect when a new worker finishes installing and starts waiting
    reg.addEventListener('updatefound', () => {
      const newWorker = reg.installing;
      if (!newWorker) return;
      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          swWaiting = newWorker;
          notifyListeners();
        }
      });
    });

    // When the new SW takes over, reload to get fresh assets
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload();
    });
  });
}

export function skipWaiting() {
  if (swWaiting) {
    swWaiting.postMessage({ type: 'SKIP_WAITING' });
  }
}

export function onSwUpdate(fn) {
  swListeners.add(fn);
  // If already waiting, notify immediately
  if (swWaiting) fn(swWaiting);
  return () => swListeners.delete(fn);
}

// ── Update Banner Component ───────────────────────────────────
function UpdateBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    return onSwUpdate((waiting) => {
      if (waiting) setShow(true);
    });
  }, []);

  if (!show) return null;

  return (
    <div
      onClick={() => skipWaiting()}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        background: '#fff',
        color: '#000',
        textAlign: 'center',
        padding: '12px 16px',
        fontSize: 14,
        fontWeight: 600,
        cursor: 'pointer',
        letterSpacing: '0.02em',
      }}
    >
      Update available — tap to refresh
    </div>
  );
}

// ── Render ────────────────────────────────────────────────────
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <UpdateBanner />
    <App />
  </StrictMode>
);
