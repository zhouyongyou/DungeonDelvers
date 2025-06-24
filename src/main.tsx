import React from 'react';
import ReactDOM from 'react-dom/client';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './assets/index.css';
import { wagmiConfig } from './wagmi';
import { ToastProvider } from './contexts/ToastContext';
import { ExpeditionProvider } from './contexts/ExpeditionContext';
import { ThemeProvider } from './contexts/ThemeContext';
import App from './App';

const queryClient = new QueryClient();
const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Failed to find the root element');
const root = ReactDOM.createRoot(rootElement);

root.render(
  <React.StrictMode>
    <ThemeProvider>
      <WagmiProvider config={wagmiConfig}>
        <QueryClientProvider client={queryClient}>
          <ToastProvider>
            <ExpeditionProvider>
              <App />
            </ExpeditionProvider>
          </ToastProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </ThemeProvider>
  </React.StrictMode>
);
