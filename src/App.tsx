import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useStore } from './store/useStore';
import { supabase } from './lib/supabase';
import LoginPage from './pages/LoginPage';
import ActivatePage from './pages/ActivatePage';
import Layout from './components/Layout';
import DashboardPage from './pages/DashboardPage';
import TeamsPage from './pages/TeamsPage';
import TeamDetailPage from './pages/TeamDetailPage';
import ProfilePage from './pages/ProfilePage';
import ImportPage from './pages/ImportPage';
import NotificationsPage from './pages/NotificationsPage';
import UsersPage from './pages/UsersPage';

function useHydrated() {
  const [hydrated, setHydrated] = useState(() => useStore.persist.hasHydrated());
  useEffect(() => {
    if (hydrated) return;
    // No Supabase → localStorage is sync, treat as immediately hydrated
    if (!supabase) { setHydrated(true); return; }
    if (useStore.persist.hasHydrated()) { setHydrated(true); return; }
    const unsub = useStore.persist.onFinishHydration(() => setHydrated(true));
    // Re-check in case hydration finished between the line above and this one
    if (useStore.persist.hasHydrated()) { unsub(); setHydrated(true); return; }
    // Fallback: never get stuck — force-unblock after 8 s
    const timer = setTimeout(() => { unsub(); setHydrated(true); }, 8000);
    return () => { unsub(); clearTimeout(timer); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return hydrated;
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const currentUser = useStore(s => s.currentUser);
  const hydrated = useHydrated();
  if (!hydrated) return null;
  if (!currentUser) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function RequireAdmin({ children }: { children: React.ReactNode }) {
  const currentUser = useStore(s => s.currentUser);
  const hydrated = useHydrated();
  if (!hydrated) return null;
  if (!currentUser) return <Navigate to="/" replace />;
  if (!['superadmin', 'admin', 'tech_teacher'].includes(currentUser.role)) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function RequireStaff({ children }: { children: React.ReactNode }) {
  const currentUser = useStore(s => s.currentUser);
  const hydrated = useHydrated();
  if (!hydrated) return null;
  if (!currentUser) return <Navigate to="/" replace />;
  if (!['superadmin', 'admin', 'tech_teacher', 'branch_teacher'].includes(currentUser.role)) return <Navigate to="/dashboard" replace />;
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
        <Route path="/teams/:slug" element={
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
        <Route path="/users" element={
          <RequireStaff><Layout><UsersPage /></Layout></RequireStaff>
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
