import React, { createContext, useState, useCallback, useContext, type ReactNode } from 'react';

type ToastType = 'success' | 'error' | 'info';
interface Toast { id: string; text: string; type: ToastType; }
interface ToastContextValue { showToast: (text: string, type?: ToastType) => void; }

// 生成唯一ID的函數
const generateUniqueId = (): string => {
  return `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

export const ToastContext = createContext<ToastContextValue | undefined>(undefined);

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
    success: '#10b981',
    error: '#ef4444',
    info: '#3b82f6',
  };
  
  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div style={{ 
        position: 'fixed', 
        top: '16px', 
        right: '16px', 
        left: '16px',
        zIndex: 100, 
        maxWidth: '384px',
        marginLeft: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        pointerEvents: 'none'
      }}>
        {toasts.map(toast => ( 
          <div 
            key={toast.id} 
            style={{
              padding: '12px 16px',
              borderRadius: '8px',
              color: 'white',
              fontSize: '14px',
              lineHeight: '1.4',
              backgroundColor: toastColors[toast.type],
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
              animation: 'slideIn 0.3s ease-out forwards',
              wordWrap: 'break-word',
              wordBreak: 'break-word',
              maxWidth: '100%',
              pointerEvents: 'auto'
            }}
          >
            {toast.text}
          </div>
        ))}
      </div>
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </ToastContext.Provider>
  );
};