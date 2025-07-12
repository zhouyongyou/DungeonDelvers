import { ToastContext } from '../contexts/ToastContextTypes';
import { useContext } from 'react';

export const useAppToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useAppToast must be used within a ToastProvider');
  }
  
  const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    context.addToast({
      message,
      type,
      duration: 5000,
    });
  };

  return {
    ...context,
    showToast,
  };
}; 