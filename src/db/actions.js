import { v4 as uuid } from 'uuid';
import { db } from './index';

// ── Exercises ──────────────────────────────────────────────

export async function getAllExercises() {
  return db.exercises.orderBy('name').toArray();
}

export async function getExercise(id) {
  return db.exercises.get(id);
}

// ── Workouts ───────────────────────────────────────────────

export async function startWorkout(name = '') {
  const id = uuid();
  const now = new Date().toISOString();
  await db.workouts.add({
    id,
    name,
    started_at: now,
    completed_at: null,
    notes: '',
    created_at: now,
    updated_at: now,
  });
  return id;
}

export async function completeWorkout(workoutId) {
  const now = new Date().toISOString();
  await db.workouts.update(workoutId, {
    completed_at: now,
    updated_at: now,
  });
}

export async function updateWorkoutName(workoutId, name) {
  await db.workouts.update(workoutId, {
    name,
    updated_at: new Date().toISOString(),
  });
}

export async function getWorkout(id) {
  return db.workouts.get(id);
}

export async function getActiveWorkout() {
  const all = await db.workouts.toArray();
  return all.find((w) => !w.completed_at) || null;
}

export async function getAllWorkouts() {
  return db.workouts.orderBy('started_at').reverse().toArray();
}

// ── Workout Exercises ──────────────────────────────────────

export async function addExerciseToWorkout(workoutId, exerciseId) {
  const existing = await db.workout_exercises
    .where('workout_id')
    .equals(workoutId)
    .toArray();

  const id = uuid();
  const now = new Date().toISOString();
  await db.workout_exercises.add({
    id,
    workout_id: workoutId,
    exercise_id: exerciseId,
    position: existing.length + 1,
    notes: '',
    created_at: now,
    updated_at: now,
  });
  return id;
}

export async function getWorkoutExercises(workoutId) {
  return db.workout_exercises
    .where('workout_id')
    .equals(workoutId)
    .sortBy('position');
}

export async function removeExerciseFromWorkout(workoutExerciseId) {
  // remove sets first, then the workout_exercise
  await db.sets.where('workout_exercise_id').equals(workoutExerciseId).delete();
  await db.workout_exercises.delete(workoutExerciseId);
}

// ── Sets ───────────────────────────────────────────────────

export async function logSet(workoutExerciseId, { reps, weight, weight_unit = 'lb', notes = '' }) {
  const existing = await db.sets
    .where('workout_exercise_id')
    .equals(workoutExerciseId)
    .toArray();

  const id = uuid();
  const now = new Date().toISOString();
  await db.sets.add({
    id,
    workout_exercise_id: workoutExerciseId,
    set_number: existing.length + 1,
    reps,
    weight,
    weight_unit,
    completed_at: now,
    notes,
    created_at: now,
    updated_at: now,
  });
  return id;
}

export async function updateSet(setId, updates) {
  await db.sets.update(setId, {
    ...updates,
    updated_at: new Date().toISOString(),
  });
}

export async function deleteSet(setId) {
  await db.sets.delete(setId);
}

export async function getSetsForWorkoutExercise(workoutExerciseId) {
  return db.sets
    .where('workout_exercise_id')
    .equals(workoutExerciseId)
    .sortBy('set_number');
}

// ── Ghost Data ─────────────────────────────────────────────
// Returns last session's sets for a given exercise_id
// (looks for most recent completed workout containing that exercise)

export async function getLastSessionSets(exerciseId) {
  // Get all workout_exercises for this exercise, newest first
  const allWE = await db.workout_exercises
    .where('exercise_id')
    .equals(exerciseId)
    .toArray();

  if (allWE.length === 0) return [];

  // Get their parent workouts
  const workoutIds = [...new Set(allWE.map((we) => we.workout_id))];
  const workouts = await db.workouts.bulkGet(workoutIds);

  // Find the most recent *completed* workout that isn't the current one
  const completed = workouts
    .filter((w) => w && w.completed_at)
    .sort((a, b) => new Date(b.started_at) - new Date(a.started_at));

  if (completed.length === 0) return [];

  const lastWorkout = completed[0];
  const lastWE = allWE.find((we) => we.workout_id === lastWorkout.id);
  if (!lastWE) return [];

  return getSetsForWorkoutExercise(lastWE.id);
}

// ── Delete Workout (cascade) ───────────────────────────────

export async function deleteWorkout(workoutId) {
  const wExercises = await getWorkoutExercises(workoutId);
  for (const we of wExercises) {
    await db.sets.where('workout_exercise_id').equals(we.id).delete();
  }
  await db.workout_exercises.where('workout_id').equals(workoutId).delete();
  await db.workouts.delete(workoutId);
}

// ── Utility: full workout with exercises and sets ──────────

export async function getWorkoutFull(workoutId) {
  const workout = await getWorkout(workoutId);
  if (!workout) return null;

  const workoutExercises = await getWorkoutExercises(workoutId);

  const enriched = await Promise.all(
    workoutExercises.map(async (we) => {
      const exercise = await getExercise(we.exercise_id);
      const sets = await getSetsForWorkoutExercise(we.id);
      return { ...we, exercise, sets };
    })
  );

  return { ...workout, exercises: enriched };
}
