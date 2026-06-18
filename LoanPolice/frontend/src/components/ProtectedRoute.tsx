import React from 'react';
import { Navigate } from 'react-router-dom';

interface ProtectedRouteProps {
  children: React.ReactElement;
  allowedRoles: ('Customer' | 'LoanOfficer' | 'Manager')[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const token = localStorage.getItem('token');
  const userRole = localStorage.getItem('role') as 'Customer' | 'LoanOfficer' | 'Manager' | null;

  if (!token || !userRole) {
    // Redirect to login if not authenticated
    return <Navigate to="/login" replace />;
  }

  // Hierarchy check: Managers inherit LoanOfficer privileges
  const userPermissions: string[] = [userRole];
  if (userRole === 'Manager') {
    userPermissions.push('LoanOfficer');
  }

  // Check if user has permission
  const isAuthorized = allowedRoles.some((role) => userPermissions.includes(role));

  if (!isAuthorized) {
    // Redirect to access denied if role not permitted
    return <Navigate to="/access-denied" replace />;
  }

  return children;
};
