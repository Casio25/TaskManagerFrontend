import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../lib/auth';

export default function ProtectedRoute() {
  const { user, loading } = useAuth();
  if (loading) return null; // could render a loader
  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
}

