import { db } from './index';
import exerciseLibrary from '../../data/exercise_library.json';

export async function seedExercises() {
  const count = await db.exercises.count();
  if (count > 0) return; // already seeded

  const now = new Date().toISOString();
  const exercises = exerciseLibrary.map((ex) => ({
    ...ex,
    created_at: now,
    updated_at: now,
  }));

  await db.exercises.bulkAdd(exercises);
  console.log(`Seeded ${exercises.length} exercises`);
}
