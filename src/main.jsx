import { StrictMode } from 'react';
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

// Register service worker for offline app shell caching
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js');
  });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
