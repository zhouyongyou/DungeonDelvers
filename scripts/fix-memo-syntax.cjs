#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/pages/MintPage.tsx');

// 讀取文件
let content = fs.readFileSync(filePath, 'utf8');

// 定義需要修復的組件
const componentsToFix = [
  { name: 'RarityProbabilities', endLine: '};' },
  { name: 'MintResultModal', endLine: '};' },
  { name: 'MintCard', endLine: '};' },
  { name: 'MintingInterface', endLine: '};' },
  { name: 'MintPage', endLine: '};' }
];

// 修復每個組件
componentsToFix.forEach(component => {
  // 找到組件結尾的 };
  const regex = new RegExp(`(const ${component.name}[\\s\\S]*?)\\};`, 'g');
  content = content.replace(regex, (match, p1) => {
    return `${p1}});`;
  });
  
  // 在組件後添加 displayName
  const displayNameRegex = new RegExp(`(const ${component.name}[\\s\\S]*?\\});`, 'g');
  content = content.replace(displayNameRegex, (match) => {
    return `${match}\n${component.name}.displayName = '${component.name}';`;
  });
});

// 寫回文件
fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ Fixed memo syntax in MintPage.tsx');