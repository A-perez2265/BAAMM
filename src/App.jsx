import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ProfilePage from './pages/ProfilePage'
import SkillManagementPage from './pages/SkillManagementPage'
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
          <Route path="/login" element={<Navigate to="/" replace />} />
        </Routes>
      </Auth>
    </BrowserRouter>
  )
}

export default App
