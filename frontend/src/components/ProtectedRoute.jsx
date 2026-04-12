import { Navigate } from 'react-router-dom';

export default function ProtectedRoute({ children, requiredRole }) {
  const token = localStorage.getItem('token');
  const userRole = localStorage.getItem('role');

  if (!token) {
    return <Navigate to="/" replace />;
  }

  // If a specific role is required, enforce it
  if (requiredRole && userRole !== requiredRole) {
    // Determine the fallback route based on their actual role
    const fallbackPath = userRole === 'admin' ? '/admin/analytics' : '/dashboard/map';
    return <Navigate to={fallbackPath} replace />;
  }

  return children;
}
