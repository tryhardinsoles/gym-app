import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Login from './pages/Login.jsx';
import Home from './pages/Home.jsx';
import Routine from './pages/Routine.jsx';
import AdminLogin from './pages/admin/AdminLogin.jsx';
import AdminDashboard from './pages/admin/AdminDashboard.jsx';
import UserDetail from './pages/admin/UserDetail.jsx';
import RoutineEditor from './pages/admin/RoutineEditor.jsx';
import UserStats from './pages/admin/UserStats.jsx';
import GenerateRoutines from './pages/admin/GenerateRoutines.jsx';
import ImportFromSheets from './pages/admin/ImportFromSheets.jsx';
import Agenda from './pages/Agenda.jsx';
import AdminAgenda from './pages/admin/AdminAgenda.jsx';
import Performance from './pages/Performance.jsx';
import Achievements from './pages/Achievements.jsx';
import Settings from './pages/Settings.jsx';

function AdminPlayRoute() {
  const { routineId } = useParams();
  return <Routine key={routineId} adminPlay />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
          <Route path="/routine" element={<ProtectedRoute><Routine /></ProtectedRoute>} />
          <Route path="/admin" element={<AdminLogin />} />
          <Route path="/admin/dashboard" element={<ProtectedRoute adminOnly><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/users/:userId" element={<ProtectedRoute adminOnly><UserDetail /></ProtectedRoute>} />
          <Route path="/admin/users/:userId/routines/new" element={<ProtectedRoute adminOnly><RoutineEditor /></ProtectedRoute>} />
          <Route path="/admin/users/:userId/routines/:routineId" element={<ProtectedRoute adminOnly><RoutineEditor /></ProtectedRoute>} />
          <Route path="/admin/users/:userId/routines/:routineId/play" element={<ProtectedRoute adminOnly><AdminPlayRoute /></ProtectedRoute>} />
          <Route path="/admin/users/:userId/stats" element={<ProtectedRoute adminOnly><UserStats /></ProtectedRoute>} />
          <Route path="/admin/users/:userId/generate" element={<ProtectedRoute adminOnly><GenerateRoutines /></ProtectedRoute>} />
          <Route path="/admin/import-sheets" element={<ProtectedRoute adminOnly><ImportFromSheets /></ProtectedRoute>} />
          <Route path="/admin/agenda" element={<ProtectedRoute adminOnly><AdminAgenda /></ProtectedRoute>} />
          <Route path="/agenda" element={<ProtectedRoute><Agenda /></ProtectedRoute>} />
          <Route path="/performance" element={<ProtectedRoute><Performance /></ProtectedRoute>} />
          <Route path="/achievements" element={<ProtectedRoute><Achievements /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
