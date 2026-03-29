import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import TodayWorkout from './pages/TodayWorkout';
import ExerciseSelect from './pages/ExerciseSelect';
import ExerciseSets from './pages/ExerciseSets';
import History from './pages/History';
import WorkoutDetail from './pages/WorkoutDetail';
import './App.css';

function NavBar() {
  const location = useLocation();
  // Only show nav on main pages
  const showNav = location.pathname === '/' || location.pathname === '/history';
  if (!showNav) return null;

  return (
    <nav className="bottom-nav">
      <Link to="/" className={location.pathname === '/' ? 'active' : ''}>
        Workout
      </Link>
      <Link to="/history" className={location.pathname.startsWith('/history') ? 'active' : ''}>
        History
      </Link>
      <span style={{ position: 'absolute', bottom: 2, right: 6, fontSize: 9, color: '#333', pointerEvents: 'none' }}>v1.1.2</span>
    </nav>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <Routes>
          <Route path="/" element={<TodayWorkout />} />
          <Route path="/add-exercise" element={<ExerciseSelect />} />
          <Route path="/exercise/:workoutExerciseId" element={<ExerciseSets />} />
          <Route path="/history" element={<History />} />
          <Route path="/history/:workoutId" element={<WorkoutDetail />} />
        </Routes>
        <NavBar />
      </div>
    </BrowserRouter>
  );
}
