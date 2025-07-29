// Bundle 分析和優化工具

interface ModuleInfo {
  name: string;
  size: number;
  type: 'vendor' | 'page' | 'component' | 'utility';
  dynamicImport: boolean;
}

interface BundleAnalysis {
  totalSize: number;
  gzippedSize: number;
  modules: ModuleInfo[];
  suggestions: string[];
  performance: {
    score: number;
    issues: string[];
  };
}

// 模擬的 bundle 分析（實際中會從 build stats 獲取）
export const analyzeBundleSize = (): BundleAnalysis => {
  // 這裡會是實際的 bundle 分析邏輯
  // 在真實應用中，這些數據會來自 webpack-bundle-analyzer 或類似工具
  
  const modules: ModuleInfo[] = [
    // 框架核心
    { name: 'react', size: 45000, type: 'vendor', dynamicImport: false },
    { name: 'react-dom', size: 130000, type: 'vendor', dynamicImport: false },
    
    // Web3 相關
    { name: 'wagmi', size: 85000, type: 'vendor', dynamicImport: false },
    { name: 'viem', size: 95000, type: 'vendor', dynamicImport: false },
    { name: '@tanstack/react-query', size: 75000, type: 'vendor', dynamicImport: false },
    
    // Apollo GraphQL
    { name: '@apollo/client', size: 120000, type: 'vendor', dynamicImport: false },
    { name: 'graphql', size: 45000, type: 'vendor', dynamicImport: false },
    
    // 狀態管理
    { name: 'zustand', size: 15000, type: 'vendor', dynamicImport: false },
    
    // 頁面組件（動態導入）
    { name: 'pages/OverviewPage', size: 25000, type: 'page', dynamicImport: true },
    { name: 'pages/MintPage', size: 20000, type: 'page', dynamicImport: true },
    { name: 'pages/DungeonPage', size: 35000, type: 'page', dynamicImport: true },
    { name: 'pages/VipPage', size: 30000, type: 'page', dynamicImport: true },
    { name: 'pages/MyAssetsPageEnhanced', size: 28000, type: 'page', dynamicImport: true },
    
    // 工具庫
    { name: 'utils', size: 15000, type: 'utility', dynamicImport: false },
    { name: 'hooks', size: 20000, type: 'utility', dynamicImport: false },
    { name: 'components', size: 40000, type: 'component', dynamicImport: false },
  ];

  const totalSize = modules.reduce((sum, module) => sum + module.size, 0);
  const gzippedSize = Math.round(totalSize * 0.3); // 大約 70% 壓縮率

  const suggestions = generateOptimizationSuggestions(modules, totalSize);
  const performance = analyzePerformance(modules, totalSize);

  return {
    totalSize,
    gzippedSize,
    modules,
    suggestions,
    performance,
  };
};

const generateOptimizationSuggestions = (modules: ModuleInfo[], totalSize: number): string[] => {
  const suggestions: string[] = [];

  // 檢查大型 vendor 模塊
  const largeVendors = modules
    .filter(m => m.type === 'vendor' && m.size > 80000)
    .sort((a, b) => b.size - a.size);

  if (largeVendors.length > 0) {
    suggestions.push(
      `考慮對以下大型 vendor 模塊進行優化: ${largeVendors.map(m => m.name).join(', ')}`
    );
  }

  // 檢查是否所有頁面都進行了動態導入
  const staticPages = modules.filter(m => m.type === 'page' && !m.dynamicImport);
  if (staticPages.length > 0) {
    suggestions.push(
      `以下頁面應該使用動態導入: ${staticPages.map(m => m.name).join(', ')}`
    );
  }

  // 檢查總包大小
  if (totalSize > 1000000) { // 1MB
    suggestions.push('總包大小超過 1MB，考慮進一步分割代碼');
  }

  // 檢查是否有機會進行 tree shaking
  const utilityModules = modules.filter(m => m.type === 'utility');
  if (utilityModules.some(m => m.size > 30000)) {
    suggestions.push('工具模塊較大，檢查是否存在未使用的代碼');
  }

  return suggestions;
};

const analyzePerformance = (modules: ModuleInfo[], totalSize: number) => {
  let score = 100;
  const issues: string[] = [];

  // 總大小評分
  if (totalSize > 1500000) { // 1.5MB
    score -= 30;
    issues.push('包總大小過大');
  } else if (totalSize > 1000000) { // 1MB
    score -= 15;
    issues.push('包大小較大');
  }

  // Vendor 模塊評分
  const vendorSize = modules
    .filter(m => m.type === 'vendor')
    .reduce((sum, m) => sum + m.size, 0);
  
  if (vendorSize > totalSize * 0.7) {
    score -= 20;
    issues.push('Vendor 模塊佔比過高');
  }

  // 動態導入評分
  const pageModules = modules.filter(m => m.type === 'page');
  const dynamicPages = pageModules.filter(m => m.dynamicImport);
  const dynamicRatio = dynamicPages.length / pageModules.length;
  
  if (dynamicRatio < 0.8) {
    score -= 15;
    issues.push('頁面動態導入覆蓋率不足');
  }

  return {
    score: Math.max(score, 0),
    issues,
  };
};

// 生成包大小報告
export const generateBundleReport = (): string => {
  const analysis = analyzeBundleSize();
  
  let report = '# Bundle 分析報告\n\n';
  
  report += `## 總體概況\n`;
  report += `- 總大小: ${(analysis.totalSize / 1024).toFixed(2)} KB\n`;
  report += `- Gzip 後: ${(analysis.gzippedSize / 1024).toFixed(2)} KB\n`;
  report += `- 性能評分: ${analysis.performance.score}/100\n\n`;
  
  report += `## 模塊分析\n`;
  const groupedModules = groupModulesByType(analysis.modules);
  
  Object.entries(groupedModules).forEach(([type, modules]) => {
    const totalSize = modules.reduce((sum, m) => sum + m.size, 0);
    report += `### ${type.toUpperCase()} (${(totalSize / 1024).toFixed(2)} KB)\n`;
    
    modules
      .sort((a, b) => b.size - a.size)
      .forEach(module => {
        const sizeKB = (module.size / 1024).toFixed(2);
        const dynamic = module.dynamicImport ? ' (動態)' : '';
        report += `- ${module.name}: ${sizeKB} KB${dynamic}\n`;
      });
    
    report += '\n';
  });
  
  if (analysis.suggestions.length > 0) {
    report += `## 優化建議\n`;
    analysis.suggestions.forEach(suggestion => {
      report += `- ${suggestion}\n`;
    });
    report += '\n';
  }
  
  if (analysis.performance.issues.length > 0) {
    report += `## 性能問題\n`;
    analysis.performance.issues.forEach(issue => {
      report += `- ${issue}\n`;
    });
  }
  
  return report;
};

const groupModulesByType = (modules: ModuleInfo[]) => {
  return modules.reduce((groups, module) => {
    if (!groups[module.type]) {
      groups[module.type] = [];
    }
    groups[module.type].push(module);
    return groups;
  }, {} as Record<string, ModuleInfo[]>);
};

// 監控運行時性能
export const monitorRuntimePerformance = () => {
  if (typeof window === 'undefined') return;

  // 監控首次內容繪製 (FCP)
  if ('PerformanceObserver' in window) {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'paint') {
          console.log(`${entry.name}: ${entry.startTime.toFixed(2)}ms`);
        }
        
        if (entry.entryType === 'largest-contentful-paint') {
          console.log(`LCP: ${entry.startTime.toFixed(2)}ms`);
        }
      }
    });

    observer.observe({ entryTypes: ['paint', 'largest-contentful-paint'] });
  }

  // 監控資源加載時間
  window.addEventListener('load', () => {
    setTimeout(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      
      const metrics = {
        '頁面加載總時間': navigation.loadEventEnd - navigation.fetchStart,
        'DNS 查詢時間': navigation.domainLookupEnd - navigation.domainLookupStart,
        'TCP 連接時間': navigation.connectEnd - navigation.connectStart,
        '請求響應時間': navigation.responseEnd - navigation.requestStart,
        'DOM 構建時間': navigation.domContentLoadedEventEnd - navigation.domLoading,
      };

      console.group('性能指標');
      Object.entries(metrics).forEach(([name, time]) => {
        console.log(`${name}: ${time.toFixed(2)}ms`);
      });
      console.groupEnd();
    }, 0);
  });
};

// 檢查當前環境是否為生產環境
export const isProduction = () => {
  return import.meta.env.PROD;
};

// 在開發環境中顯示 bundle 分析
if (!isProduction() && typeof window !== 'undefined') {
  // 延遲執行以避免影響初始加載
  setTimeout(() => {
    console.group('📦 Bundle 分析');
    console.log(generateBundleReport());
    console.groupEnd();
    
    monitorRuntimePerformance();
  }, 3000);
}