import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  base: '/', 
  plugins: [react()],
  // 新增 esbuild 設定，以確保支援 BigInt 字面量 (e.g., 100n)
  // 將編譯目標設定為 es2020 或更高版本
  esbuild: {
    target: 'es2020'
  },
  build: {
    target: 'es2020',
    // 代碼分割優化
    rollupOptions: {
      output: {
        manualChunks: {
          // React 相關
          'react-vendor': ['react', 'react-dom'],
          // Web3 相關
          'web3-vendor': ['wagmi', 'viem', '@tanstack/react-query'],
          // Apollo 相關
          'apollo-vendor': ['@apollo/client', 'graphql'],
          // UI 相關
          'ui-vendor': ['zustand']
        },
      },
    },
    // 生產環境壓縮優化
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug']
      },
    },
    // 分塊大小警告閾值
    chunkSizeWarningLimit: 1000,
  },
  server: {
    fs: {
      // 放寬文件系統存取限制，有助於解決某些環境下的模組解析問題
      strict: false,
    }
  }
})
