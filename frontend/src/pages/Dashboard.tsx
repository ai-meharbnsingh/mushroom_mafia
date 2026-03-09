import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { AdminDashboard } from './dashboard/AdminDashboard';
import { UserDashboard } from './dashboard/UserDashboard';

export const Dashboard: React.FC = () => {
  const { checkPermission } = useAuth();
  const isAdmin = checkPermission('ADMIN');

  return isAdmin ? <AdminDashboard /> : <UserDashboard />;
};

export default Dashboard;
