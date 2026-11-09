import { Navigate } from 'react-router-dom';
import useAuth from '../lib/use-auth';

interface ProtectedRouteProps {
  children: JSX.Element;
  allowedRoles: string[]; 
}

const ProtectedRoute = ({ children, allowedRoles  }: ProtectedRouteProps) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (!user.role_name || !allowedRoles.includes(user.role_name)) {
    return <Navigate to="/dashboard" />;
  }

  return children;
};

export default ProtectedRoute;
