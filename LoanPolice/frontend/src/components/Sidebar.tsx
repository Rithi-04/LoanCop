import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FileSpreadsheet, 
  MessageSquare, 
  BarChart3, 
  ShieldAlert, 
  FolderLock
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const role = localStorage.getItem('role') || 'Customer';

  // Define nav links dynamically based on user role
  const getLinksByRole = () => {
    switch (role) {
      case 'Customer':
        return [
          { to: '/customer/dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { to: '/customer/applications', label: 'Applications', icon: FileSpreadsheet },
          { to: '/customer/chat', label: 'AI Assistant', icon: MessageSquare },
        ];
      case 'LoanOfficer':
        return [
          { to: '/officer/dashboard', label: 'Officer Dashboard', icon: LayoutDashboard },
          { to: '/officer/reviews', label: 'Review Queue', icon: FileSpreadsheet },
          { to: '/officer/chat', label: 'Policy Assistant', icon: FolderLock },
        ];
      case 'Manager':
        return [
          { to: '/manager/dashboard', label: 'Manager KPI', icon: LayoutDashboard },
          { to: '/manager/analytics', label: 'Audit & Analytics', icon: BarChart3 },
          // Manager also inherits Loan Officer reviews
          { to: '/officer/reviews', label: 'Review Queue', icon: FileSpreadsheet },
          { to: '/officer/chat', label: 'Policy Assistant', icon: FolderLock },
        ];
      default:
        return [];
    }
  };

  const links = getLinksByRole();

  return (
    <aside className="w-64 border-r border-brand-border bg-white flex flex-col h-[calc(100vh-64px)] sticky top-16 left-0 shrink-0">
      <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
        <p className="text-[10px] font-bold text-brand-muted uppercase tracking-wider px-3 mb-3">
          Navigation Portal
        </p>
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) => 
                `flex items-center space-x-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                  isActive 
                    ? 'bg-brand-navy text-white' 
                    : 'text-brand-navy hover:bg-brand-slate hover:text-brand-navy'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{link.label}</span>
            </NavLink>
          );
        })}
      </nav>
      
      {/* Sidebar Footer info */}
      <div className="p-4 border-t border-brand-border bg-brand-slate/50">
        <div className="flex items-center space-x-2 text-brand-muted">
          <ShieldAlert className="w-3.5 h-3.5" />
          <span className="text-[10px] font-medium tracking-wide uppercase">
            SECURE SESSION
          </span>
        </div>
        <p className="text-[10px] text-brand-muted mt-1 leading-normal">
          IP logs and interactions are tracked for internal compliance.
        </p>
      </div>
    </aside>
  );
};
