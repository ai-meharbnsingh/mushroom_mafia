import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { ToastContainer } from '@/components/ui-custom/ToastContainer';
import { useApp } from '@/store/AppContext';

export const MainLayout: React.FC = () => {
  const { state } = useApp();
  
  return (
    <div className="min-h-screen bg-iot-primary">
      {/* Noise Overlay */}
      <div className="noise-overlay" />
      
      {/* Sidebar */}
      <Sidebar />
      
      {/* Top Bar */}
      <TopBar />
      
      {/* Main Content */}
      <main
        className={`
          pt-16 min-h-screen transition-all duration-300
          ${state.sidebarCollapsed ? 'pl-16' : 'pl-64'}
        `}
      >
        <div className="p-6">
          <Outlet />
        </div>
      </main>
      
      {/* Toast Container */}
      <ToastContainer />
    </div>
  );
};

export default MainLayout;
