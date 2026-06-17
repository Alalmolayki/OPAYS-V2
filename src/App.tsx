import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useStore } from './store/useStore';
import LoginPage from './pages/LoginPage';
import ActivatePage from './pages/ActivatePage';
import Layout from './components/Layout';
import DashboardPage from './pages/DashboardPage';
import TeamsPage from './pages/TeamsPage';
import TeamDetailPage from './pages/TeamDetailPage';
import ProfilePage from './pages/ProfilePage';
import ImportPage from './pages/ImportPage';
import NotificationsPage from './pages/NotificationsPage';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const currentUser = useStore(s => s.currentUser);
  if (!currentUser) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function RequireAdmin({ children }: { children: React.ReactNode }) {
  const currentUser = useStore(s => s.currentUser);
  if (!currentUser) return <Navigate to="/" replace />;
  if (!['superadmin', 'admin', 'tech_teacher'].includes(currentUser.role)) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

export default function App() {
  const currentUser = useStore(s => s.currentUser);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={currentUser ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
        <Route path="/activate" element={<ActivatePage />} />
        <Route path="/dashboard" element={
          <RequireAuth><Layout><DashboardPage /></Layout></RequireAuth>
        } />
        <Route path="/teams" element={
          <RequireAuth><Layout><TeamsPage /></Layout></RequireAuth>
        } />
        <Route path="/teams/:id" element={
          <RequireAuth><Layout><TeamDetailPage /></Layout></RequireAuth>
        } />
        <Route path="/profile" element={
          <RequireAuth><Layout><ProfilePage /></Layout></RequireAuth>
        } />
        <Route path="/import" element={
          <RequireAdmin><Layout><ImportPage /></Layout></RequireAdmin>
        } />
        <Route path="/notifications" element={
          <RequireAuth><Layout><NotificationsPage /></Layout></RequireAuth>
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
