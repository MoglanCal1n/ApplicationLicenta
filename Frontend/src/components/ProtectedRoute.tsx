import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { PageLoader } from './ui';

interface ProtectedRouteProps {
  /** If provided, only these roles can access the route */
  allowedRoles?: Array<'PATIENT' | 'DOCTOR' | 'ADMIN'>;
}

export default function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <PageLoader />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/ehealth/dashboard" replace />;
  }

  return <Outlet />;
}
