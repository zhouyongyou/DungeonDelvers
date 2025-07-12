// scripts/reorganize-ipfs-structure.js
// 重新組織 IPFS 文件結構以匹配智能合約的 tokenURI 邏輯

const fs = require('fs');
const path = require('path');

// 定義新的目錄結構
const NEW_STRUCTURE = {
  hero: {
    // 將 hero-1.json 移動到 hero/1.json
    '1.json': 'hero-1.json',
    '2.json': 'hero-2.json',
    '3.json': 'hero-3.json',
    '4.json': 'hero-4.json',
    '5.json': 'hero-5.json',
  },
  relic: {
    // 將 relic-1.json 移動到 relic/1.json
    '1.json': 'relic-1.json',
    '2.json': 'relic-2.json',
    '3.json': 'relic-3.json',
    '4.json': 'relic-4.json',
    '5.json': 'relic-5.json',
  },
  party: {
    // 將 party.json 移動到 party/1.json
    '1.json': 'party.json',
  },
  profile: {
    // 將 profile.json 移動到 profile/1.json
    '1.json': 'profile.json',
  },
  vip: {
    // 將 vip.json 移動到 vip/1.json
    '1.json': 'vip.json',
  }
};

// 讀取現有的 JSON 文件
function readJsonFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`❌ 讀取文件失敗: ${filePath}`, error.message);
    return null;
  }
}

// 寫入 JSON 文件
function writeJsonFile(filePath, data) {
  try {
    // 確保目錄存在
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log(`✅ 寫入文件: ${filePath}`);
  } catch (error) {
    console.error(`❌ 寫入文件失敗: ${filePath}`, error.message);
  }
}

// 重新組織文件結構
function reorganizeFiles() {
  console.log('🔧 開始重新組織 IPFS 文件結構...');
  
  const sourceDir = 'ipfs-metadata';
  const outputDir = 'ipfs-metadata-reorganized';
  
  // 清理輸出目錄
  if (fs.existsSync(outputDir)) {
    fs.rmSync(outputDir, { recursive: true });
  }
  fs.mkdirSync(outputDir);
  
  // 處理每個類型
  for (const [type, files] of Object.entries(NEW_STRUCTURE)) {
    console.log(`\n📁 處理 ${type} 類型...`);
    
    for (const [newName, oldName] of Object.entries(files)) {
      const sourcePath = path.join(sourceDir, oldName);
      const targetPath = path.join(outputDir, type, newName);
      
      if (fs.existsSync(sourcePath)) {
        const data = readJsonFile(sourcePath);
        if (data) {
          writeJsonFile(targetPath, data);
        }
      } else {
        console.log(`⚠️  源文件不存在: ${sourcePath}`);
      }
    }
  }
  
  console.log('\n🎉 文件重新組織完成！');
  console.log(`📁 新結構保存在: ${outputDir}`);
  console.log('\n📋 新的目錄結構:');
  console.log('ipfs-metadata-reorganized/');
  console.log('├── hero/');
  console.log('│   ├── 1.json');
  console.log('│   ├── 2.json');
  console.log('│   ├── 3.json');
  console.log('│   ├── 4.json');
  console.log('│   └── 5.json');
  console.log('├── relic/');
  console.log('│   ├── 1.json');
  console.log('│   ├── 2.json');
  console.log('│   ├── 3.json');
  console.log('│   ├── 4.json');
  console.log('│   └── 5.json');
  console.log('├── party/');
  console.log('│   └── 1.json');
  console.log('├── profile/');
  console.log('│   └── 1.json');
  console.log('└── vip/');
  console.log('    └── 1.json');
  
  console.log('\n🚀 下一步:');
  console.log('1. 將 ipfs-metadata-reorganized 目錄上傳到 IPFS');
  console.log('2. 使用新的 IPFS hash 更新智能合約的 baseURI');
  console.log('3. 測試 NFT 鑄造和顯示');
}

// 執行重新組織
reorganizeFiles(); 