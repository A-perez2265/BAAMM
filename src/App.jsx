import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supabase } from './utils/supabaseClient';
import ProfilePage from './pages/ProfilePage'
import SkillManagementPage from './pages/SkillManagementPage'
import SearchPage from './pages/SearchPage'
import RequestExchangePage from './pages/RequestExchangePage'
import IncomingRequestsPage from './pages/IncomingRequestsPage'
import ConfirmExchangesPage from './pages/ConfirmExchangesPage'
import DashboardPage from './pages/DashboardPage'
import AdminDashboard from './pages/AdminDashboard'
import Auth from './components/Auth'
import PasswordRecoveryPage from './pages/PasswordRecoveryPage'

/**
 * AdminRoute — route-level guard that verifies admin status via the
 * server-side `is_admin()` RPC before rendering any admin content.
 *
 * Authorization is evaluated against app_metadata (set only by a
 * service-role key), so it cannot be spoofed via client-side session edits.
 * Non-admin users are immediately redirected to the dashboard.
 */
function AdminRoute() {
  const [status, setStatus] = useState('checking'); // 'checking' | 'authorized' | 'unauthorized'

  useEffect(() => {
    async function verifyAdmin() {
      try {
        const { data: adminFlag, error } = await supabase.rpc('is_admin');
        if (error || adminFlag !== true) {
          setStatus('unauthorized');
        } else {
          setStatus('authorized');
        }
      } catch {
        setStatus('unauthorized');
      }
    }
    verifyAdmin();
  }, []);

  if (status === 'checking') {
    // Brief check — render nothing to avoid a flash of admin content.
    return null;
  }

  if (status === 'unauthorized') {
    return <Navigate to="/" replace />;
  }

  return <AdminDashboard />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/forgot-password" element={<PasswordRecoveryPage key="request" mode="request" />} />
        <Route path="/reset-password" element={<PasswordRecoveryPage key="reset" mode="reset" />} />
        <Route path="*" element={
          <Auth>
            <Routes>
              <Route path="/" element={<DashboardPage />} />

              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/profile/:profileId" element={<ProfilePage />} />
              <Route path="/skills" element={<SkillManagementPage />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/request" element={<RequestExchangePage />} />
              <Route path="/incoming" element={<IncomingRequestsPage />} />
              <Route path="/confirm" element={<ConfirmExchangesPage />} />
              <Route path="/admin" element={<AdminRoute />} />
              <Route path="/login" element={<Navigate to="/" replace />} />
            </Routes>
          </Auth>
        } />
      </Routes>
    </BrowserRouter>
  )
}

export default App
