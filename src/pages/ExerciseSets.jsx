import { useState, useEffect, useCallback } from 'react';
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
import NumericKeypad from '../components/NumericKeypad';

export default function ExerciseSets() {
  const { workoutExerciseId } = useParams();
  const navigate = useNavigate();
  const [exercise, setExercise] = useState(null);
  const [sets, setSets] = useState([]);
  const [ghostSets, setGhostSets] = useState([]);
  const [editingSet, setEditingSet] = useState(null);
  const [showRemove, setShowRemove] = useState(false);

  // New set input values
  const [newWeight, setNewWeight] = useState('');
  const [newReps, setNewReps] = useState('');

  // Keypad state: { target, value } where target is 'weight' | 'reps' | 'edit-weight' | 'edit-reps'
  const [keypad, setKeypad] = useState(null);

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

  async function saveSet(weightStr, repsStr) {
    const weight = parseFloat(weightStr);
    const reps = parseInt(repsStr, 10);
    if (isNaN(weight) || isNaN(reps)) return;
    await logSet(workoutExerciseId, { reps, weight });
    setNewWeight('');
    setNewReps('');
    await loadData();
  }

  // "+" button: accept ghost data as-is, or save if both fields filled
  async function handleQuickLog() {
    const ghost = ghostSets[sets.length];
    const w = newWeight || (ghost ? String(ghost.weight) : '');
    const r = newReps || (ghost ? String(ghost.reps) : '');
    await saveSet(w, r);
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

  function openKeypad(target, currentValue, allowDecimal) {
    setKeypad({ target, value: String(currentValue || ''), allowDecimal });
  }

  async function handleKeypadDone() {
    if (!keypad) return;
    const { target, value } = keypad;

    if (target === 'weight') {
      setNewWeight(value);
      // Auto-advance to reps
      setKeypad({ target: 'reps', value: newReps || '', allowDecimal: false });
      return;
    } else if (target === 'reps') {
      setKeypad(null);
      // Auto-save if both weight and reps are filled
      if (newWeight && value) {
        await saveSet(newWeight, value);
      } else {
        setNewReps(value);
      }
      return;
    } else if (target === 'edit-weight' && editingSet) {
      setEditingSet((p) => ({ ...p, weight: parseFloat(value) || 0 }));
    } else if (target === 'edit-reps' && editingSet) {
      setEditingSet((p) => ({ ...p, reps: parseInt(value, 10) || 0 }));
    }
    setKeypad(null);
  }

  function handleKeypadCancel() {
    setKeypad(null);
  }

  // Ghost data for the set currently being filled
  const ghostCurrent = ghostSets[sets.length];
  // Ghost rows to show (skip current set's ghost since it's in the input bar)
  const ghostExtras = ghostSets.slice(sets.length + 1);
  const nextSetNum = sets.length + 1;

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
                <div
                  className="cell cell-input active"
                  onClick={(e) => { e.stopPropagation(); openKeypad('edit-weight', editingSet.weight, true); }}
                >
                  {editingSet.weight || '0'}
                </div>
                <div
                  className="cell cell-input active"
                  onClick={(e) => { e.stopPropagation(); openKeypad('edit-reps', editingSet.reps, false); }}
                >
                  {editingSet.reps || '0'}
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

        {sets.length === 0 && !ghostCurrent && ghostExtras.length === 0 && (
          <div style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--gray-5)', fontSize: 13 }}>
            First time. Log your first set below.
          </div>
        )}
      </div>

      {/* Bottom input row — tap to open keypad */}
      <div className="input-row">
        <div className="set-indicator">Set {nextSetNum}</div>
        <div
          className={`input-cell${newWeight ? '' : ghostCurrent ? ' ghost' : ' placeholder'}${keypad?.target === 'weight' ? ' active' : ''}`}
          onClick={() => openKeypad('weight', newWeight, true)}
        >
          {newWeight || (ghostCurrent ? String(ghostCurrent.weight) : 'WEIGHT')}
        </div>
        <div
          className={`input-cell${newReps ? '' : ghostCurrent ? ' ghost' : ' placeholder'}${keypad?.target === 'reps' ? ' active' : ''}`}
          onClick={() => openKeypad('reps', newReps, false)}
        >
          {newReps || (ghostCurrent ? String(ghostCurrent.reps) : 'REPS')}
        </div>
        <button className="log-btn" onClick={handleQuickLog}>
          +
        </button>
      </div>

      {/* Save edits when tapping away from an editing row */}
      {editingSet && !keypad && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 5 }}
          onClick={() => handleEditSave(editingSet.id)}
        />
      )}

      {keypad && (
        <NumericKeypad
          value={keypad.value}
          allowDecimal={keypad.allowDecimal}
          label={keypad.target === 'weight' || keypad.target === 'edit-weight' ? 'Weight' : 'Reps'}
          onChange={(v) => setKeypad((p) => ({ ...p, value: v }))}
          onDone={handleKeypadDone}
          onCancel={handleKeypadCancel}
        />
      )}

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
