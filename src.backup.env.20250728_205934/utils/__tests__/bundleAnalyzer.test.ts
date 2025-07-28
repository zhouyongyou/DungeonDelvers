import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  analyzeBundleSize, 
  generateBundleReport, 
  isProduction 
} from '../bundleAnalyzer';

// Mock process.env
const originalEnv = process.env;

beforeEach(() => {
  vi.clearAllMocks();
  process.env = { ...originalEnv };
});

afterEach(() => {
  process.env = originalEnv;
});

describe('bundleAnalyzer', () => {
  describe('analyzeBundleSize', () => {
    it('應該返回完整的分析結果', () => {
      const analysis = analyzeBundleSize();

      expect(analysis).toHaveProperty('totalSize');
      expect(analysis).toHaveProperty('gzippedSize');
      expect(analysis).toHaveProperty('modules');
      expect(analysis).toHaveProperty('suggestions');
      expect(analysis).toHaveProperty('performance');

      expect(typeof analysis.totalSize).toBe('number');
      expect(typeof analysis.gzippedSize).toBe('number');
      expect(Array.isArray(analysis.modules)).toBe(true);
      expect(Array.isArray(analysis.suggestions)).toBe(true);
      expect(typeof analysis.performance).toBe('object');
    });

    it('應該計算正確的總大小', () => {
      const analysis = analyzeBundleSize();
      
      const calculatedTotal = analysis.modules.reduce((sum, module) => sum + module.size, 0);
      expect(analysis.totalSize).toBe(calculatedTotal);
    });

    it('應該計算合理的 gzip 大小', () => {
      const analysis = analyzeBundleSize();
      
      // Gzip 大小應該約為原始大小的 30%
      const expectedGzipSize = Math.round(analysis.totalSize * 0.3);
      expect(analysis.gzippedSize).toBe(expectedGzipSize);
      expect(analysis.gzippedSize).toBeLessThan(analysis.totalSize);
    });

    it('應該包含正確的模塊類型', () => {
      const analysis = analyzeBundleSize();
      
      const moduleTypes = analysis.modules.map(m => m.type);
      expect(moduleTypes).toContain('vendor');
      expect(moduleTypes).toContain('page');
      expect(moduleTypes).toContain('component');
      expect(moduleTypes).toContain('utility');
    });

    it('應該包含動態導入的頁面模塊', () => {
      const analysis = analyzeBundleSize();
      
      const pageModules = analysis.modules.filter(m => m.type === 'page');
      const dynamicPages = pageModules.filter(m => m.dynamicImport);
      
      expect(pageModules.length).toBeGreaterThan(0);
      expect(dynamicPages.length).toBeGreaterThan(0);
    });

    it('應該包含性能評分', () => {
      const analysis = analyzeBundleSize();
      
      expect(analysis.performance).toHaveProperty('score');
      expect(analysis.performance).toHaveProperty('issues');
      expect(typeof analysis.performance.score).toBe('number');
      expect(analysis.performance.score).toBeGreaterThanOrEqual(0);
      expect(analysis.performance.score).toBeLessThanOrEqual(100);
      expect(Array.isArray(analysis.performance.issues)).toBe(true);
    });
  });

  describe('generateBundleReport', () => {
    it('應該生成完整的報告字符串', () => {
      const report = generateBundleReport();
      
      expect(typeof report).toBe('string');
      expect(report.length).toBeGreaterThan(0);
    });

    it('報告應該包含所有主要部分', () => {
      const report = generateBundleReport();
      
      expect(report).toContain('# Bundle 分析報告');
      expect(report).toContain('## 總體概況');
      expect(report).toContain('## 模塊分析');
      expect(report).toContain('總大小:');
      expect(report).toContain('Gzip 後:');
      expect(report).toContain('性能評分:');
    });

    it('報告應該包含模塊分類', () => {
      const report = generateBundleReport();
      
      expect(report).toContain('### VENDOR');
      expect(report).toContain('### PAGE');
      expect(report).toContain('### COMPONENT');
      expect(report).toContain('### UTILITY');
    });

    it('報告應該包含大小信息', () => {
      const report = generateBundleReport();
      
      expect(report).toMatch(/\d+\.\d+ KB/);
      expect(report).toContain('(動態)');
    });

    it('有建議時應該包含優化建議', () => {
      const report = generateBundleReport();
      
      // 根據當前的模塊配置，應該會有一些建議
      const hasSuggestions = report.includes('## 優化建議');
      if (hasSuggestions) {
        expect(report).toMatch(/- .+/);
      }
    });

    it('有性能問題時應該包含問題列表', () => {
      const report = generateBundleReport();
      
      // 根據當前的模塊配置，可能會有性能問題
      const hasIssues = report.includes('## 性能問題');
      if (hasIssues) {
        expect(report).toMatch(/- .+/);
      }
    });
  });

  describe('isProduction', () => {
    it('在生產環境中應該返回 true', () => {
      process.env.NODE_ENV = 'production';
      expect(isProduction()).toBe(true);
    });

    it('在開發環境中應該返回 false', () => {
      process.env.NODE_ENV = 'development';
      expect(isProduction()).toBe(false);
    });

    it('在測試環境中應該返回 false', () => {
      process.env.NODE_ENV = 'test';
      expect(isProduction()).toBe(false);
    });

    it('環境變量未設置時應該返回 false', () => {
      delete process.env.NODE_ENV;
      expect(isProduction()).toBe(false);
    });
  });

  describe('優化建議邏輯', () => {
    it('應該建議對大型 vendor 模塊進行優化', () => {
      const analysis = analyzeBundleSize();
      
      // 檢查是否有大於 80KB 的 vendor 模塊
      const largeVendors = analysis.modules.filter(m => 
        m.type === 'vendor' && m.size > 80000
      );
      
      if (largeVendors.length > 0) {
        const hasVendorSuggestion = analysis.suggestions.some(s => 
          s.includes('大型 vendor 模塊')
        );
        expect(hasVendorSuggestion).toBe(true);
      }
    });

    it('應該建議對非動態導入的頁面進行優化', () => {
      const analysis = analyzeBundleSize();
      
      const staticPages = analysis.modules.filter(m => 
        m.type === 'page' && !m.dynamicImport
      );
      
      if (staticPages.length > 0) {
        const hasDynamicImportSuggestion = analysis.suggestions.some(s => 
          s.includes('動態導入')
        );
        expect(hasDynamicImportSuggestion).toBe(true);
      }
    });

    it('總包大小過大時應該給出建議', () => {
      const analysis = analyzeBundleSize();
      
      if (analysis.totalSize > 1000000) { // 1MB
        const hasSizeSuggestion = analysis.suggestions.some(s => 
          s.includes('總包大小') || s.includes('代碼分割')
        );
        expect(hasSizeSuggestion).toBe(true);
      }
    });
  });

  describe('性能評分邏輯', () => {
    it('包大小過大時應該降低評分', () => {
      const analysis = analyzeBundleSize();
      
      if (analysis.totalSize > 1500000) { // 1.5MB
        expect(analysis.performance.score).toBeLessThan(100);
        expect(analysis.performance.issues.some(issue => 
          issue.includes('包') && issue.includes('大小')
        )).toBe(true);
      }
    });

    it('vendor 模塊佔比過高時應該降低評分', () => {
      const analysis = analyzeBundleSize();
      
      const vendorSize = analysis.modules
        .filter(m => m.type === 'vendor')
        .reduce((sum, m) => sum + m.size, 0);
      
      if (vendorSize > analysis.totalSize * 0.7) {
        expect(analysis.performance.score).toBeLessThan(100);
        expect(analysis.performance.issues.some(issue => 
          issue.includes('Vendor') && issue.includes('佔比')
        )).toBe(true);
      }
    });

    it('動態導入覆蓋率不足時應該降低評分', () => {
      const analysis = analyzeBundleSize();
      
      const pageModules = analysis.modules.filter(m => m.type === 'page');
      const dynamicPages = pageModules.filter(m => m.dynamicImport);
      const dynamicRatio = dynamicPages.length / pageModules.length;
      
      if (dynamicRatio < 0.8 && pageModules.length > 0) {
        expect(analysis.performance.score).toBeLessThan(100);
        expect(analysis.performance.issues.some(issue => 
          issue.includes('動態導入') && issue.includes('覆蓋率')
        )).toBe(true);
      }
    });

    it('評分應該在 0-100 範圍內', () => {
      const analysis = analyzeBundleSize();
      
      expect(analysis.performance.score).toBeGreaterThanOrEqual(0);
      expect(analysis.performance.score).toBeLessThanOrEqual(100);
    });
  });
});