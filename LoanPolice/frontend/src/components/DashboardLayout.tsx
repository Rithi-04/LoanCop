import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';

export const DashboardLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col font-sans bg-brand-slate">
      {/* Top Navbar */}
      <Navbar />

      <div className="flex flex-1">
        {/* Sidebar */}
        <Sidebar />

        {/* Main Content viewport */}
        <main className="flex-1 p-8 overflow-y-auto max-h-[calc(100vh-64px)]">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
