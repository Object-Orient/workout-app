import Dexie from 'dexie';

export const db = new Dexie('WorkoutTracker');

db.version(1).stores({
  exercises:
    'id, name, muscle_group, movement_pattern, equipment',

  workouts:
    'id, started_at, completed_at',

  workout_exercises:
    'id, workout_id, exercise_id, position',

  sets:
    'id, workout_exercise_id, set_number, completed_at',
});
