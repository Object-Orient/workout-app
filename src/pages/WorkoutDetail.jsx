import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getWorkoutFull, deleteWorkout } from '../db/actions';
import ConfirmDialog from '../components/ConfirmDialog';

function formatDuration(startIso, endIso) {
  const ms = new Date(endIso) - new Date(startIso);
  const totalMin = Math.round(ms / 60000);
  if (totalMin < 60) return `${totalMin}m`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export default function WorkoutDetail() {
  const { workoutId } = useParams();
  const navigate = useNavigate();
  const [workout, setWorkout] = useState(null);
  const [showDelete, setShowDelete] = useState(false);

  useEffect(() => {
    getWorkoutFull(workoutId).then(setWorkout);
  }, [workoutId]);

  async function handleDelete() {
    await deleteWorkout(workoutId);
    navigate('/history');
  }

  function formatDate(iso) {
    return new Date(iso).toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  }

  if (!workout) return <div className="page" />;

  return (
    <div className="page">
      <div className="top-bar">
        <button className="back-btn" onClick={() => navigate('/history')}>
          &#9664;
        </button>
        <h1>{workout.name || 'Untitled'}</h1>
        <button className="delete-btn" onClick={() => setShowDelete(true)} aria-label="Delete workout">
          ✕
        </button>
      </div>

      <div className="detail-meta">
        <span>
          {new Date(workout.started_at).toLocaleDateString(undefined, {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </span>
        {workout.completed_at && (
          <span>{formatDuration(workout.started_at, workout.completed_at)}</span>
        )}
      </div>

      {workout.exercises.length === 0 ? (
        <div className="empty-state">
          <p>No exercises in this workout.</p>
        </div>
      ) : (
        workout.exercises.map((we) => (
          <div key={we.id}>
            <div style={{ padding: '12px 16px', fontWeight: 700, fontSize: 14, letterSpacing: '0.5px', borderBottom: '1px solid var(--border)', background: 'var(--gray-2)' }}>
              {we.exercise?.name}
            </div>
            <div className="set-header">
              <span>Set</span>
              <span>Weight</span>
              <span>Reps</span>
            </div>
            {we.sets.map((s, i) => (
              <div key={s.id} className="set-row">
                <span className="set-num">{i + 1}</span>
                <div className="cell">
                  {s.weight} <span className="unit-label">{s.weight_unit || 'lb'}</span>
                </div>
                <div className="cell">{s.reps}</div>
              </div>
            ))}
          </div>
        ))
      )}

      <ConfirmDialog
        open={showDelete}
        title="Delete Workout"
        message={`Delete "${workout.name || 'Untitled'}" from ${formatDate(workout.started_at)}? This cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setShowDelete(false)}
      />
    </div>
  );
}
