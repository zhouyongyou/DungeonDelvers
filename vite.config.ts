import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// 簡化的 Vite 配置
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
  },
  build: {
    target: 'es2020',
    outDir: 'dist',
  },
  esbuild: {
    target: 'es2020',
  },
})
