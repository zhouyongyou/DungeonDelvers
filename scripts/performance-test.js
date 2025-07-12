#!/usr/bin/env node

import { execSync } from 'child_process'
import { readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'

console.log('⚡ 性能測試開始...')

try {
  // 啟動開發服務器
  console.log('🚀 啟動開發服務器...')
  const server = execSync('npm run dev', { 
    stdio: 'pipe',
    detached: true 
  })
  
  // 等待服務器啟動
  await new Promise(resolve => setTimeout(resolve, 5000))
  
  // 運行 Lighthouse 測試
  console.log('🔍 運行 Lighthouse 測試...')
  const lighthouseResult = execSync(
    'npx lighthouse http://localhost:5174 --output=json --output-path=./lighthouse-report.json --chrome-flags="--headless"',
    { encoding: 'utf8' }
  )
  
  // 讀取測試結果
  const report = JSON.parse(readFileSync('./lighthouse-report.json', 'utf8'))
  
  // 顯示性能分數
  console.log('\n📊 Lighthouse 性能分數:')
  console.log(`  Performance: ${report.categories.performance.score * 100}/100`)
  console.log(`  Accessibility: ${report.categories.accessibility.score * 100}/100`)
  console.log(`  Best Practices: ${report.categories['best-practices'].score * 100}/100`)
  console.log(`  SEO: ${report.categories.seo.score * 100}/100`)
  
  // 顯示關鍵指標
  console.log('\n🎯 關鍵性能指標:')
  const metrics = report.audits
  console.log(`  First Contentful Paint: ${metrics['first-contentful-paint'].displayValue}`)
  console.log(`  Largest Contentful Paint: ${metrics['largest-contentful-paint'].displayValue}`)
  console.log(`  First Input Delay: ${metrics['max-potential-fid'].displayValue}`)
  console.log(`  Cumulative Layout Shift: ${metrics['cumulative-layout-shift'].displayValue}`)
  
  // 生成性能報告
  const performanceReport = {
    timestamp: new Date().toISOString(),
    scores: {
      performance: report.categories.performance.score * 100,
      accessibility: report.categories.accessibility.score * 100,
      bestPractices: report.categories['best-practices'].score * 100,
      seo: report.categories.seo.score * 100,
    },
    metrics: {
      fcp: metrics['first-contentful-paint'].numericValue,
      lcp: metrics['largest-contentful-paint'].numericValue,
      fid: metrics['max-potential-fid'].numericValue,
      cls: metrics['cumulative-layout-shift'].numericValue,
    },
    recommendations: report.audits
      .filter(audit => audit.score !== null && audit.score < 1)
      .map(audit => ({
        title: audit.title,
        description: audit.description,
        score: audit.score,
      }))
  }
  
  writeFileSync('./performance-report.json', JSON.stringify(performanceReport, null, 2))
  console.log('\n✅ 性能測試完成！')
  console.log('📄 詳細報告已保存到: performance-report.json')
  
  // 停止服務器
  process.kill(-server.pid)
  
} catch (error) {
  console.error('❌ 性能測試失敗:', error.message)
  process.exit(1)
} 