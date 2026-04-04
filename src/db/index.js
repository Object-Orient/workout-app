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
    nameSuffix: false,
    tryUseServiceWorker: true,
    unsyncedTables: ['exercises'],
  });
}
