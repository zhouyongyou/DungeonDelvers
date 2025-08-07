#!/usr/bin/env node

// 簡化的合約檢查工具 - 無需額外依賴
const https = require('https');

const CONTRACTS = {
    HERO: '0x671d937b171e2ba2c4dc23c133b07e4449f283ef',
    RELIC: '0x42bf1bd8fc5a8dfdd0e97de131246ec0e3ec73da',
    PARTY: '0x28A85D14e0F87d6eD04e21c30992Df8B3e9434E3',
    DUNGEONMASTER: '0xc0bbae55cf9245f76628d2c5299cd6fa35cd102a',
    DUNGEONSTORAGE: '0x539AC926C6daE898f2C843aF8C59Ff92B4b3B468',
    ALTAROFASCENSION: '0xa86749237d4631ad92ba859d0b0df4770f6147ba',
    VRFMANAGER: '0x980d224ec4d198d94f34a8af76a19c00dabe2436'
};

const VRF_CONFIG = {
    COORDINATOR: '0xd691f04bc0C9a24Edb78af9E005Cf85768F694C9',
    SUBSCRIPTION_ID: '114131353280130458891383141995968474440293173552039681622016393393251650814328'
};

async function rpcCall(method, params) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify({
            jsonrpc: "2.0",
            method: method,
            params: params,
            id: 1
        });

        const options = {
            hostname: 'bsc-dataseed1.binance.org',
            port: 443,
            path: '/',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': data.length
            }
        };

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                try {
                    const result = JSON.parse(body);
                    if (result.error) {
                        reject(new Error(result.error.message));
                    } else {
                        resolve(result.result);
                    }
                } catch (e) {
                    reject(e);
                }
            });
        });

        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

async function checkContractExists(address, name) {
    try {
        const code = await rpcCall('eth_getCode', [address, 'latest']);
        if (code && code !== '0x' && code.length > 2) {
            console.log(`✅ ${name}: 合約存在 (${address})`);
            return true;
        } else {
            console.log(`❌ ${name}: 合約不存在或未部署 (${address})`);
            return false;
        }
    } catch (error) {
        console.log(`❌ ${name}: 檢查失敗 - ${error.message}`);
        return false;
    }
}

async function main() {
    console.log('🔍 V25 合約部署狀態檢查...\n');
    
    console.log('📋 檢查新部署的合約...');
    const newContracts = ['HERO', 'RELIC', 'PARTY', 'DUNGEONMASTER', 'DUNGEONSTORAGE', 'ALTAROFASCENSION'];
    let deployedCount = 0;
    
    for (const contractName of newContracts) {
        const exists = await checkContractExists(CONTRACTS[contractName], contractName);
        if (exists) deployedCount++;
    }
    
    console.log('\n📋 檢查 VRF 系統...');
    const vrfExists = await checkContractExists(CONTRACTS.VRFMANAGER, 'VRF Manager');
    const coordinatorExists = await checkContractExists(VRF_CONFIG.COORDINATOR, 'VRF Coordinator');
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 部署狀態總結');
    console.log('='.repeat(60));
    
    console.log(`🆕 新部署合約: ${deployedCount}/${newContracts.length} 已部署`);
    console.log(`🎲 VRF 系統: ${vrfExists && coordinatorExists ? '✅ 正常' : '❌ 異常'}`);
    
    if (deployedCount === newContracts.length && vrfExists && coordinatorExists) {
        console.log('\n🎉 所有 V25 合約已成功部署！');
        console.log('\n📝 下一步：');
        console.log('1. 執行合約互連操作 (SET 函數)');
        console.log('2. 配置 VRF 權限和 Consumer');
        console.log('3. 測試合約功能');
        console.log('\n💡 建議手動操作：');
        console.log('- 訪問 https://vrf.chain.link/bsc 管理 VRF 訂閱');
        console.log('- 使用 BSC 瀏覽器驗證合約互連狀態');
        console.log('- 執行小額測試交易確認功能正常');
    } else {
        console.log('\n⚠️ 部署檢查發現問題，請確認：');
        console.log('1. 所有合約都已正確部署');
        console.log('2. 合約地址配置正確');
        console.log('3. 網路連接正常');
    }
    
    console.log('\n🔗 有用的連結：');
    console.log(`- DungeonMaster: https://bscscan.com/address/${CONTRACTS.DUNGEONMASTER}`);
    console.log(`- VRF Manager: https://bscscan.com/address/${CONTRACTS.VRFMANAGER}`);
    console.log(`- VRF Coordinator: https://bscscan.com/address/${VRF_CONFIG.COORDINATOR}`);
    console.log('- VRF 管理: https://vrf.chain.link/bsc');
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('檢查過程發生錯誤:', error.message);
        process.exit(1);
    });