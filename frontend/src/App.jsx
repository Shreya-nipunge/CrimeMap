// frontend/src/App.jsx
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import RoleSelection from './pages/RoleSelection.jsx';
import UserLogin from './pages/UserLogin.jsx';
import UserRegister from './pages/UserRegister.jsx';
import AdminLogin from './pages/AdminLogin.jsx';
import AdminRegister from './pages/AdminRegister.jsx';

import LandingPage from './pages/LandingPage.jsx';

// Core Dashboard Structure
import DashboardLayout from './layouts/DashboardLayout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';

// User Views
import MapPage from './pages/dashboard/MapPage.jsx';
import ReportPage from './pages/dashboard/ReportPage.jsx';
import NewsPage from './pages/dashboard/NewsPage.jsx';
import MyComplaintsPage from './pages/dashboard/MyComplaintsPage.jsx';

// Admin Views
import AnalyticsPage from './pages/admin/AnalyticsPage.jsx';
import AdminComplaintsPage from './pages/admin/AdminComplaintsPage.jsx';

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
        
        {/* Legacy redirect */}
        <Route path="/dashboard" element={<Navigate to="/dashboard/map" replace />} />
        <Route path="/admin" element={<Navigate to="/admin/analytics" replace />} />

        {/* Dashboard Layout - User Space */}
        <Route path="/dashboard" element={<ProtectedRoute requiredRole="user"><DashboardLayout /></ProtectedRoute>}>
          <Route path="map" element={<MapPage />} />
          <Route path="report" element={<ReportPage />} />
          <Route path="news" element={<NewsPage />} />
          <Route path="my-reports" element={<MyComplaintsPage />} />
        </Route>

        {/* Dashboard Layout - Admin Space */}
        <Route path="/admin" element={<ProtectedRoute requiredRole="admin"><DashboardLayout /></ProtectedRoute>}>
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="complaints" element={<AdminComplaintsPage />} />
        </Route>
      </Routes>
    </Router>
  );
}
