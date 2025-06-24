import { useContext } from 'react';
import { ToastContext } from '../contexts/ToastContext';

export const useAppToast = () => {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useAppToast must be used within a ToastProvider');
  }
  return context;
};