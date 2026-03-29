import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllExercises, addExerciseToWorkout } from '../db/actions';

export default function ExerciseSelect() {
  const [exercises, setExercises] = useState([]);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const workoutId = localStorage.getItem('activeWorkoutId');

  useEffect(() => {
    getAllExercises().then(setExercises);
  }, []);

  const filtered = exercises.filter((ex) => {
    const q = search.toLowerCase();
    return (
      ex.name.toLowerCase().includes(q) ||
      ex.muscle_group.toLowerCase().includes(q) ||
      (ex.aliases || []).some((a) => a.toLowerCase().includes(q))
    );
  });

  async function handleSelect(exerciseId) {
    if (!workoutId) return;
    await addExerciseToWorkout(workoutId, exerciseId);
    navigate('/');
  }

  return (
    <div className="page">
      <div className="top-bar">
        <button className="back-btn" onClick={() => navigate(-1)}>
          &#9664;
        </button>
        <h1>Add Exercise</h1>
        <div style={{ width: 32 }} />
      </div>

      <input
        className="search-bar"
        placeholder="Search..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        autoFocus
      />

      {filtered.map((ex) => (
        <div key={ex.id} className="exercise-card" onClick={() => handleSelect(ex.id)}>
          <div>
            <div className="name">{ex.name}</div>
            <div className="meta">{ex.equipment} &middot; {ex.muscle_group}</div>
          </div>
          <span className="tag">{ex.muscle_group}</span>
        </div>
      ))}

      {filtered.length === 0 && (
        <div className="empty-state">
          <p>No match for "{search}"</p>
        </div>
      )}
    </div>
  );
}
