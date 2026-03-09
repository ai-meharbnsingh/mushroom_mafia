import React, { useState } from 'react';
import { User, Mail, Phone, Shield, Clock, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RoleBadge } from '@/components/ui-custom/RoleBadge';
import { useApp } from '@/store/AppContext';
import { useToast } from '@/hooks/useToast';
import { authService } from '@/services/authService';
import type { PasswordFormData } from '@/types';

export const Profile: React.FC = () => {
  const { state } = useApp();
  const toast = useToast();
  const user = state.currentUser;
  
  const [passwordData, setPasswordData] = useState<PasswordFormData>({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  
  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-iot-muted">Please log in to view your profile</p>
      </div>
    );
  }
  
  const handlePasswordChange = async () => {
    if (!passwordData.oldPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      toast.error('Please fill in all password fields');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    try {
      await authService.changePassword(passwordData.oldPassword, passwordData.newPassword);
      toast.success('Password updated successfully');
      setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to update password');
    }
  };
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-iot-primary mb-1">Profile</h1>
        <p className="text-sm text-iot-secondary">Manage your account settings</p>
      </div>
      
      {/* User Info Card */}
      <div className="bg-iot-secondary rounded-2xl p-6 border border-iot-subtle">
        <h2 className="text-lg font-semibold text-iot-primary mb-6">User Information</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-iot-cyan to-iot-purple flex items-center justify-center">
              <User className="w-6 h-6 text-iot-bg-primary" />
            </div>
            <div>
              <p className="text-xs text-iot-muted uppercase tracking-wider">Full Name</p>
              <p className="text-lg font-medium text-iot-primary">
                {user.firstName} {user.lastName}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-iot-tertiary flex items-center justify-center">
              <Mail className="w-6 h-6 text-iot-cyan" />
            </div>
            <div>
              <p className="text-xs text-iot-muted uppercase tracking-wider">Email</p>
              <p className="text-lg font-medium text-iot-primary">{user.email}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-iot-tertiary flex items-center justify-center">
              <Phone className="w-6 h-6 text-iot-green" />
            </div>
            <div>
              <p className="text-xs text-iot-muted uppercase tracking-wider">Mobile</p>
              <p className="text-lg font-medium text-iot-primary">
                {user.mobile || 'Not set'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-iot-tertiary flex items-center justify-center">
              <Shield className="w-6 h-6 text-iot-purple" />
            </div>
            <div>
              <p className="text-xs text-iot-muted uppercase tracking-wider">Role</p>
              <div className="mt-1">
                <RoleBadge role={user.role} />
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-6 pt-6 border-t border-iot-subtle flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-iot-tertiary flex items-center justify-center">
            <Clock className="w-6 h-6 text-iot-yellow" />
          </div>
          <div>
            <p className="text-xs text-iot-muted uppercase tracking-wider">Last Login</p>
            <p className="text-lg font-medium text-iot-primary">
              {user.lastLogin
                ? new Date(user.lastLogin).toLocaleString()
                : 'Never'}
            </p>
          </div>
        </div>
      </div>
      
      {/* Change Password Card */}
      <div className="bg-iot-secondary rounded-2xl p-6 border border-iot-subtle">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 rounded-xl bg-iot-tertiary flex items-center justify-center">
            <Lock className="w-6 h-6 text-iot-red" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-iot-primary">Change Password</h2>
            <p className="text-sm text-iot-secondary">Update your account password</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-iot-secondary mb-2">
              Current Password
            </label>
            <Input
              type="password"
              value={passwordData.oldPassword}
              onChange={(e) => setPasswordData({ ...passwordData, oldPassword: e.target.value })}
              placeholder="Enter current password"
              className="input-dark w-full"
            />
          </div>
          
          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-iot-secondary mb-2">
              New Password
            </label>
            <Input
              type="password"
              value={passwordData.newPassword}
              onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
              placeholder="Enter new password"
              className="input-dark w-full"
            />
          </div>
          
          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-iot-secondary mb-2">
              Confirm New Password
            </label>
            <Input
              type="password"
              value={passwordData.confirmPassword}
              onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
              placeholder="Confirm new password"
              className="input-dark w-full"
            />
          </div>
        </div>
        
        <div className="mt-4 flex justify-end">
          <Button
            onClick={handlePasswordChange}
            className="gradient-primary text-iot-bg-primary"
          >
            Update Password
          </Button>
        </div>
      </div>
      
      {/* Account Status */}
      <div className="bg-iot-secondary rounded-2xl p-6 border border-iot-subtle">
        <h2 className="text-lg font-semibold text-iot-primary mb-4">Account Status</h2>
        <div className="flex items-center gap-4">
          <div
            className={`w-3 h-3 rounded-full ${
              user.status === 'ACTIVE' ? 'bg-iot-green animate-pulse-glow' : 'bg-iot-red'
            }`}
            style={{
              boxShadow: user.status === 'ACTIVE' ? '0 0 8px #27FB6B' : 'none',
            }}
          />
          <div>
            <p className="text-sm font-medium text-iot-primary">
              {user.status === 'ACTIVE' ? 'Account Active' : 'Account Locked'}
            </p>
            <p className="text-xs text-iot-muted">
              {user.status === 'ACTIVE'
                ? 'Your account is in good standing'
                : 'Your account has been locked due to multiple failed login attempts'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
