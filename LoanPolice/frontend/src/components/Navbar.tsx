import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { LogOut, User, Landmark } from 'lucide-react';
import { Button } from './ui';

export const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const userName = localStorage.getItem('user') || 'User';
  const userRole = localStorage.getItem('role') || 'Customer';

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('user');
    navigate('/login');
  };

  // Determine badge color
  const roleColors = {
    Customer: "bg-slate-100 text-brand-navy border border-brand-border",
    LoanOfficer: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    Manager: "bg-indigo-50 text-indigo-700 border border-indigo-200"
  };

  return (
    <header className="h-16 border-b border-brand-border bg-white px-6 flex items-center justify-between sticky top-0 z-40">
      {/* Brand logo */}
      <Link to="/" className="flex items-center space-x-2.5">
        <div className="bg-brand-navy p-1.5 rounded-md text-brand-emerald">
          <Landmark className="w-5 h-5" />
        </div>
        <span className="font-sans font-bold text-lg text-brand-navy tracking-tight">
          LEND<span className="text-brand-emerald">.AI</span>
        </span>
        <span className="hidden sm:inline-block text-xs font-semibold px-2 py-0.5 rounded-full bg-brand-slate text-brand-muted border border-brand-border uppercase tracking-wider">
          Enterprise
        </span>
      </Link>

      {/* User profile controls */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-full bg-brand-slate border border-brand-border flex items-center justify-center text-brand-navy">
            <User className="w-4 h-4" />
          </div>
          <div className="text-right hidden md:block">
            <p className="text-sm font-semibold text-brand-navy">{userName}</p>
            <p className="text-xs text-brand-muted">{userRole}</p>
          </div>
          <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded ${roleColors[userRole as keyof typeof roleColors] || roleColors.Customer}`}>
            {userRole}
          </span>
        </div>
        
        <div className="h-6 w-px bg-brand-border" />

        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className="text-brand-muted hover:text-red-600 !p-1.5"
          title="Sign Out"
        >
          <LogOut className="w-4 h-4" />
        </Button>
      </div>
    </header>
  );
};
