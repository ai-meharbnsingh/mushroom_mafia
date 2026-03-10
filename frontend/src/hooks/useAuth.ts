import { useCallback, useState } from 'react';
import { useApp, useAppActions } from '@/store/AppContext';
import { authService } from '@/services/authService';
import type { User } from '@/types';

interface LoginCredentials {
  username: string;
  password: string;
}

export function useAuth() {
  const { state } = useApp();
  const { login, loginError, logout: dispatchLogout, setLocked } = useAppActions();
  const [isLoading, setIsLoading] = useState(false);

  const attemptLogin = useCallback(async (credentials: LoginCredentials): Promise<boolean> => {
    setIsLoading(true);

    try {
      const data = await authService.login(credentials.username, credentials.password);
      const user: User = {
        ...data.user,
        id: data.user.user_id?.toString() || data.user.id?.toString(),
      };
      login(user);
      setIsLoading(false);
      return true;
    } catch (error: any) {
      const detail = error.response?.data?.detail;
      const message = typeof detail === 'string' ? detail : detail?.message || 'Invalid credentials';

      if (message.toLowerCase().includes('locked')) {
        setLocked(true, 14);
        loginError('Account is locked');
      } else {
        loginError(message);
      }

      setIsLoading(false);
      return false;
    }
  }, [login, loginError, setLocked]);

  const attemptLogout = useCallback(async () => {
    await authService.logout();
    dispatchLogout();
  }, [dispatchLogout]);

  const checkAuth = useCallback(async (): Promise<boolean> => {
    try {
      const userData = await authService.getMe();
      const user: User = {
        ...userData,
        id: userData.user_id?.toString() || userData.id?.toString(),
      };
      login(user);
      return true;
    } catch {
      return false;
    }
  }, [login]);

  const checkPermission = useCallback((requiredRole: User['role']): boolean => {
    if (!state.currentUser) return false;

    const roleHierarchy: Record<User['role'], number> = {
      'SUPER_ADMIN': 5,
      'ADMIN': 4,
      'MANAGER': 3,
      'OPERATOR': 2,
      'VIEWER': 1,
    };

    return roleHierarchy[state.currentUser.role] >= roleHierarchy[requiredRole];
  }, [state.currentUser]);

  return {
    isAuthenticated: state.isAuthenticated,
    currentUser: state.currentUser,
    loginError: state.loginError,
    isLocked: state.isLocked,
    lockoutTime: state.lockoutTime,
    isLoading,
    login: attemptLogin,
    logout: attemptLogout,
    checkAuth,
    checkPermission,
  };
}
