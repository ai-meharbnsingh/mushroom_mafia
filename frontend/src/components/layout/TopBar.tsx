import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Search,
  Bell,
  ChevronRight,
  Moon,
  User,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useApp } from '@/store/AppContext';
import { useAuth } from '@/hooks/useAuth';

interface BreadcrumbItem {
  label: string;
  path: string;
}

export const TopBar: React.FC = () => {
  const { state } = useApp();
  const { currentUser, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  
  const activeAlertsCount = state.alerts.filter(a => a.status === 'ACTIVE').length;
  
  // Generate breadcrumbs from path
  const generateBreadcrumbs = (): BreadcrumbItem[] => {
    const paths = location.pathname.split('/').filter(Boolean);
    if (paths.length === 0) return [{ label: 'Dashboard', path: '/dashboard' }];
    
    return paths.map((path, index) => {
      const label = path.charAt(0).toUpperCase() + path.slice(1);
      const fullPath = '/' + paths.slice(0, index + 1).join('/');
      return { label, path: fullPath };
    });
  };
  
  const breadcrumbs = generateBreadcrumbs();
  
  return (
    <header
      className={`
        fixed top-0 right-0 h-16 bg-[#0B0D10]/80 backdrop-blur-lg border-b border-iot-subtle
        flex items-center justify-between px-6 z-30
        transition-all duration-300
        ${state.sidebarCollapsed ? 'left-16' : 'left-64'}
      `}
    >
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2">
        <span className="text-xs text-iot-muted">Owner</span>
        {breadcrumbs.map((crumb, index) => (
          <React.Fragment key={crumb.path}>
            <ChevronRight className="w-3 h-3 text-iot-muted" />
            <button
              onClick={() => navigate(crumb.path)}
              className={`
                text-xs transition-colors
                ${index === breadcrumbs.length - 1
                  ? 'text-iot-primary font-medium'
                  : 'text-iot-muted hover:text-iot-primary'
                }
              `}
            >
              {crumb.label}
            </button>
          </React.Fragment>
        ))}
      </nav>
      
      {/* Right Actions */}
      <div className="flex items-center gap-4">
        {/* WebSocket Status */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-iot-secondary">
          <div
            className={`w-2 h-2 rounded-full ${state.wsConnected ? 'animate-pulse-glow' : ''}`}
            style={{
              backgroundColor: state.wsConnected ? '#27FB6B' : '#FF2D55',
              boxShadow: state.wsConnected ? '0 0 6px #27FB6B' : 'none',
            }}
          />
          <span className={`text-xs font-medium ${state.wsConnected ? 'text-iot-green' : 'text-iot-red'}`}>
            {state.wsConnected ? 'Live' : 'Disconnected'}
          </span>
        </div>
        
        {/* Search */}
        <button className="p-2 rounded-lg text-iot-secondary hover:bg-iot-tertiary hover:text-iot-primary transition-colors">
          <Search className="w-5 h-5" />
        </button>
        
        {/* Notifications */}
        <button
          onClick={() => navigate('/alerts')}
          className="relative p-2 rounded-lg text-iot-secondary hover:bg-iot-tertiary hover:text-iot-primary transition-colors"
        >
          <Bell className="w-5 h-5" />
          {activeAlertsCount > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-iot-red text-white text-[10px] font-bold flex items-center justify-center">
              {activeAlertsCount > 9 ? '9+' : activeAlertsCount}
            </span>
          )}
        </button>
        
        {/* Theme Toggle */}
        <button className="p-2 rounded-lg text-iot-secondary hover:bg-iot-tertiary hover:text-iot-primary transition-colors">
          <Moon className="w-5 h-5" />
        </button>
        
        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-iot-tertiary transition-colors">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-iot-cyan to-iot-purple flex items-center justify-center">
                <User className="w-4 h-4 text-iot-bg-primary" />
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-medium text-iot-primary">
                  {currentUser?.firstName} {currentUser?.lastName}
                </p>
                <p className="text-[10px] text-iot-muted uppercase">{currentUser?.role}</p>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-48 bg-iot-secondary border-iot-subtle"
          >
            <DropdownMenuItem
              onClick={() => navigate('/profile')}
              className="text-iot-primary hover:bg-iot-tertiary cursor-pointer"
            >
              <User className="w-4 h-4 mr-2" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-iot-subtle" />
            <DropdownMenuItem
              onClick={logout}
              className="text-iot-red hover:bg-iot-tertiary cursor-pointer"
            >
              <span className="w-4 h-4 mr-2">→</span>
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

export default TopBar;
