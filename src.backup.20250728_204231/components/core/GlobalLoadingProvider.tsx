import React, { createContext, useContext, useState, ReactNode } from 'react';
import { LoadingSpinner } from '../ui/LoadingSpinner';

interface LoadingContextType {
  isLoading: boolean;
  loadingMessage: string;
  setLoading: (loading: boolean, message?: string) => void;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export const useGlobalLoading = () => {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error('useGlobalLoading must be used within GlobalLoadingProvider');
  }
  return context;
};

interface GlobalLoadingProviderProps {
  children: ReactNode;
}

export const GlobalLoadingProvider: React.FC<GlobalLoadingProviderProps> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('載入中...');

  const setLoading = (loading: boolean, message = '載入中...') => {
    setIsLoading(loading);
    setLoadingMessage(message);
  };

  return (
    <LoadingContext.Provider value={{ isLoading, loadingMessage, setLoading }}>
      {children}
      {isLoading && <GlobalLoadingOverlay message={loadingMessage} />}
    </LoadingContext.Provider>
  );
};

const GlobalLoadingOverlay: React.FC<{ message: string }> = ({ message }) => (
  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
    <div className="bg-gray-800 rounded-2xl p-8 shadow-2xl flex flex-col items-center space-y-4">
      <LoadingSpinner size="h-12 w-12" />
      <p className="text-white text-lg font-medium">{message}</p>
    </div>
  </div>
);