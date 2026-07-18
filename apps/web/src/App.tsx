import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Companies } from './pages/Companies';
import { Workers } from './pages/Workers';
import { Contracts } from './pages/Contracts';
import { Payroll } from './pages/Payroll';
import { SupportCases } from './pages/SupportCases';
import { AuditLogs } from './pages/AuditLogs';
import { UserRole } from '@gwos/shared';

// Protected Route Guard
const ProtectedRoute: React.FC<{ children: React.ReactNode; allowedRoles?: UserRole[] }> = ({
  children,
  allowedRoles,
}) => {
  const { isAuthenticated, isLoading, user, checkRole } = useAuth();

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: 'var(--neutral-50)' }}>
        <div style={{ width: '3rem', height: '3rem', border: '4px solid var(--neutral-200)', borderTopColor: 'var(--brand-500)', borderRadius: 'var(--radius-full)', animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !checkRole(allowedRoles)) {
    // If worker role tries to access administrative paths, redirect to their profile
    if (user?.role === UserRole.WORKER) {
      return <Navigate to={`/workers/${user.workerId}`} replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <Routes>
      {/* Public Login Route */}
      <Route path="/login" element={<Login />} />

      {/* Protected Layout Routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        {/* Default route redirecting to dashboard */}
        <Route index element={<Navigate to="/dashboard" replace />} />
        
        <Route path="dashboard" element={<Dashboard />} />
        
        <Route path="companies" element={<Companies />} />
        
        <Route path="workers" element={<Workers />} />
        <Route path="workers/:id" element={<Workers />} />
        
        <Route path="contracts" element={<Contracts />} />
        
        <Route path="payroll" element={<Payroll />} />
        
        <Route path="support-cases" element={<SupportCases />} />

        {/* Audit Logs: Admin/Ops only */}
        <Route
          path="audit-logs"
          element={
            <ProtectedRoute allowedRoles={[UserRole.PLATFORM_ADMIN, UserRole.INTERNAL_OPS]}>
              <AuditLogs />
            </ProtectedRoute>
          }
        />

        {/* Catch-all 404 redirects back to index */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
};
export default App;
