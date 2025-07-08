// src/main.jsx - 正確的整合版本

import React from 'react';
import ReactDOM from 'react-dom/client';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ApolloProvider } from '@apollo/client'; // 1. 引入 ApolloProvider

import './assets/index.css';
import { wagmiConfig } from './wagmi';
import client from './apolloClient'; // 2. 引入我們設定好的 Apollo Client
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
      {/* 3. 將 ApolloProvider 包裹在需要使用它的地方 */}
      <ApolloProvider client={client}>
        <WagmiProvider config={wagmiConfig}>
          <QueryClientProvider client={queryClient}>
            <ToastProvider>
              <ExpeditionProvider>
                <App />
              </ExpeditionProvider>
            </ToastProvider>
          </QueryClientProvider>
        </WagmiProvider>
      </ApolloProvider>
    </ThemeProvider>
  </React.StrictMode>
);