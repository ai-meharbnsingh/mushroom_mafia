import React from 'react';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { useApp, useAppActions } from '@/store/AppContext';
import type { ToastType } from '@/types';

const toastIcons: Record<ToastType, React.ElementType> = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const toastColors: Record<ToastType, { bg: string; border: string; icon: string }> = {
  success: {
    bg: 'rgba(39, 251, 107, 0.1)',
    border: 'rgba(39, 251, 107, 0.3)',
    icon: '#27FB6B',
  },
  error: {
    bg: 'rgba(255, 45, 85, 0.1)',
    border: 'rgba(255, 45, 85, 0.3)',
    icon: '#FF2D55',
  },
  warning: {
    bg: 'rgba(255, 209, 102, 0.1)',
    border: 'rgba(255, 209, 102, 0.3)',
    icon: '#FFD166',
  },
  info: {
    bg: 'rgba(46, 239, 255, 0.1)',
    border: 'rgba(46, 239, 255, 0.3)',
    icon: '#2EEFFF',
  },
};

export const ToastContainer: React.FC = () => {
  const { state } = useApp();
  const { removeToast } = useAppActions();
  
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
      {state.toasts.map((toast) => {
        const Icon = toastIcons[toast.type];
        const colors = toastColors[toast.type];
        
        return (
          <div
            key={toast.id}
            className="toast-enter toast-enter-active min-w-[320px] max-w-[480px] rounded-xl p-4 border"
            style={{
              backgroundColor: colors.bg,
              borderColor: colors.border,
              backdropFilter: 'blur(10px)',
            }}
          >
            <div className="flex items-start gap-3">
              <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: colors.icon }} />
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-iot-primary">{toast.title}</h4>
                {toast.message && (
                  <p className="text-xs text-iot-secondary mt-1">{toast.message}</p>
                )}
                {toast.action && (
                  <button
                    onClick={toast.action.onClick}
                    className="mt-2 text-xs font-medium text-iot-cyan hover:underline"
                  >
                    {toast.action.label}
                  </button>
                )}
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="flex-shrink-0 text-iot-muted hover:text-iot-primary transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ToastContainer;
