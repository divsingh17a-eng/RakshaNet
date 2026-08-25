import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

/**
 * Gates a route behind authentication and (optionally) a role allow-list.
 * The backend enforces RBAC on every request regardless (docs/API.md) - this
 * only prevents showing a control the API would reject anyway.
 */
export default function ProtectedRoute({ roles, children }) {
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const location = useLocation();

  if (!token || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }
  return children;
}
