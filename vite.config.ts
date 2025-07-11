import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// 優化的 Vite 配置
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
  },
  build: {
    target: 'es2020',
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks: {
          // 將大型庫分離到單獨的 chunk
          vendor: ['react', 'react-dom'],
          wagmi: ['wagmi', 'viem'],
          apollo: ['@apollo/client', 'graphql'],
          ui: ['@tanstack/react-query', 'zustand'],
        },
      },
    },
  },
  esbuild: {
    target: 'es2020',
  },
})
