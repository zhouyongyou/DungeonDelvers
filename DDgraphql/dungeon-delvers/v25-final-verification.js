#!/usr/bin/env node

// V25 部署完成後的全面驗證腳本
// 檢查所有配置是否正確同步

const fs = require('fs');
const path = require('path');

console.log('🔍 V25 配置完整性驗證開始...\n');

// V25 標準配置
const V25_CONTRACTS = {
    // 新部署的合約
    HERO: '0x671d937b171e2ba2c4dc23c133b07e4449f283ef',
    RELIC: '0x42bf1bd8fc5a8dfdd0e97de131246ec0e3ec73da',
    PARTY: '0x28A85D14e0F87d6eD04e21c30992Df8B3e9434E3',
    DUNGEONMASTER: '0xc0bbae55cf9245f76628d2c5299cd6fa35cd102a',
    DUNGEONSTORAGE: '0x539AC926C6daE898f2C843aF8C59Ff92B4b3B468',
    ALTAROFASCENSION: '0xa86749237d4631ad92ba859d0b0df4770f6147ba',
    
    // 重複使用的合約
    DUNGEONCORE: '0x8a2D2b1961135127228EdD71Ff98d6B097915a13',
    PLAYERVAULT: '0x62Bce9aF5E2C47b13f62A2e0fCB1f9C7AfaF8787',
    PLAYERPROFILE: '0x0f5932e89908400a5AfDC306899A2987b67a3155',
    VIPSTAKING: '0xC0D8C84e28E5BcfC9cBD109551De53BA04e7328C',
    ORACLE: '0xf8CE896aF39f95a9d5Dd688c35d381062263E25a',
    
    // 代幣合約
    SOULSHARD: '0x97B2C2a9A11C7b6A020b4bAEaAd349865eaD0bcF',
    USD: '0x7C67Af4EBC6651c95dF78De11cfe325660d935FE',
    UNISWAP_POOL: '0x1e5Cd5F386Fb6F39cD8788675dd3A5ceB6521C82',
    
    // VRF
    VRFMANAGER: '0x980d224ec4d198d94f34a8af76a19c00dabe2436'
};

const V25_CONFIG = {
    VERSION: 'V25',
    START_BLOCK: '56771885',
    DEPLOYMENT_DATE: '2025-08-07T22:00:00Z',
    SUBGRAPH_VERSION: 'v3.8.2',
    VRF_SUBSCRIPTION_ID: '114131353280130458891383141995968474440293173552039681622016393393251650814328',
    VRF_COORDINATOR: '0xd691f04bc0C9a24Edb78af9E005Cf85768F694C9',
    VRF_KEY_HASH: '0x130dba50ad435d4ecc214aad0d5820474137bd68e7e77724144f27c3c377d3d4'
};

// 文件路徑
const PATHS = {
    FRONTEND_ENV: '/Users/sotadic/Documents/GitHub/DungeonDelvers/.env.local',
    BACKEND_CONFIG: '/Users/sotadic/Documents/dungeon-delvers-metadata-server/config/contracts.json',
    SUBGRAPH_YAML: '/Users/sotadic/Documents/GitHub/DungeonDelvers/DDgraphql/dungeon-delvers/subgraph.yaml'
};

let allPassed = true;
const issues = [];

function checkFile(filePath, description) {
    if (!fs.existsSync(filePath)) {
        issues.push(`❌ 文件不存在: ${filePath}`);
        return null;
    }
    
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        console.log(`✅ ${description}: 文件存在且可讀`);
        return content;
    } catch (error) {
        issues.push(`❌ 文件讀取失敗: ${filePath} - ${error.message}`);
        return null;
    }
}

function checkFrontendConfig() {
    console.log('\n📱 檢查前端配置...');
    const content = checkFile(PATHS.FRONTEND_ENV, '前端 .env.local');
    if (!content) return;
    
    const checks = [
        { key: 'VITE_START_BLOCK', expected: V25_CONFIG.START_BLOCK },
        { key: 'VITE_CONTRACT_VERSION', expected: V25_CONFIG.VERSION },
        { key: 'VITE_DEPLOYMENT_DATE', expected: V25_CONFIG.DEPLOYMENT_DATE },
        { key: 'VITE_VRF_SUBSCRIPTION_ID', expected: V25_CONFIG.VRF_SUBSCRIPTION_ID },
        { key: 'VITE_VRF_COORDINATOR', expected: V25_CONFIG.VRF_COORDINATOR },
        { key: 'VITE_VRF_KEY_HASH', expected: V25_CONFIG.VRF_KEY_HASH }
    ];
    
    checks.forEach(check => {
        const regex = new RegExp(`${check.key}=(.+)`, 'i');
        const match = content.match(regex);
        if (match && match[1].trim() === check.expected) {
            console.log(`  ✅ ${check.key}: ${match[1].trim()}`);
        } else {
            console.log(`  ❌ ${check.key}: 期望 "${check.expected}", 實際 "${match ? match[1].trim() : '未找到'}"`);
            allPassed = false;
        }
    });
    
    // 檢查合約地址
    Object.entries(V25_CONTRACTS).forEach(([name, address]) => {
        const envKey = `VITE_${name}_ADDRESS`;
        const regex = new RegExp(`${envKey}=(.+)`, 'i');
        const match = content.match(regex);
        if (match && match[1].trim().toLowerCase() === address.toLowerCase()) {
            console.log(`  ✅ ${envKey}: ${address}`);
        } else {
            console.log(`  ❌ ${envKey}: 期望 "${address}", 實際 "${match ? match[1].trim() : '未找到'}"`);
            allPassed = false;
        }
    });
}

function checkBackendConfig() {
    console.log('\n🔧 檢查後端配置...');
    const content = checkFile(PATHS.BACKEND_CONFIG, '後端 contracts.json');
    if (!content) return;
    
    try {
        const config = JSON.parse(content);
        
        // 檢查基本配置
        if (config.deployment?.version === V25_CONFIG.VERSION) {
            console.log(`  ✅ 版本: ${config.deployment.version}`);
        } else {
            console.log(`  ❌ 版本: 期望 "${V25_CONFIG.VERSION}", 實際 "${config.deployment?.version}"`);
            allPassed = false;
        }
        
        if (config.deployment?.startBlock === V25_CONFIG.START_BLOCK) {
            console.log(`  ✅ 起始區塊: ${config.deployment.startBlock}`);
        } else {
            console.log(`  ❌ 起始區塊: 期望 "${V25_CONFIG.START_BLOCK}", 實際 "${config.deployment?.startBlock}"`);
            allPassed = false;
        }
        
        // 檢查 VRF 配置
        if (config.vrf?.subscriptionId === V25_CONFIG.VRF_SUBSCRIPTION_ID) {
            console.log(`  ✅ VRF Subscription ID: 正確 (${V25_CONFIG.VRF_SUBSCRIPTION_ID.substring(0, 20)}...)`);
        } else {
            console.log(`  ❌ VRF Subscription ID 不匹配`);
            allPassed = false;
        }
        
        // 檢查子圖版本
        if (config.subgraph?.version === V25_CONFIG.SUBGRAPH_VERSION) {
            console.log(`  ✅ 子圖版本: ${config.subgraph.version}`);
        } else {
            console.log(`  ❌ 子圖版本: 期望 "${V25_CONFIG.SUBGRAPH_VERSION}", 實際 "${config.subgraph?.version}"`);
            allPassed = false;
        }
        
        // 檢查合約地址 (後端使用不同的命名格式)
        const backendContractMap = {
            hero: 'HERO',
            relic: 'RELIC',
            party: 'PARTY',
            dungeonmaster: 'DUNGEONMASTER',
            dungeonstorage: 'DUNGEONSTORAGE',
            altarOfAscension: 'ALTAROFASCENSION',
            dungeoncore: 'DUNGEONCORE',
            playervault: 'PLAYERVAULT',
            playerprofile: 'PLAYERPROFILE',
            vipstaking: 'VIPSTAKING',
            oracle: 'ORACLE',
            soulshard: 'SOULSHARD',
            usd: 'USD',
            uniswap_pool: 'UNISWAP_POOL',
            vrfManagerV2Plus: 'VRFMANAGER'
        };
        
        Object.entries(backendContractMap).forEach(([backendKey, contractKey]) => {
            const expectedAddress = V25_CONTRACTS[contractKey];
            const actualAddress = config.contracts?.[backendKey];
            
            if (actualAddress && actualAddress.toLowerCase() === expectedAddress.toLowerCase()) {
                console.log(`  ✅ ${backendKey}: ${actualAddress}`);
            } else {
                console.log(`  ❌ ${backendKey}: 期望 "${expectedAddress}", 實際 "${actualAddress || '未找到'}"`);
                allPassed = false;
            }
        });
        
    } catch (error) {
        console.log(`  ❌ JSON 解析失敗: ${error.message}`);
        allPassed = false;
    }
}

function checkSubgraphConfig() {
    console.log('\n📊 檢查子圖配置...');
    const content = checkFile(PATHS.SUBGRAPH_YAML, '子圖 subgraph.yaml');
    if (!content) return;
    
    // 檢查起始區塊
    const startBlockMatches = content.match(/startBlock:\s*(\d+)/g);
    let correctBlocks = 0;
    let totalBlocks = 0;
    
    if (startBlockMatches) {
        startBlockMatches.forEach(match => {
            totalBlocks++;
            const blockNumber = match.match(/\d+/)[0];
            if (blockNumber === V25_CONFIG.START_BLOCK) {
                correctBlocks++;
            }
        });
        
        if (correctBlocks === totalBlocks) {
            console.log(`  ✅ 所有 startBlock 都正確: ${V25_CONFIG.START_BLOCK} (${totalBlocks} 個)`);
        } else {
            console.log(`  ❌ startBlock 不一致: ${correctBlocks}/${totalBlocks} 正確`);
            allPassed = false;
        }
    }
    
    // 檢查合約地址
    Object.entries(V25_CONTRACTS).forEach(([name, address]) => {
        // 跳過不在子圖中的合約
        if (['DUNGEONCORE', 'SOULSHARD', 'USD', 'UNISWAP_POOL'].includes(name)) return;
        
        const addressRegex = new RegExp(`address:\\s*["']?${address}["']?`, 'i');
        if (addressRegex.test(content)) {
            console.log(`  ✅ ${name}: ${address}`);
        } else {
            console.log(`  ❌ ${name}: 地址 ${address} 未在子圖中找到`);
            allPassed = false;
        }
    });
}

function generateTestChecklist() {
    console.log('\n📋 生成測試檢查清單...');
    
    const checklist = `# V25 部署後測試檢查清單

## 🎯 部署資訊確認
- [x] 版本: ${V25_CONFIG.VERSION}
- [x] 部署時間: ${V25_CONFIG.DEPLOYMENT_DATE}  
- [x] 起始區塊: ${V25_CONFIG.START_BLOCK}
- [x] 子圖版本: ${V25_CONFIG.SUBGRAPH_VERSION}

## 🔧 合約互連測試

### 1. VRF 系統測試
- [ ] 檢查 VRF Subscription 餘額 (ID: ${V25_CONFIG.VRF_SUBSCRIPTION_ID.substring(0, 20)}...)
- [ ] 驗證 Consumer 合約授權 (DungeonMaster, AltarOfAscension)
- [ ] 測試隨機數生成功能

### 2. NFT 系統測試
- [ ] Hero Mint 功能 (${V25_CONTRACTS.HERO})
- [ ] Relic Mint 功能 (${V25_CONTRACTS.RELIC})
- [ ] Party 創建功能 (${V25_CONTRACTS.PARTY})

### 3. 遊戲邏輯測試
- [ ] DungeonMaster 探險功能 (${V25_CONTRACTS.DUNGEONMASTER})
- [ ] AltarOfAscension 升級功能 (${V25_CONTRACTS.ALTAROFASCENSION})
- [ ] PlayerVault 存取款功能

### 4. 數據同步測試
- [ ] 子圖索引是否正常工作
- [ ] 前端能否正確顯示新數據
- [ ] 後端 API 是否返回正確的 metadata

## ⚠️ 關鍵檢查點

### VRF 訂閱管理
- 訪問: https://vrf.chain.link/bsc
- 檢查餘額是否 > 0.1 LINK
- 確認 Consumer 合約列表

### 合約權限檢查
- DungeonMaster 是否有 NFT mint 權限
- VRFManager 是否授權給遊戲合約
- PlayerVault 是否授權給 DungeonMaster

### 網路配置檢查
- 前端 RPC 連接正常
- 子圖同步進度正常
- 後端 API 響應正常

## 🚨 緊急聯絡資訊
- 管理員錢包: ${V25_CONTRACTS.DUNGEONMASTERWALLET || '0x10925A7138649C7E1794CE646182eeb5BF8ba647'}
- 部署網路: BSC Mainnet (Chain ID: 56)
- VRF Coordinator: ${V25_CONFIG.VRF_COORDINATOR}

## 📊 監控端點
- 子圖 Studio: https://api.studio.thegraph.com/query/115633/dungeon-delvers---bsc/${V25_CONFIG.SUBGRAPH_VERSION}
- 子圖去中心化: https://gateway.thegraph.com/api/f6c1aba78203cfdf0cc732eafe677bdd/subgraphs/id/Hmwr7XYgzVzsUb9dw95gSGJ1Vof6qYypuvCxynzinCjs
- 後端 API: https://dungeon-delvers-metadata-server.onrender.com
`;

    fs.writeFileSync('./V25-TEST-CHECKLIST.md', checklist, 'utf8');
    console.log('✅ 測試檢查清單已生成: ./V25-TEST-CHECKLIST.md');
}

// 執行檢查
checkFrontendConfig();
checkBackendConfig();
checkSubgraphConfig();

// 總結
console.log('\n' + '='.repeat(60));
console.log('📋 V25 配置驗證總結');
console.log('='.repeat(60));

if (allPassed && issues.length === 0) {
    console.log('🎉 所有配置檢查通過！可以安心進行測試。');
    console.log('\n✅ 已確認：');
    console.log('  - 前端配置正確');
    console.log('  - 後端配置正確'); 
    console.log('  - 子圖配置正確');
    console.log('  - VRF 配置正確');
    console.log('\n🚀 下一步：');
    console.log('  1. 部署子圖: ./deploy-v25.sh');
    console.log('  2. 執行合約互連操作');
    console.log('  3. 進行完整功能測試');
} else {
    console.log('⚠️ 發現配置問題，需要修復：');
    issues.forEach(issue => console.log(`  ${issue}`));
    console.log('\n請修復以上問題後重新驗證。');
}

generateTestChecklist();

console.log('\n🔗 相關連結：');
console.log('  - VRF 管理: https://vrf.chain.link/bsc');
console.log('  - BSC 瀏覽器: https://bscscan.com');
console.log('  - 子圖 Studio: https://thegraph.com/studio');