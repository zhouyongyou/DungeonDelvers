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
    target: 'es2020'
  },
  server: {
    fs: {
      // 放寬文件系統存取限制，有助於解決某些環境下的模組解析問題
      strict: false,
    }
  }
})
