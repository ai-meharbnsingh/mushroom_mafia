import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Leaf,
  DoorOpen,
  Cpu,
  Settings,
  Bell,
  FileText,
  Users,
  HardDrive,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from 'lucide-react';
import { useApp, useAppActions } from '@/store/AppContext';
import { useAuth } from '@/hooks/useAuth';

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  path: string;
  badge?: number;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
  { id: 'plants', label: 'Plants', icon: Leaf, path: '/plants' },
  { id: 'rooms', label: 'Rooms', icon: DoorOpen, path: '/rooms' },
  { id: 'devices', label: 'Devices', icon: Cpu, path: '/devices' },
  { id: 'settings', label: 'Settings', icon: Settings, path: '/settings' },
  { id: 'alerts', label: 'Alerts', icon: Bell, path: '/alerts', badge: 0 },
  { id: 'reports', label: 'Reports', icon: FileText, path: '/reports' },
  { id: 'users', label: 'Users', icon: Users, path: '/users', adminOnly: true },
  { id: 'firmware', label: 'Firmware', icon: HardDrive, path: '/firmware', adminOnly: true },
];

export const Sidebar: React.FC = () => {
  const { state } = useApp();
  const { toggleSidebar } = useAppActions();
  const { logout, currentUser, checkPermission } = useAuth();
  const location = useLocation();
  
  const activeAlertsCount = state.alerts.filter(a => a.status === 'ACTIVE').length;
  
  const filteredNavItems = navItems.filter(item => {
    if (item.adminOnly && !checkPermission('ADMIN')) return false;
    return true;
  });
  
  return (
    <aside
      className={`
        fixed left-0 top-0 h-full bg-[#0A1929] border-r border-iot-subtle
        transition-all duration-300 z-40 flex flex-col
        ${state.sidebarCollapsed ? 'w-16' : 'w-64'}
      `}
    >
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-iot-subtle">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-iot-cyan to-iot-purple flex items-center justify-center flex-shrink-0">
            <Leaf className="w-5 h-5 text-iot-bg-primary" />
          </div>
          {!state.sidebarCollapsed && (
            <span className="text-lg font-bold text-iot-primary whitespace-nowrap">
              MushroomIoT
            </span>
          )}
        </div>
      </div>
      
      {/* Navigation */}
      <nav className="flex-1 py-4 px-2">
        <ul className="space-y-1">
          {filteredNavItems.map((item) => {
            const isActive = location.pathname === item.path ||
              (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
            const Icon = item.icon;
            const badgeCount = item.id === 'alerts' ? activeAlertsCount : item.badge;
            
            return (
              <li key={item.id}>
                <NavLink
                  to={item.path}
                  className={`
                    flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200
                    ${isActive
                      ? 'bg-iot-cyan/10 text-iot-cyan'
                      : 'text-iot-secondary hover:bg-iot-tertiary hover:text-iot-primary'
                    }
                    ${state.sidebarCollapsed ? 'justify-center' : ''}
                  `}
                  style={{
                    borderLeft: isActive ? '3px solid var(--iot-cyan)' : '3px solid transparent',
                    boxShadow: isActive ? '0 0 15px rgba(46, 239, 255, 0.1)' : 'none',
                  }}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  {!state.sidebarCollapsed && (
                    <>
                      <span className="text-sm font-medium flex-1 whitespace-nowrap">
                        {item.label}
                      </span>
                      {badgeCount !== undefined && badgeCount > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-iot-red text-white">
                          {badgeCount}
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>
      
      {/* User & Collapse */}
      <div className="p-2 border-t border-iot-subtle">
        {!state.sidebarCollapsed && currentUser && (
          <div className="px-3 py-2 mb-2">
            <p className="text-sm font-medium text-iot-primary truncate">
              {currentUser.firstName} {currentUser.lastName}
            </p>
            <p className="text-xs text-iot-muted truncate">{currentUser.email}</p>
          </div>
        )}
        
        <button
          onClick={logout}
          className={`
            flex items-center gap-3 px-3 py-2.5 rounded-lg text-iot-secondary
            hover:bg-iot-tertiary hover:text-iot-red transition-all duration-200 w-full
            ${state.sidebarCollapsed ? 'justify-center' : ''}
          `}
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!state.sidebarCollapsed && <span className="text-sm font-medium">Logout</span>}
        </button>
        
        <button
          onClick={toggleSidebar}
          className={`
            mt-2 flex items-center gap-3 px-3 py-2.5 rounded-lg text-iot-muted
            hover:bg-iot-tertiary hover:text-iot-primary transition-all duration-200 w-full
            ${state.sidebarCollapsed ? 'justify-center' : ''}
          `}
        >
          {state.sidebarCollapsed ? (
            <ChevronRight className="w-5 h-5 flex-shrink-0" />
          ) : (
            <>
              <ChevronLeft className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm font-medium">Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
