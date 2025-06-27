import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  base: '/', 
  plugins: [react()],
  // 新增 esbuild 設定，以確保支援 BigInt 字面量 (e.g., 0n)
  esbuild: {
    target: 'es2020'
  },
  build: {
    target: 'es2020'
  },
  server: {
    fs: {
      strict: false,
    }
  }
})