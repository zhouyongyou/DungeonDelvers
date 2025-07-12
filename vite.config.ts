import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  base: '/',
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@assets': resolve(__dirname, './src/assets'),
      '@components': resolve(__dirname, './src/components'),
      '@features': resolve(__dirname, './src/features'),
      '@hooks': resolve(__dirname, './src/hooks'),
      '@utils': resolve(__dirname, './src/utils'),
      '@config': resolve(__dirname, './src/config'),
      '@types': resolve(__dirname, './src/types'),
    },
  },
  define: {
    global: 'globalThis',
    // 修復 React 生產模式問題
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
    __DEV__: process.env.NODE_ENV !== 'production',
  },
  plugins: [
    react({
      babel: {
        // 添加 Lit 的 Babel 配置
        plugins: [
          ['@babel/plugin-transform-react-jsx', { runtime: 'automatic' }],
        ],
      },
    }),
    // 包大小分析工具
    visualizer({
      filename: 'dist/stats.html',
      open: true,
      gzipSize: true,
      brotliSize: true,
      template: 'treemap', // 使用樹形圖更直觀
    }),
  ],
  optimizeDeps: {
    force: true,
    include: [
      '@rainbow-me/rainbowkit',
      'react',
      'react-dom',
      'react-dom/client',
      'wagmi',
      'viem'
    ],
    esbuildOptions: {
      define: {
        'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
      },
    },
  },
  build: {
    target: 'es2020',
    outDir: 'dist',
    assetsDir: 'assets',
    // 代碼分割配置
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'web3-vendor': ['wagmi', 'viem', '@rainbow-me/rainbowkit'],
          'ui-vendor': ['@headlessui/react', '@heroicons/react'],
        },
      },
    },
    // 最小化配置
    minify: 'terser' as const,
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
  },
  server: {
    port: 5174,
    strictPort: true,
    host: true,
  },
  preview: {
    port: 5173,
    strictPort: true,
    host: true,
  },
})