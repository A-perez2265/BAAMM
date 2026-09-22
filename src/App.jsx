import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ProfilePage from './pages/ProfilePage'
import SkillManagementPage from './pages/SkillManagementPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Default home page */}
        <Route path="/" element={<SkillManagementPage />} />
        
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/skills" element={<SkillManagementPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App