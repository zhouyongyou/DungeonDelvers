import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: '/', 
  plugins: [
    react(),
    // 🔥 新增：包大小分析工具
    visualizer({
      filename: 'dist/stats.html',
      open: false, // 改為 false，避免干擾開發服務器
      gzipSize: true,
      brotliSize: true
    })
  ],
  // 新增 esbuild 設定，以確保支援 BigInt 字面量 (e.g., 100n)
  // 將編譯目標設定為 es2020 或更高版本
  esbuild: {
    target: 'es2020'
  },
  build: {
    target: 'es2020',
    // 🔥 修復：確保模組格式正確
    modulePreload: {
      polyfill: false
    },
    // 🔥 優化：代碼分割優化
    rollupOptions: {
      // 排除開發工具避免 MIME type 錯誤
      treeshake: {
        moduleSideEffects: false,
        propertyReadSideEffects: false
      },
      // 明確排除 Next.js 相關模組以避免構建錯誤
      external: [
        'next',
        'next/router',
        'next/link',
        'next/image',
        'next/head'
      ].filter(dep => {
        // 只在實際遇到這些模組時才排除
        try {
          require.resolve(dep);
          return false; // 如果能解析，不排除
        } catch {
          return true; // 如果不能解析，排除它
        }
      }),
      output: {
        manualChunks: {
          // React 相關 - 核心框架
          'react-vendor': ['react', 'react-dom'],
          
          // Web3 相關 - 區塊鏈交互
          'web3-vendor': ['wagmi', 'viem', '@tanstack/react-query'],
          
          // Apollo 相關 - GraphQL
          'apollo-vendor': ['@apollo/client', 'graphql'],
          
          // UI 相關 - 狀態管理和工具
          'ui-vendor': ['zustand'],
          
          // 🔥 新增：按頁面功能分割
          'pages-core': [
            './src/pages/OverviewPage',
            './src/pages/MintPage',
            './src/pages/MyAssetsPageEnhanced'
          ],
          'pages-game': [
            './src/pages/DungeonPage',
            './src/pages/AltarPage'
          ],
          'pages-profile': [
            './src/pages/VipPage',
            './src/pages/ReferralPage'
          ],
          'pages-misc': [
            './src/pages/AdminPage'
          ]
        },
        
        // 🔥 修復：確保正確的模組格式和 MIME 類型
        format: 'es',
        entryFileNames: `js/[name]-[hash].js`,
        chunkFileNames: `js/[name]-[hash].js`,
        assetFileNames: (assetInfo) => {
          if (!assetInfo.name) {
            return `assets/[name]-[hash][extname]`;
          }
          if (/\.(png|jpe?g|svg|gif|tiff|bmp|ico)$/i.test(assetInfo.name)) {
            return `images/[name]-[hash][extname]`;
          }
          if (/\.(woff2?|eot|ttf|otf)$/i.test(assetInfo.name)) {
            return `fonts/[name]-[hash][extname]`;
          }
          return `assets/[name]-[hash][extname]`;
        }
      }
    },
    
    // 🔥 優化：生產環境壓縮優化
    minify: 'terser',
    terserOptions: {
      compress: {
        // 只在生產環境移除 console.log
        drop_console: mode === 'production',
        drop_debugger: mode === 'production',
        pure_funcs: mode === 'production' ? ['console.log', 'console.info', 'console.debug'] : [],
        // 🔥 新增：移除未使用代碼
        unused: true,
        // 移除死代碼
        dead_code: true,
        // 保留 console.warn 和 console.error
        keep_fnames: false,
      },
      format: {
        comments: false, // 移除所有註釋
      },
      mangle: {
        safari10: true
      }
    },
    
    // 🔥 優化：資源處理
    assetsInlineLimit: 4096, // 4KB 以下的資源內聯
    sourcemap: false, // 生產環境關閉 sourcemap 以減少包大小
    
    // 🔥 新增：分塊大小優化
    chunkSizeWarningLimit: 1000, // 1MB 警告閾值
    
    // 🔥 新增：CSS 代碼分割
    cssCodeSplit: true
  },
  
  // 🔥 優化：開發環境優化
  server: {
    fs: {
      // 放寬文件系統存取限制，有助於解決某些環境下的模組解析問題
      strict: false,
    },
    // 🔥 新增：HMR 優化
    hmr: {
      overlay: false // 減少開發環境錯誤覆蓋的干擾
    },
    // 🔥 新增：API 代理配置，解決本地開發 RPC 問題
    proxy: {
      '/api/rpc-optimized': {
        target: 'https://bsc-dataseed1.defibit.io',
        changeOrigin: true,
        secure: true,
        rewrite: () => '/',
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, res) => {
            console.log('🔧 本地 RPC 代理失敗，使用降級模式');
            // 提供基本的 JSON-RPC 響應
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              jsonrpc: '2.0',
              error: { code: -32603, message: 'Local development mode - RPC unavailable' },
              id: null
            }));
          });
        }
      },
      '/api/metadata': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, res) => {
            console.log('📝 元數據服務不可用，使用模擬數據');
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Metadata service unavailable in local dev' }));
          });
        }
      }
    }
    // 移除 headers 設置，讓 Vite 自動處理 MIME 類型
  },
  
  // 🔥 新增：依賴預構建優化
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      '@apollo/client',
      'wagmi',
      'viem',
      '@tanstack/react-query',
      'zustand'
    ],
    exclude: [
      // 大型庫按需載入，不預構建
      '@tanstack/react-virtual'
    ]
  },
  
  // 🔥 新增：解析優化
  resolve: {
    alias: {
      // 可以在這裡添加路徑別名以提高導入效率
      '@': '/src'
    }
  },
  
  // 🔥 新增：CSS 優化
  css: {
    devSourcemap: true, // 開發環境保留 CSS sourcemap
    preprocessorOptions: {
      // 如果使用 SCSS/SASS，可以在這裡添加全局變量
    }
  }
}))