import { useContext } from 'react';
// 使用簡化版的 ToastContext
import { ToastContext } from '../contexts/SimpleToastContext';

export const useAppToast = () => {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useAppToast must be used within a ToastProvider');
  }
  return context;
};