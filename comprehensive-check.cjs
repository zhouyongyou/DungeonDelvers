const fs = require('fs');
const path = require('path');

console.log('🔍 全面系統銜接檢查開始...\n');

// 1. 檢查合約地址一致性
console.log('📋 1. 合約地址一致性檢查');
console.log('='.repeat(50));

// 從 contracts.ts 提取地址
const frontendAddresses = {
  hero: '0x2a046140668cBb8F598ff3852B08852A8EB23b6a',
  relic: '0x95F005e2e0d38381576DA36c5CA4619a87da550E',
  party: '0x11FB68409222B53b04626d382d7e691e640A1DcD',
  playerProfile: '0x43a9BE911f1074788A00cE8e6E00732c7364c1F4',
  vipStaking: '0xefdfF583944A2c6318d1597AD1E41159fCd8F6dB',
  dungeonMaster: '0xd14A5eFFc45D0131af3eb876992fC6eD9683f5B0',
  altarOfAscension: '0x83a7fB85E0892A67041FcFc4c1F0F1111e5aB3DA',
  playerVault: '0x6187DBCcb58088E414437A6b8d58a42cD2BD1ec4',
  oracle: '0xc5bBFfFf552167D1328432AA856B752e9c4b4838'
};

// 從 subgraph.yaml 提取地址
const subgraphAddresses = {
  hero: '0x2a046140668cBb8F598ff3852B08852A8EB23b6a',
  relic: '0x95F005e2e0d38381576DA36c5CA4619a87da550E',
  party: '0x11FB68409222B53b04626d382d7e691e640A1DcD',
  playerProfile: '0x43a9BE911f1074788A00cE8e6E00732c7364c1F4',
  vipStaking: '0xefdfF583944A2c6318d1597AD1E41159fCd8F6dB',
  dungeonMaster: '0xd14A5eFFc45D0131af3eb876992fC6eD9683f5B0',
  playerVault: '0x6187DBCcb58088E414437A6b8d58a42cD2BD1ec4',
  altarOfAscension: '0x83a7fB85E0892A67041FcFc4c1F0F1111e5aB3DA'
};

let addressMismatches = [];
for (const [contract, frontendAddr] of Object.entries(frontendAddresses)) {
  if (subgraphAddresses[contract] && frontendAddr !== subgraphAddresses[contract]) {
    addressMismatches.push({
      contract,
      frontend: frontendAddr,
      subgraph: subgraphAddresses[contract]
    });
  }
}

if (addressMismatches.length === 0) {
  console.log('✅ 所有合約地址一致');
} else {
  console.log('❌ 發現地址不一致:');
  addressMismatches.forEach(mismatch => {
    console.log(`   ${mismatch.contract}:`);
    console.log(`     前端: ${mismatch.frontend}`);
    console.log(`     子圖: ${mismatch.subgraph}`);
  });
}

// 2. 檢查 ABI 文件存在性
console.log('\n📋 2. ABI 文件存在性檢查');
console.log('='.repeat(50));

const abiFiles = [
  'DDgraphql/dungeon-delvers/abis/Hero.json',
  'DDgraphql/dungeon-delvers/abis/Relic.json',
  'DDgraphql/dungeon-delvers/abis/Party.json',
  'DDgraphql/dungeon-delvers/abis/PlayerProfile.json',
  'DDgraphql/dungeon-delvers/abis/VIPStaking.json',
  'DDgraphql/dungeon-delvers/abis/DungeonMaster.json',
  'DDgraphql/dungeon-delvers/abis/PlayerVault.json',
  'DDgraphql/dungeon-delvers/abis/AltarOfAscension.json'
];

let missingAbiFiles = [];
abiFiles.forEach(file => {
  if (!fs.existsSync(file)) {
    missingAbiFiles.push(file);
  }
});

if (missingAbiFiles.length === 0) {
  console.log('✅ 所有 ABI 文件存在');
} else {
  console.log('❌ 缺少 ABI 文件:');
  missingAbiFiles.forEach(file => {
    console.log(`   ${file}`);
  });
}

// 3. 檢查前端 GraphQL 查詢
console.log('\n📋 3. 前端 GraphQL 查詢檢查');
console.log('='.repeat(50));

const graphqlFiles = [
  'src/components/ui/MintPrice.tsx'
];

let graphqlIssues = [];
graphqlFiles.forEach(file => {
  if (fs.existsSync(file)) {
    const content = fs.readFileSync(file, 'utf8');
    if (content.includes('@apollo/client')) {
      console.log(`✅ ${file} 使用 Apollo Client`);
    } else {
      graphqlIssues.push(`${file} 未使用 Apollo Client`);
    }
  } else {
    graphqlIssues.push(`${file} 文件不存在`);
  }
});

if (graphqlIssues.length === 0) {
  console.log('✅ GraphQL 查詢配置正確');
} else {
  console.log('❌ GraphQL 問題:');
  graphqlIssues.forEach(issue => {
    console.log(`   ${issue}`);
  });
}

// 4. 檢查子圖事件處理器
console.log('\n📋 4. 子圖事件處理器檢查');
console.log('='.repeat(50));

const subgraphHandlers = [
  'DDgraphql/dungeon-delvers/src/hero.ts',
  'DDgraphql/dungeon-delvers/src/relic.ts',
  'DDgraphql/dungeon-delvers/src/party.ts',
  'DDgraphql/dungeon-delvers/src/player-profile.ts',
  'DDgraphql/dungeon-delvers/src/vip-staking.ts',
  'DDgraphql/dungeon-delvers/src/dungeon-master.ts',
  'DDgraphql/dungeon-delvers/src/player-vault.ts',
  'DDgraphql/dungeon-delvers/src/altar-of-ascension.ts'
];

let missingHandlers = [];
subgraphHandlers.forEach(file => {
  if (!fs.existsSync(file)) {
    missingHandlers.push(file);
  }
});

if (missingHandlers.length === 0) {
  console.log('✅ 所有事件處理器存在');
} else {
  console.log('❌ 缺少事件處理器:');
  missingHandlers.forEach(file => {
    console.log(`   ${file}`);
  });
}

// 5. 檢查前端合約調用
console.log('\n📋 5. 前端合約調用檢查');
console.log('='.repeat(50));

const contractCallFiles = [
  'src/pages/MintPage.tsx',
  'src/pages/MyAssetsPage.tsx',
  'src/pages/DungeonPage.tsx',
  'src/pages/AltarPage.tsx',
  'src/pages/VipPage.tsx'
];

let contractCallIssues = [];
contractCallFiles.forEach(file => {
  if (fs.existsSync(file)) {
    const content = fs.readFileSync(file, 'utf8');
    if (content.includes('useContractRead') || content.includes('useContractWrite')) {
      console.log(`✅ ${file} 包含合約調用`);
    } else {
      contractCallIssues.push(`${file} 缺少合約調用`);
    }
  } else {
    contractCallIssues.push(`${file} 文件不存在`);
  }
});

if (contractCallIssues.length === 0) {
  console.log('✅ 前端合約調用配置正確');
} else {
  console.log('❌ 合約調用問題:');
  contractCallIssues.forEach(issue => {
    console.log(`   ${issue}`);
  });
}

// 6. 檢查環境配置
console.log('\n📋 6. 環境配置檢查');
console.log('='.repeat(50));

const envFiles = [
  '.env',
  '.env.local',
  '.env.production'
];

let envIssues = [];
envFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file} 存在`);
  } else {
    envIssues.push(`${file} 不存在`);
  }
});

if (envIssues.length === 0) {
  console.log('✅ 環境配置文件完整');
} else {
  console.log('⚠️  環境配置問題:');
  envIssues.forEach(issue => {
    console.log(`   ${issue}`);
  });
}

// 7. 檢查依賴項
console.log('\n📋 7. 依賴項檢查');
console.log('='.repeat(50));

const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const requiredDeps = [
  '@apollo/client',
  'graphql',
  'wagmi',
  'viem',
  '@rainbow-me/rainbowkit'
];

let missingDeps = [];
requiredDeps.forEach(dep => {
  if (!packageJson.dependencies[dep] && !packageJson.devDependencies[dep]) {
    missingDeps.push(dep);
  }
});

if (missingDeps.length === 0) {
  console.log('✅ 所有必要依賴項已安裝');
} else {
  console.log('❌ 缺少依賴項:');
  missingDeps.forEach(dep => {
    console.log(`   ${dep}`);
  });
}

// 8. 檢查 ToastContext 問題
console.log('\n📋 8. ToastContext 問題檢查');
console.log('='.repeat(50));

const toastContextFile = 'src/contexts/ToastContext.tsx';
const toastContextTypesFile = 'src/contexts/ToastContextTypes.ts';

if (fs.existsSync(toastContextFile) && fs.existsSync(toastContextTypesFile)) {
  const toastContent = fs.readFileSync(toastContextFile, 'utf8');
  const typesContent = fs.readFileSync(toastContextTypesFile, 'utf8');
  
  if (toastContent.includes('ToastContextTypes') && typesContent.includes('ToastContext')) {
    console.log('✅ ToastContext 配置正確');
  } else {
    console.log('❌ ToastContext 導入問題');
  }
} else {
  console.log('❌ ToastContext 文件缺失');
}

// 9. 檢查 Vite 配置
console.log('\n📋 9. Vite 配置檢查');
console.log('='.repeat(50));

const viteConfigFile = 'vite.config.ts';
if (fs.existsSync(viteConfigFile)) {
  const viteContent = fs.readFileSync(viteConfigFile, 'utf8');
  if (viteContent.includes('optimizeDeps') && viteContent.includes('@apollo/client')) {
    console.log('✅ Vite 配置包含 Apollo Client 優化');
  } else {
    console.log('⚠️  Vite 配置可能需要 Apollo Client 優化');
  }
} else {
  console.log('❌ Vite 配置文件不存在');
}

// 總結
console.log('\n📋 檢查總結');
console.log('='.repeat(50));

const totalIssues = addressMismatches.length + missingAbiFiles.length + 
                   graphqlIssues.length + missingHandlers.length + 
                   contractCallIssues.length + envIssues.length + missingDeps.length;

if (totalIssues === 0) {
  console.log('🎉 所有檢查通過！系統銜接良好');
} else {
  console.log(`⚠️  發現 ${totalIssues} 個問題需要修復`);
  console.log('\n建議修復順序:');
  console.log('1. 修復合約地址不一致問題');
  console.log('2. 補充缺少的 ABI 文件');
  console.log('3. 修復 GraphQL 查詢問題');
  console.log('4. 補充缺少的事件處理器');
  console.log('5. 修復前端合約調用問題');
  console.log('6. 配置環境變量');
  console.log('7. 安裝缺少的依賴項');
  console.log('8. 修復 ToastContext 問題');
  console.log('9. 優化 Vite 配置');
}

console.log('\n🔍 全面系統銜接檢查完成！'); 