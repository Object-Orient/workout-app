import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import { seedExercises } from './db/seed';
import { db, migrateFromOldDb } from './db/index';
import * as actions from './db/actions';

// Seed exercise library on first load
seedExercises();

// Migrate data from old local-only DB to cloud-synced DB
migrateFromOldDb();

// Expose DB and actions on window for console testing
window.db = db;
window.actions = actions;

// Register service worker — auto-reload when a new version takes control
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js');
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload();
    });
  });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
