import Dexie from 'dexie';
import dexieCloud from 'dexie-cloud-addon';

const cloudUrl = import.meta.env.VITE_DEXIE_CLOUD_URL;

export const db = new Dexie('WorkoutTracker', cloudUrl ? { addons: [dexieCloud] } : undefined);

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

if (cloudUrl) {
  db.cloud.configure({
    databaseUrl: cloudUrl,
    requireAuth: false,
    customLoginGui: true,
    tryUseServiceWorker: false,
    unsyncedTables: ['exercises'],
  });
}

// One-time migration: copy data from old local-only DB to cloud-synced DB
export async function migrateFromOldDb() {
  if (!cloudUrl) return;
  if (localStorage.getItem('db-migrated')) return;

  try {
    const oldDb = new Dexie('WorkoutTracker');
    oldDb.version(1).stores({
      exercises: 'id, name, muscle_group, movement_pattern, equipment',
      workouts: 'id, started_at, completed_at',
      workout_exercises: 'id, workout_id, exercise_id, position',
      sets: 'id, workout_exercise_id, set_number, completed_at',
    });

    const exists = await Dexie.exists('WorkoutTracker');
    if (!exists) {
      localStorage.setItem('db-migrated', '1');
      return;
    }

    await oldDb.open();

    const workouts = await oldDb.workouts.toArray();
    const workoutExercises = await oldDb.workout_exercises.toArray();
    const sets = await oldDb.sets.toArray();

    if (workouts.length === 0 && sets.length === 0) {
      localStorage.setItem('db-migrated', '1');
      oldDb.close();
      return;
    }

    console.log(`[migrate] Found ${workouts.length} workouts, ${workoutExercises.length} workout_exercises, ${sets.length} sets`);

    // Insert into the cloud-synced DB
    if (workouts.length > 0) await db.workouts.bulkPut(workouts);
    if (workoutExercises.length > 0) await db.workout_exercises.bulkPut(workoutExercises);
    if (sets.length > 0) await db.sets.bulkPut(sets);

    console.log('[migrate] Migration complete');
    localStorage.setItem('db-migrated', '1');
    oldDb.close();
  } catch (err) {
    console.error('[migrate] Migration error:', err);
  }
}
