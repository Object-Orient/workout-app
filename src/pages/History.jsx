import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SyncStatus from '../components/SyncStatus';
import { getAllWorkouts, getWorkoutExercises } from '../db/actions';

export default function History() {
  const [workouts, setWorkouts] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const all = await getAllWorkouts();
      const completed = all.filter((w) => w.completed_at);
      const enriched = await Promise.all(
        completed.map(async (w) => {
          const exercises = await getWorkoutExercises(w.id);
          return { ...w, exerciseCount: exercises.length };
        })
      );
      setWorkouts(enriched);
    })();
  }, []);

  function formatDate(iso) {
    return new Date(iso).toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  }

  return (
    <div className="page">
      <div className="top-bar">
        <h1>History</h1>
        <SyncStatus />
      </div>

      <div className="page-scroll has-nav">
        {workouts.length === 0 ? (
          <div className="empty-state">
            <h2>No History Yet</h2>
            <p>Completed workouts will appear here.</p>
          </div>
        ) : (
          workouts.map((w) => (
            <div
              key={w.id}
              className="exercise-card"
              onClick={() => navigate(`/history/${w.id}`)}
            >
              <div>
                <div className="name">{w.name || 'Untitled'}</div>
                <div className="meta">
                  {formatDate(w.started_at)} &middot; {w.exerciseCount} exercise{w.exerciseCount !== 1 ? 's' : ''}
                </div>
              </div>
              <span className="arrow">&rsaquo;</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
