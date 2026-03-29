import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../db/index';
import {
  getExercise,
  getSetsForWorkoutExercise,
  getLastSessionSets,
  logSet,
  updateSet,
  removeExerciseFromWorkout,
} from '../db/actions';
import ConfirmDialog from '../components/ConfirmDialog';

export default function ExerciseSets() {
  const { workoutExerciseId } = useParams();
  const navigate = useNavigate();
  const [exercise, setExercise] = useState(null);
  const [sets, setSets] = useState([]);
  const [ghostSets, setGhostSets] = useState([]);
  const [editingSet, setEditingSet] = useState(null);
  const [showRemove, setShowRemove] = useState(false);
  const weightRef = useRef(null);
  const repsRef = useRef(null);

  const loadData = useCallback(async () => {
    const we = await db.workout_exercises.get(workoutExerciseId);
    if (!we) return;
    const ex = await getExercise(we.exercise_id);
    setExercise(ex);
    const currentSets = await getSetsForWorkoutExercise(workoutExerciseId);
    setSets(currentSets);
    const lastSets = await getLastSessionSets(we.exercise_id);
    setGhostSets(lastSets);
  }, [workoutExerciseId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleLog() {
    const weight = parseFloat(weightRef.current.value);
    const reps = parseInt(repsRef.current.value, 10);
    if (isNaN(weight) || isNaN(reps)) return;

    await logSet(workoutExerciseId, { reps, weight });
    weightRef.current.value = '';
    repsRef.current.value = '';
    await loadData();
    weightRef.current.focus();
  }

  async function handleEditSave(setId) {
    if (!editingSet) return;
    await updateSet(setId, {
      weight: editingSet.weight,
      reps: editingSet.reps,
    });
    setEditingSet(null);
    await loadData();
  }

  async function handleRemove() {
    await removeExerciseFromWorkout(workoutExerciseId);
    navigate('/');
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') handleLog();
  }

  // Ghost rows to show (only those beyond current sets)
  const ghostExtras = ghostSets.slice(sets.length);

  return (
    <div className="page">
      <div className="top-bar">
        <button className="back-btn" onClick={() => navigate('/')}>
          &#9664;
        </button>
        <h1>{exercise?.name || '...'}</h1>
        <button className="delete-btn" onClick={() => setShowRemove(true)} aria-label="Remove exercise">
          ✕
        </button>
      </div>

      {/* Logged sets grid */}
      <div className="sets-container">
        <div className="set-header">
          <span>Set</span>
          <span>Weight</span>
          <span>Reps</span>
        </div>

        {sets.map((s, i) => (
          <div
            key={s.id}
            className="set-row logged"
            onClick={() =>
              setEditingSet(
                editingSet?.id === s.id ? null : { id: s.id, weight: s.weight, reps: s.reps }
              )
            }
          >
            <span className="set-num">{i + 1}</span>
            {editingSet?.id === s.id ? (
              <>
                <div className="cell">
                  <input
                    type="number"
                    inputMode="decimal"
                    value={editingSet.weight}
                    onChange={(e) =>
                      setEditingSet((p) => ({ ...p, weight: parseFloat(e.target.value) || 0 }))
                    }
                    onBlur={() => handleEditSave(s.id)}
                    onClick={(e) => e.stopPropagation()}
                    autoFocus
                  />
                </div>
                <div className="cell">
                  <input
                    type="number"
                    inputMode="numeric"
                    value={editingSet.reps}
                    onChange={(e) =>
                      setEditingSet((p) => ({ ...p, reps: parseInt(e.target.value, 10) || 0 }))
                    }
                    onBlur={() => handleEditSave(s.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              </>
            ) : (
              <>
                <div className="cell">
                  {s.weight} <span className="unit-label">{s.weight_unit || 'lb'}</span>
                </div>
                <div className="cell">{s.reps}</div>
              </>
            )}
          </div>
        ))}

        {/* Ghost rows from last session */}
        {ghostExtras.map((g, i) => (
          <div key={`ghost-${i}`} className="set-row" style={{ opacity: 0.25 }}>
            <span className="set-num">{sets.length + i + 1}</span>
            <div className="cell">
              {g.weight} <span className="unit-label">{g.weight_unit || 'lb'}</span>
            </div>
            <div className="cell">{g.reps}</div>
          </div>
        ))}

        {sets.length === 0 && ghostExtras.length === 0 && (
          <div style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--gray-5)', fontSize: 13 }}>
            First time. Log your first set below.
          </div>
        )}
      </div>

      {/* Bottom input row */}
      <div className="input-row">
        <input
          ref={weightRef}
          type="number"
          inputMode="decimal"
          placeholder="Weight (lb)"
          onKeyDown={handleKeyDown}
        />
        <input
          ref={repsRef}
          type="number"
          inputMode="numeric"
          placeholder="Reps"
          onKeyDown={handleKeyDown}
        />
        <button className="log-btn" onClick={handleLog}>
          +
        </button>
      </div>

      <ConfirmDialog
        open={showRemove}
        title="Remove Exercise"
        message={`Remove ${exercise?.name || 'this exercise'}${sets.length > 0 ? ` and all ${sets.length} logged set${sets.length !== 1 ? 's' : ''}` : ''}?`}
        onConfirm={handleRemove}
        onCancel={() => setShowRemove(false)}
      />
    </div>
  );
}
