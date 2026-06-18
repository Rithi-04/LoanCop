import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Layout & Protection
import { DashboardLayout } from './components/DashboardLayout';
import { ProtectedRoute } from './components/ProtectedRoute';

// Public Pages
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { AccessDenied } from './pages/AccessDenied';

// Customer Pages
import { CustomerDashboard } from './pages/CustomerDashboard';
import { CustomerApplications } from './pages/CustomerApplications';
import { CustomerChat } from './pages/CustomerChat';

// Officer Pages
import { OfficerDashboard } from './pages/OfficerDashboard';
import { OfficerReviews } from './pages/OfficerReviews';
import { OfficerChat } from './pages/OfficerChat';

// Manager Pages
import { ManagerDashboard } from './pages/ManagerDashboard';
import { ManagerAnalytics } from './pages/ManagerAnalytics';

// Setup React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public Routing */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/access-denied" element={<AccessDenied />} />

          {/* Customer Secure Workspace */}
          <Route
            path="/customer"
            element={
              <ProtectedRoute allowedRoles={['Customer']}>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<CustomerDashboard />} />
            <Route path="applications" element={<CustomerApplications />} />
            <Route path="chat" element={<CustomerChat />} />
          </Route>

          {/* Loan Officer Secure Workspace */}
          <Route
            path="/officer"
            element={
              <ProtectedRoute allowedRoles={['LoanOfficer']}>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<OfficerDashboard />} />
            <Route path="reviews" element={<OfficerReviews />} />
            <Route path="chat" element={<OfficerChat />} />
          </Route>

          {/* Branch Manager Secure Workspace */}
          <Route
            path="/manager"
            element={
              <ProtectedRoute allowedRoles={['Manager']}>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<ManagerDashboard />} />
            <Route path="analytics" element={<ManagerAnalytics />} />
          </Route>

          {/* 404 Routing fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;
