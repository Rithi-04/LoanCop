import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, Home } from 'lucide-react';
import { Button } from '../components/ui';

export const AccessDenied: React.FC = () => {
  const navigate = useNavigate();
  const role = localStorage.getItem('role') || '';

  const handleGoHome = () => {
    if (role) {
      navigate(role === 'LoanOfficer' ? '/officer/dashboard' : `/${role.toLowerCase()}/dashboard`);
    } else {
      navigate('/login');
    }
  };

  return (
    <div className="bg-brand-slate min-h-screen flex flex-col items-center justify-center p-6 text-center font-sans">
      <div className="bg-white border border-brand-border p-8 rounded-xl shadow-lg max-w-md space-y-6">
        <div className="w-16 h-16 rounded-full bg-slate-100 text-brand-navy flex items-center justify-center mx-auto border border-brand-border">
          <ShieldAlert className="w-8 h-8" />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-brand-navy">Access Denied</h1>
          <p className="text-sm text-brand-muted leading-relaxed">
            Your account role <strong>({role || 'Guest'})</strong> is not authorized to view this enterprise portal section. High-privilege routes are restricted to compliance managers and officers.
          </p>
        </div>

        <Button
          variant="primary"
          onClick={handleGoHome}
          className="w-full flex items-center justify-center space-x-2 cursor-pointer"
        >
          <Home className="w-4 h-4" />
          <span>Return to Dashboard</span>
        </Button>
      </div>
    </div>
  );
};
