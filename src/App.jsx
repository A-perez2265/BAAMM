import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ProfilePage from './pages/ProfilePage'
import SkillManagementPage from './pages/SkillManagementPage'
import SearchPage from './pages/SearchPage'
import RequestExchangePage from './pages/RequestExchangePage'
import IncomingRequestsPage from './pages/IncomingRequestsPage'
import ConfirmExchangesPage from './pages/ConfirmExchangesPage'
import AdminDashboard from './pages/AdminDashboard'
import Auth from './components/Auth'
import PasswordRecoveryPage from './pages/PasswordRecoveryPage'
import DashboardPage from './pages/DashboardPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/forgot-password" element={<PasswordRecoveryPage key="request" mode="request" />} />
        <Route path="/reset-password" element={<PasswordRecoveryPage key="reset" mode="reset" />} />
        <Route path="*" element={
          <Auth>
            <Routes>
              {/* Default home page points to Dashboard */}
              <Route path="/" element={<DashboardPage />} /> 

              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/profile/:profileId" element={<ProfilePage />} />
              <Route path="/skills" element={<SkillManagementPage />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/request" element={<RequestExchangePage />} />
              <Route path="/incoming" element={<IncomingRequestsPage />} />
              <Route path="/confirm" element={<ConfirmExchangesPage />} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/login" element={<Navigate to="/" replace />} />
            </Routes>
          </Auth>
        } />
      </Routes>
    </BrowserRouter>
  )
}

export default App