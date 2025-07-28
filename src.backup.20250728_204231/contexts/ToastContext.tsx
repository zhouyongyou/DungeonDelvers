import React, { createContext, useState, useCallback, useContext, type ReactNode } from 'react';

type ToastType = 'success' | 'error' | 'info';
interface Toast { id: string; text: string; type: ToastType; }
interface ToastContextValue { showToast: (text: string, type?: ToastType) => void; }

// 生成唯一ID的函數
const generateUniqueId = (): string => {
  return `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// eslint-disable-next-line react-refresh/only-export-components
export const ToastContext = createContext<ToastContextValue | undefined>(undefined);

// eslint-disable-next-line react-refresh/only-export-components
export const useAppToast = () => {
    const context = useContext(ToastContext);
    if (context === undefined) throw new Error('useAppToast must be used within a ToastProvider');
    return context;
};

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const showToast = useCallback((text: string, type: ToastType = 'info') => {
    const id = generateUniqueId();
    setToasts(prev => [...prev, { id, text, type }]);
    setTimeout(() => { setToasts(prev => prev.filter(t => t.id !== id)); }, 5000);
  }, []);
  const toastColors: Record<ToastType, string> = {
    success: 'linear-gradient(to right, #00b09b, #96c93d)',
    error: 'linear-gradient(to right, #ff5f6d, #ffc371)',
    info: 'linear-gradient(to right, #00c6ff, #0072ff)',
  };
  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed top-4 right-4 z-[100] w-full max-w-sm space-y-2">
        {toasts.map(toast => ( <div key={toast.id} className="px-6 py-3 rounded-lg text-white text-base shadow-lg animate-slide-in-right" style={{ background: toastColors[toast.type] }}>{toast.text}</div> ))}
      </div>
    </ToastContext.Provider>
  );
};
