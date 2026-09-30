import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ProfilePage from './pages/ProfilePage'
import SkillManagementPage from './pages/SkillManagementPage'
import SearchPage from './pages/SearchPage'
import RequestExchangePage from './pages/RequestExchangePage'
import AdminDashboard from './pages/AdminDashboard'
import Auth from './components/Auth'

function App() {
  return (
    <BrowserRouter>
      <Auth>
        <Routes>
          {/* Default home page */}
          <Route path="/" element={<SkillManagementPage />} />
          
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/skills" element={<SkillManagementPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/request" element={<RequestExchangePage />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/login" element={<Navigate to="/" replace />} />
        </Routes>
      </Auth>
    </BrowserRouter>
  )
}

export default App
