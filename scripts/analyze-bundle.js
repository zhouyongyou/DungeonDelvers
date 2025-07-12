#!/usr/bin/env node

import { execSync } from 'child_process'
import { readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'

console.log('🔍 分析包大小...')

try {
  // 構建項目
  console.log('📦 構建項目...')
  execSync('npm run build', { stdio: 'inherit' })

  // 分析包大小
  console.log('📊 分析包大小...')
  const result = execSync('npx vite-bundle-analyzer dist', { encoding: 'utf8' })
  
  // 保存分析結果
  const analysisPath = resolve(process.cwd(), 'bundle-analysis.txt')
  writeFileSync(analysisPath, result)
  
  console.log('✅ 包大小分析完成！')
  console.log(`📄 分析結果已保存到: ${analysisPath}`)
  
  // 顯示包大小統計
  const stats = execSync('npx vite-bundle-analyzer --json dist', { encoding: 'utf8' })
  const bundleStats = JSON.parse(stats)
  
  console.log('\n📈 包大小統計:')
  Object.entries(bundleStats).forEach(([name, size]) => {
    console.log(`  ${name}: ${(size / 1024 / 1024).toFixed(2)} MB`)
  })
  
} catch (error) {
  console.error('❌ 分析失敗:', error.message)
  process.exit(1)
} 