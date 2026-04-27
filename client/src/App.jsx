import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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
          <Route path="/admin/users/:userId/routines/:routineId/play" element={<ProtectedRoute adminOnly><Routine adminPlay /></ProtectedRoute>} />
          <Route path="/admin/users/:userId/stats" element={<ProtectedRoute adminOnly><UserStats /></ProtectedRoute>} />
          <Route path="/admin/users/:userId/generate" element={<ProtectedRoute adminOnly><GenerateRoutines /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
