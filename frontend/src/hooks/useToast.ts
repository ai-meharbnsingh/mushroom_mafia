import { useAppActions } from '@/store/AppContext';
import type { ToastType } from '@/types';

export function useToast() {
  const { addToast } = useAppActions();

  const toast = {
    success: (title: string, message?: string, duration?: number) => {
      addToast({ type: 'success' as ToastType, title, message, duration });
    },
    error: (title: string, message?: string, duration?: number) => {
      addToast({ type: 'error' as ToastType, title, message, duration });
    },
    warning: (title: string, message?: string, duration?: number) => {
      addToast({ type: 'warning' as ToastType, title, message, duration });
    },
    info: (title: string, message?: string, duration?: number) => {
      addToast({ type: 'info' as ToastType, title, message, duration });
    },
  };

  return toast;
}
