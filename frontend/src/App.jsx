// frontend/src/App.jsx
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import RoleSelection from './pages/RoleSelection.jsx';
import UserLogin from './pages/UserLogin.jsx';
import UserRegister from './pages/UserRegister.jsx';
import AdminLogin from './pages/AdminLogin.jsx';
import AdminRegister from './pages/AdminRegister.jsx';
import Dashboard from './pages/Dashboard.jsx';
import AdminUpload from './pages/AdminUpload.jsx';

import LandingPage from './pages/LandingPage.jsx';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/get-started" element={<RoleSelection />} />
        <Route path="/login-user" element={<UserLogin />} />
        <Route path="/register-user" element={<UserRegister />} />
        <Route path="/login-admin" element={<AdminLogin />} />
        <Route path="/register-admin" element={<AdminRegister />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/admin" element={<AdminUpload />} />
      </Routes>
    </Router>
  );
}
