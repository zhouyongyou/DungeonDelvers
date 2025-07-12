import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    // 代碼分割優化
    rollupOptions: {
      output: {
        manualChunks: {
          // React 相關庫
          'react-vendor': ['react', 'react-dom'],
          // Web3 相關庫
          'web3-vendor': ['wagmi', 'viem', '@tanstack/react-query'],
          // 工具庫
          'utils-vendor': ['date-fns', 'clsx', 'tailwind-merge'],
          // GraphQL 相關
          'graphql-vendor': ['@apollo/client', 'graphql'],
        },
      },
    },
    // 壓縮優化
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    // 資源優化
    assetsInlineLimit: 4096,
    chunkSizeWarningLimit: 1000,
  },
  // 開發服務器優化
  server: {
    port: 5174,
    host: true,
    // 熱更新優化
    hmr: {
      overlay: false,
    },
  },
  // 預覽服務器
  preview: {
    port: 4173,
    host: true,
  },
  // 依賴預構建優化
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'wagmi',
      'viem',
      '@tanstack/react-query',
      '@apollo/client',
      'graphql',
    ],
  },
  // CSS 優化
  css: {
    devSourcemap: true,
  },
}) 