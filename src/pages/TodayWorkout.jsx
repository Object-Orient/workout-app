import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  startWorkout,
  getWorkout,
  getActiveWorkout,
  getWorkoutExercises,
  getExercise,
  getSetsForWorkoutExercise,
  completeWorkout,
  updateWorkoutName,
} from '../db/actions';

export default function TodayWorkout() {
  const [workoutId, setWorkoutId] = useState(() => localStorage.getItem('activeWorkoutId'));
  const [workout, setWorkout] = useState(null);
  const [exercises, setExercises] = useState([]);
  const navigate = useNavigate();

  const loadExercises = useCallback(async (wId) => {
    const wExercises = await getWorkoutExercises(wId);
    const enriched = await Promise.all(
      wExercises.map(async (we) => {
        const exercise = await getExercise(we.exercise_id);
        const sets = await getSetsForWorkoutExercise(we.id);
        return { ...we, exercise, sets };
      })
    );
    setExercises(enriched);
  }, []);

  useEffect(() => {
    (async () => {
      // Try localStorage first
      if (workoutId) {
        const w = await getWorkout(workoutId);
        if (w && !w.completed_at) {
          setWorkout(w);
          await loadExercises(workoutId);
          return;
        }
      }
      // Crash recovery: check DB for any active workout
      const active = await getActiveWorkout();
      if (active) {
        localStorage.setItem('activeWorkoutId', active.id);
        setWorkoutId(active.id);
        setWorkout(active);
        await loadExercises(active.id);
        return;
      }
      // No active workout
      setWorkoutId(null);
      setWorkout(null);
      setExercises([]);
      localStorage.removeItem('activeWorkoutId');
    })();
  }, [workoutId, loadExercises]);

  async function handleStartWorkout() {
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yyyy = now.getFullYear();
    const name = `${dd}-${mm}-${yyyy}`;
    const id = await startWorkout(name);
    localStorage.setItem('activeWorkoutId', id);
    setWorkoutId(id);
  }

  async function handleFinishWorkout() {
    if (!workoutId) return;
    await completeWorkout(workoutId);
    localStorage.removeItem('activeWorkoutId');
    setWorkoutId(null);
    setWorkout(null);
    setExercises([]);
    navigate('/history');
  }

  async function handleNameChange(e) {
    const name = e.target.value;
    setWorkout((prev) => ({ ...prev, name }));
    await updateWorkoutName(workoutId, name);
  }

  if (!workout) {
    return (
      <div className="page">
        <div className="top-bar">
          <h1>Workout</h1>
        </div>
        <div className="page-scroll has-nav">
          <div className="empty-state">
            <h2>No Active Workout</h2>
            <p>Start a new session to begin logging.</p>
            <button
              className="btn btn-fill"
              style={{ marginTop: 24 }}
              onClick={handleStartWorkout}
            >
              Start Workout
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="top-bar">
        <input
          className="workout-name"
          value={workout.name}
          onChange={handleNameChange}
          placeholder="Today's Workout"
        />
        <button onClick={handleFinishWorkout}>Finish</button>
      </div>

      <div className="page-scroll has-nav">
        {exercises.map((we) => (
          <div
            key={we.id}
            className="exercise-card"
            onClick={() => navigate(`/exercise/${we.id}`)}
          >
            <div>
              <div className="name">{we.exercise?.name}</div>
              <div className="meta">
                {we.sets.length} set{we.sets.length !== 1 ? 's' : ''}
                {we.sets.length > 0 && (
                  <> &middot; {we.sets.map((s) => `${s.weight}×${s.reps}`).join(', ')}</>
                )}
              </div>
            </div>
            <span className="arrow">&rsaquo;</span>
          </div>
        ))}

        <div className={exercises.length === 0 ? 'add-exercise-area empty' : 'add-exercise-area'}>
          <Link to="/add-exercise" className="add-exercise-btn" aria-label="Add exercise">
            <span className="plus">+</span>
          </Link>
          {exercises.length === 0 && (
            <p className="add-exercise-hint">Add your first exercise</p>
          )}
        </div>
      </div>
    </div>
  );
}
