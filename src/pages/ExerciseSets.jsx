import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../db/index';
import {
  getExercise,
  getSetsForWorkoutExercise,
  getLastSessionSets,
  logSet,
  deleteSet,
  removeExerciseFromWorkout,
} from '../db/actions';
import ConfirmDialog from '../components/ConfirmDialog';
import NumericKeypad from '../components/NumericKeypad';

const REVEAL_WIDTH = 72;
const SNAP_THRESHOLD = 0.4;
const DELETE_THRESHOLD = 0.75;
const RESISTANCE_START = 0.6;

function SwipeableSetRow({ children, onDelete, setId, openSetId, setOpenSetId }) {
  const containerRef = useRef(null);
  const contentRef = useRef(null);
  const startX = useRef(0);
  const startY = useRef(0);
  const startOffset = useRef(0);
  const currentOffset = useRef(0);
  const direction = useRef(null);
  const rowWidth = useRef(0);
  const [revealed, setRevealed] = useState(false);

  // Close when another row opens
  useEffect(() => {
    if (openSetId !== setId && revealed) {
      animateTo(0);
      setRevealed(false);
    }
  }, [openSetId, setId, revealed]);

  function animateTo(target, then) {
    const el = contentRef.current;
    if (!el) return;
    el.style.transition = 'transform 0.2s ease';
    el.style.transform = `translateX(${target}px)`;
    currentOffset.current = target;
    if (then) setTimeout(then, 200);
    setTimeout(() => { if (el) el.style.transition = 'none'; }, 220);
  }

  function handleTouchStart(e) {
    if (openSetId && openSetId !== setId) {
      setOpenSetId(null);
    }
    const touch = e.touches[0];
    startX.current = touch.clientX;
    startY.current = touch.clientY;
    startOffset.current = currentOffset.current;
    direction.current = null;
    rowWidth.current = containerRef.current?.offsetWidth || 300;
    const el = contentRef.current;
    if (el) el.style.transition = 'none';
  }

  function handleTouchMove(e) {
    const touch = e.touches[0];
    const dx = touch.clientX - startX.current;
    const dy = touch.clientY - startY.current;

    if (!direction.current) {
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 5) {
        direction.current = 'h';
      } else if (Math.abs(dy) > 5) {
        direction.current = 'v';
        return;
      } else {
        return;
      }
    }
    if (direction.current === 'v') return;

    let newOffset = startOffset.current + dx;
    if (newOffset > 0) newOffset = 0;

    const absOffset = Math.abs(newOffset);
    const w = rowWidth.current;
    const resistStart = w * RESISTANCE_START;
    if (absOffset > resistStart) {
      const excess = absOffset - resistStart;
      newOffset = -(resistStart + excess * 0.3);
    }

    currentOffset.current = newOffset;
    const el = contentRef.current;
    if (el) el.style.transform = `translateX(${newOffset}px)`;
  }

  function handleTouchEnd() {
    if (direction.current !== 'h') return;
    const absOffset = Math.abs(currentOffset.current);
    const w = rowWidth.current;

    if (absOffset > w * DELETE_THRESHOLD) {
      animateTo(-w, onDelete);
    } else if (absOffset > w * SNAP_THRESHOLD) {
      animateTo(-REVEAL_WIDTH);
      setRevealed(true);
      setOpenSetId(setId);
    } else {
      animateTo(0);
      setRevealed(false);
      if (openSetId === setId) setOpenSetId(null);
    }
  }

  function handleDeleteTap() {
    const w = rowWidth.current || containerRef.current?.offsetWidth || 300;
    animateTo(-w, onDelete);
  }

  return (
    <div className="swipe-container" ref={containerRef}>
      <div className="swipe-delete-zone" onClick={handleDeleteTap}>
        ✕
      </div>
      <div
        ref={contentRef}
        className="swipe-content"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </div>
    </div>
  );
}

export default function ExerciseSets() {
  const { workoutExerciseId } = useParams();
  const navigate = useNavigate();
  const [exercise, setExercise] = useState(null);
  const [sets, setSets] = useState([]);
  const [ghostSets, setGhostSets] = useState([]);
  const [showRemove, setShowRemove] = useState(false);
  const [displayUnit, setDisplayUnit] = useState('lb');
  const [openSetId, setOpenSetId] = useState(null);

  // New set input values
  const [newWeight, setNewWeight] = useState('');
  const [newReps, setNewReps] = useState('');

  // Keypad state: { target, value } where target is 'weight' | 'reps'
  const [keypad, setKeypad] = useState(null);

  const loadData = useCallback(async () => {
    const we = await db.workout_exercises.get(workoutExerciseId);
    if (!we) return;
    const ex = await getExercise(we.exercise_id);
    setExercise(ex);
    const currentSets = await getSetsForWorkoutExercise(workoutExerciseId);
    setSets(currentSets);
    const lastSets = await getLastSessionSets(we.exercise_id);
    console.log('[ghost] getLastSessionSets result:', lastSets);
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
    const ghost = ghostCurrent;
    const w = newWeight || (ghost ? String(ghost.weight) : '');
    const r = newReps || (ghost ? String(ghost.reps) : '');
    await saveSet(w, r);
  }

  async function handleDeleteSet(setId) {
    await deleteSet(setId);
    setOpenSetId(null);
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
      setKeypad({ target: 'reps', value: newReps || '', allowDecimal: false });
      return;
    } else if (target === 'reps') {
      setKeypad(null);
      if (newWeight && value) {
        await saveSet(newWeight, value);
      } else {
        setNewReps(value);
      }
      return;
    }
    setKeypad(null);
  }

  function handleKeypadCancel() {
    setKeypad(null);
  }

  function convertWeight(weight, fromUnit) {
    const from = fromUnit || 'lb';
    if (displayUnit === from) return weight;
    if (displayUnit === 'kg') return Math.round((weight / 2.2046) * 10) / 10;
    return Math.round((weight * 2.2046) * 10) / 10;
  }

  function toggleUnit() {
    setDisplayUnit((u) => (u === 'lb' ? 'kg' : 'lb'));
  }

  const ghostCurrent = ghostSets[sets.length] || (sets.length > 0 ? sets[sets.length - 1] : null);
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

      <div className="sets-container">
        <div className="set-header">
          <span>Set</span>
          <span>Weight</span>
          <span>Reps</span>
        </div>

        {sets.map((s, i) => (
          <SwipeableSetRow
            key={s.id}
            setId={s.id}
            onDelete={() => handleDeleteSet(s.id)}
            openSetId={openSetId}
            setOpenSetId={setOpenSetId}
          >
            <div className="set-row logged">
              <span className="set-num">{i + 1}</span>
              <div className="cell cell-weight" onClick={toggleUnit}>
                {convertWeight(s.weight, s.weight_unit)} <span className="unit-label">{displayUnit}</span>
              </div>
              <div className="cell">{s.reps}</div>
            </div>
          </SwipeableSetRow>
        ))}

        {ghostExtras.map((g, i) => (
          <div key={`ghost-${i}`} className="set-row" style={{ opacity: 0.25 }}>
            <span className="set-num">{sets.length + i + 2}</span>
            <div className="cell">
              {convertWeight(g.weight, g.weight_unit)} <span className="unit-label">{displayUnit}</span>
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

      <div className="input-row">
        <div className="set-indicator">Set {nextSetNum}</div>
        <div
          className={`input-cell${newWeight ? '' : ghostCurrent ? ' ghost' : ' placeholder'}${keypad?.target === 'weight' ? ' active' : ''}`}
          onClick={() => openKeypad('weight', newWeight, true)}
        >
          {newWeight || (ghostCurrent ? `${ghostCurrent.weight} ${ghostCurrent.weight_unit || 'lb'}` : 'WEIGHT')}
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

      {keypad && (
        <NumericKeypad
          value={keypad.value}
          allowDecimal={keypad.allowDecimal}
          label={keypad.target === 'weight' ? 'Weight' : 'Reps'}
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
