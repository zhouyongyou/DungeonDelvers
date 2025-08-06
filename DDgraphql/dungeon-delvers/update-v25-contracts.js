// V25 子圖合約地址更新腳本
const fs = require('fs');
const path = require('path');

// V25 最新合約地址（區塊：56631513）
const V25_CONTRACTS = {
  // 新部署的合約
  DungeonMaster: '0xE391261741Fad5FCC2D298d00e8c684767021253',
  Hero: '0xD48867dbac5f1c1351421726B6544f847D9486af',
  Relic: '0x86f15792Ecfc4b5F2451d841A3fBaBEb651138ce',
  AltarOfAscension: '0x095559778C0BAA2d8FA040Ab0f8752cF07779D33',
  DungeonStorage: '0x539AC926C6daE898f2C843aF8C59Ff92B4b3B468',
  
  // 重複使用的合約（保持不變）
  DungeonCore: '0x8a2D2b1961135127228EdD71Ff98d6B097915a13',
  PlayerVault: '0x62Bce9aF5E2C47b13f62A2e0fCB1f9C7AfaF8787',
  PlayerProfile: '0x0f5932e89908400a5AfDC306899A2987b67a3155',
  VIPStaking: '0xC0D8C84e28E5BcfC9cBD109551De53BA04e7328C',
  Oracle: '0xf8CE896aF39f95a9d5Dd688c35d381062263E25a',
  Party: '0x28A85D14e0F87d6eD04e21c30992Df8B3e9434E3',
  SoulShard: '0x97B2C2a9A11C7b6A020b4bAEaAd349865eaD0bcF'
};

const DEPLOYMENT_BLOCK = '56631513';

function updateNetworksJson() {
  console.log('🔧 更新 networks.json...');
  
  const networksPath = path.join(__dirname, 'networks.json');
  let networks;
  
  try {
    networks = JSON.parse(fs.readFileSync(networksPath, 'utf8'));
  } catch (error) {
    console.error('❌ 讀取 networks.json 失敗:', error.message);
    return false;
  }

  // 備份原始檔案
  const backupPath = `${networksPath}.backup-${Date.now()}`;
  fs.writeFileSync(backupPath, JSON.stringify(networks, null, 2));
  console.log(`   📁 備份至: ${backupPath}`);

  // 更新合約地址
  if (!networks.bsc) {
    console.error('❌ networks.json 中找不到 bsc 配置');
    return false;
  }

  // 更新地址和區塊號
  Object.entries(V25_CONTRACTS).forEach(([name, address]) => {
    if (networks.bsc[name]) {
      networks.bsc[name].address = address;
      networks.bsc[name].startBlock = parseInt(DEPLOYMENT_BLOCK);
      console.log(`   ✅ 已更新 ${name}: ${address} (區塊: ${DEPLOYMENT_BLOCK})`);
    } else {
      console.log(`   ⚠️  ${name} 在 networks.json 中不存在，跳過`);
    }
  });

  // 寫入更新後的內容
  fs.writeFileSync(networksPath, JSON.stringify(networks, null, 2));
  console.log('   ✅ networks.json 更新完成');
  
  return true;
}

function updateSubgraphYaml() {
  console.log('\n🔧 更新 subgraph.yaml...');
  
  const subgraphPath = path.join(__dirname, 'subgraph.yaml');
  let content;
  
  try {
    content = fs.readFileSync(subgraphPath, 'utf8');
  } catch (error) {
    console.error('❌ 讀取 subgraph.yaml 失敗:', error.message);
    return false;
  }

  // 備份原始檔案
  const backupPath = `${subgraphPath}.backup-${Date.now()}`;
  fs.writeFileSync(backupPath, content);
  console.log(`   📁 備份至: ${backupPath}`);

  let updatedContent = content;
  let updateCount = 0;

  // 更新合約地址（使用正則表達式匹配）
  Object.entries(V25_CONTRACTS).forEach(([name, address]) => {
    // 匹配 address: "0x..." 格式
    const addressRegex = new RegExp(
      `(name:\\s*${name}[\\s\\S]*?address:\\s*")[0-9a-fA-Fx]{42}(")`
    );
    
    const startBlockRegex = new RegExp(
      `(name:\\s*${name}[\\s\\S]*?startBlock:\\s*)[0-9]+`
    );

    if (addressRegex.test(updatedContent)) {
      updatedContent = updatedContent.replace(addressRegex, `$1${address}$2`);
      updateCount++;
      console.log(`   ✅ 已更新 ${name} 地址: ${address}`);
    }

    if (startBlockRegex.test(updatedContent)) {
      updatedContent = updatedContent.replace(startBlockRegex, `$1${DEPLOYMENT_BLOCK}`);
      console.log(`   ✅ 已更新 ${name} 區塊: ${DEPLOYMENT_BLOCK}`);
    }
  });

  if (updateCount === 0) {
    console.log('   ⚠️  未找到需要更新的合約地址');
    return false;
  }

  // 寫入更新後的內容
  fs.writeFileSync(subgraphPath, updatedContent);
  console.log(`   ✅ subgraph.yaml 更新完成 (更新了 ${updateCount} 個合約)`);
  
  return true;
}

function main() {
  console.log('🚀 開始 V25 子圖合約地址更新...');
  console.log('📋 使用合約地址:');
  Object.entries(V25_CONTRACTS).forEach(([name, address]) => {
    console.log(`   ${name}: ${address}`);
  });
  console.log(`📦 部署區塊: ${DEPLOYMENT_BLOCK}\n`);

  const results = [
    updateNetworksJson(),
    updateSubgraphYaml()
  ];

  if (results.every(result => result)) {
    console.log('\n🎉 子圖配置更新成功！');
    console.log('\n💡 接下來需要執行:');
    console.log('   1. cd DDgraphql/dungeon-delvers');
    console.log('   2. npm run build');
    console.log('   3. npm run deploy');
    console.log('\n   或者使用快速部署腳本:');
    console.log('   ./deploy-v25.sh');
  } else {
    console.log('\n❌ 部分更新失敗，請檢查上述錯誤訊息');
    console.log('\n🔄 可以從備份檔案恢復:');
    console.log('   - networks.json.backup-*');
    console.log('   - subgraph.yaml.backup-*');
  }
}

if (require.main === module) {
  main();
}

module.exports = { main, V25_CONTRACTS, DEPLOYMENT_BLOCK };