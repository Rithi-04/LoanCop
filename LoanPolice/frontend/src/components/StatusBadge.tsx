import React from 'react';

interface StatusBadgeProps {
  status: 'Pending' | 'Approved' | 'Rejected' | string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const normalized = status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();

  const config = {
    Approved: "bg-emerald-50 text-brand-emerald border-emerald-200",
    Rejected: "bg-slate-100 text-brand-muted border-brand-border",
    Pending: "bg-brand-slate text-brand-navy border-brand-border",
  };

  const currentStyle = config[normalized as keyof typeof config] || config.Pending;

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${currentStyle}`}>
      {normalized}
    </span>
  );
};
