import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer'

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  
  return {
    base: '/', 
    plugins: [
      react(),
      // Bundle 分析器 - 僅在分析模式下啟用
      mode === 'analyze' && visualizer({
        filename: 'dist/stats.html',
        open: true,
        gzipSize: true,
        brotliSize: true,
      }),
    ].filter(Boolean),
    
    // 新增 esbuild 設定，以確保支援 BigInt 字面量 (e.g., 100n)
    // 將編譯目標設定為 es2020 或更高版本
    esbuild: {
      target: 'es2020',
      // 生產環境移除 console.log
      drop: command === 'build' ? ['console', 'debugger'] : [],
    },
    
    build: {
      target: 'es2020',
      // 優化 chunk 分割
      rollupOptions: {
        output: {
          manualChunks: {
            // 將 React 相關庫分離
            vendor: ['react', 'react-dom'],
            // Web3 相關庫
            web3: ['wagmi', 'viem', '@apollo/client'],
            // UI 和狀態管理
            ui: ['@tanstack/react-query', 'zustand'],
            // GraphQL
            graphql: ['graphql'],
          }
        }
      },
      // 設置合理的 chunk 大小警告閾值
      chunkSizeWarningLimit: 1000,
      // 啟用壓縮
      minify: 'esbuild',
      // 生成 source map（可選）
      sourcemap: command === 'build' && env.VITE_GENERATE_SOURCEMAP === 'true',
    },
    
    // 開發伺服器優化
    server: {
      fs: {
        // 放寬文件系統存取限制，有助於解決某些環境下的模組解析問題
        strict: false,
      },
      // 預構建優化
      warmup: {
        clientFiles: ['./src/main.tsx', './src/App.tsx'],
      }
    },
    
    // 優化依賴預構建
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        '@tanstack/react-query',
        'wagmi',
        'viem'
      ],
      exclude: ['@wagmi/core']
    },
    
    // 解析配置
    resolve: {
      alias: {
        '@': '/src'
      }
    },
    
    // 環境變數
    define: {
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
    }
  }
})
