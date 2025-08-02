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
      
      // 🔥 新增：依賴去重優化
      onwarn(warning, warn) {
        // 忽略重複依賴警告，因為 Web3 生態系統中這很常見
        if (warning.code === 'CIRCULAR_DEPENDENCY') return;
        if (warning.code === 'PLUGIN_WARNING') return;
        warn(warning);
      },
      output: {
        manualChunks: (id) => {
          // 🔥 優化：更智能的代碼分割策略
          
          // React 核心
          if (id.includes('react') || id.includes('react-dom')) {
            return 'react-vendor';
          }
          
          // Web3 核心（減少包大小）
          if (id.includes('wagmi') || id.includes('viem') || id.includes('@tanstack/react-query')) {
            return 'web3-vendor';
          }
          
          // GraphQL
          if (id.includes('@apollo/client') || id.includes('graphql')) {
            return 'apollo-vendor';
          }
          
          // Wallet Connectors - 分離出來以減少核心包大小
          if (id.includes('@coinbase/wallet-sdk') || 
              id.includes('@walletconnect') || 
              id.includes('@base-org/account') ||
              id.includes('@reown')) {
            return 'wallet-connectors';
          }
          
          // 工具庫
          if (id.includes('zustand') || id.includes('lodash') || id.includes('date-fns')) {
            return 'ui-vendor';
          }
          
          // 市場相關組件
          if (id.includes('marketplace') || id.includes('components/marketplace')) {
            return 'marketplace-components';
          }
          
          // 分析和圖表
          if (id.includes('analytics') || id.includes('leaderboard') || id.includes('chart')) {
            return 'analytics-components';
          }
          
          // Admin 和開發工具
          if (id.includes('admin') || id.includes('components/admin') || id.includes('DevTools')) {
            return 'admin-tools';
          }
          
          // 保持頁面分割但使用動態檢測
          if (id.includes('OverviewPage') || id.includes('MintPage') || id.includes('MyAssetsPage')) {
            return 'pages-core';
          }
          if (id.includes('DungeonPage') || id.includes('AltarPage')) {
            return 'pages-game';
          }
          if (id.includes('VipPage') || id.includes('ReferralPage') || id.includes('ProfilePage')) {
            return 'pages-profile';
          }
          if (id.includes('AdminPage') || id.includes('CodexPage') || id.includes('GameDataPage')) {
            return 'pages-misc';
          }
          if (id.includes('MarketplacePage')) {
            return 'pages-marketplace';
          }
          
          // 其他 node_modules
          if (id.includes('node_modules')) {
            return 'vendor';
          }
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