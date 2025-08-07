#!/usr/bin/env node

const { ethers } = require("ethers");

// V25 合約地址和配置
const CONTRACTS = {
    HERO: '0x671d937b171e2ba2c4dc23c133b07e4449f283ef',
    RELIC: '0x42bf1bd8fc5a8dfdd0e97de131246ec0e3ec73da',
    PARTY: '0x28A85D14e0F87d6eD04e21c30992Df8B3e9434E3',
    DUNGEONMASTER: '0xc0bbae55cf9245f76628d2c5299cd6fa35cd102a',
    DUNGEONSTORAGE: '0x539AC926C6daE898f2C843aF8C59Ff92B4b3B468',
    ALTAROFASCENSION: '0xa86749237d4631ad92ba859d0b0df4770f6147ba',
    DUNGEONCORE: '0x8a2D2b1961135127228EdD71Ff98d6B097915a13',
    PLAYERVAULT: '0x62Bce9aF5E2C47b13f62A2e0fCB1f9C7AfaF8787',
    PLAYERPROFILE: '0x0f5932e89908400a5AfDC306899A2987b67a3155',
    VIPSTAKING: '0xC0D8C84e28E5BcfC9cBD109551De53BA04e7328C',
    ORACLE: '0xf8CE896aF39f95a9d5Dd688c35d381062263E25a',
    VRFMANAGER: '0x980d224ec4d198d94f34a8af76a19c00dabe2436'
};

const VRF_CONFIG = {
    COORDINATOR: '0xd691f04bc0C9a24Edb78af9E005Cf85768F694C9',
    SUBSCRIPTION_ID: '114131353280130458891383141995968474440293173552039681622016393393251650814328'
};

// 簡化的 ABI - 只包含我們需要查詢的函數
const ABIS = {
    DungeonMaster: [
        "function heroContract() external view returns (address)",
        "function relicContract() external view returns (address)",
        "function partyContract() external view returns (address)",
        "function dungeonCore() external view returns (address)",
        "function oracle() external view returns (address)",
        "function playerVault() external view returns (address)",
        "function vrfManager() external view returns (address)"
    ],
    AltarOfAscension: [
        "function heroContract() external view returns (address)",
        "function relicContract() external view returns (address)",
        "function vrfManager() external view returns (address)"
    ],
    VRFManager: [
        "function getAuthorizedContracts() external view returns (address[] memory)",
        "function isAuthorizedContract(address) external view returns (bool)"
    ],
    VRFCoordinator: [
        "function getSubscription(uint256 subId) external view returns (uint96 balance, uint64 reqCount, address owner, address[] memory consumers)"
    ],
    ERC721: [
        "function hasRole(bytes32 role, address account) external view returns (bool)",
        "function MINTER_ROLE() external view returns (bytes32)"
    ]
};

async function main() {
    console.log('🔍 檢查 V25 合約互連狀態...\n');
    
    // 連接到 BSC RPC
    const provider = new ethers.JsonRpcProvider("https://bsc-dataseed1.binance.org/");
    const issues = [];
    let totalChecks = 0;
    let passedChecks = 0;
    
    try {
        console.log('📋 檢查 DungeonMaster 合約配置...');
        await checkDungeonMasterConnections(provider, issues);
        
        console.log('\n🏛️ 檢查 AltarOfAscension 合約配置...');
        await checkAltarConnections(provider, issues);
        
        console.log('\n🎲 檢查 VRF 系統配置...');
        await checkVRFConnections(provider, issues);
        
        console.log('\n🎨 檢查 NFT 合約權限...');
        await checkNFTPermissions(provider, issues);
        
        // 總結報告
        console.log('\n' + '='.repeat(60));
        console.log('📊 合約互連檢查總結');
        console.log('='.repeat(60));
        
        if (issues.length === 0) {
            console.log('🎉 所有合約互連檢查通過！');
            console.log('✅ V25 部署完全就緒，可以開始測試。');
        } else {
            console.log(`⚠️ 發現 ${issues.length} 個需要修復的問題：`);
            issues.forEach((issue, index) => {
                console.log(`${index + 1}. ${issue}`);
            });
            
            console.log('\n🔧 修復建議：');
            generateFixSuggestions(issues);
        }
        
    } catch (error) {
        console.error('❌ 檢查過程中發生錯誤:', error.message);
        if (error.code === 'NETWORK_ERROR') {
            console.log('💡 請檢查網路連接或嘗試不同的 RPC 端點');
        }
    }
}

async function checkDungeonMasterConnections(provider, issues) {
    const contract = new ethers.Contract(CONTRACTS.DUNGEONMASTER, ABIS.DungeonMaster, provider);
    
    const checks = [
        { name: 'Hero Contract', method: 'heroContract', expected: CONTRACTS.HERO },
        { name: 'Relic Contract', method: 'relicContract', expected: CONTRACTS.RELIC },
        { name: 'Party Contract', method: 'partyContract', expected: CONTRACTS.PARTY },
        { name: 'DungeonCore', method: 'dungeonCore', expected: CONTRACTS.DUNGEONCORE },
        { name: 'Oracle', method: 'oracle', expected: CONTRACTS.ORACLE },
        { name: 'PlayerVault', method: 'playerVault', expected: CONTRACTS.PLAYERVAULT },
        { name: 'VRF Manager', method: 'vrfManager', expected: CONTRACTS.VRFMANAGER }
    ];
    
    for (const check of checks) {
        try {
            const actual = await contract[check.method]();
            if (actual.toLowerCase() === check.expected.toLowerCase()) {
                console.log(`  ✅ ${check.name}: ${actual}`);
            } else {
                const issue = `DungeonMaster.${check.method}() 返回 ${actual}，期望 ${check.expected}`;
                console.log(`  ❌ ${check.name}: 配置錯誤`);
                issues.push(issue);
            }
        } catch (error) {
            const issue = `DungeonMaster.${check.method}() 查詢失敗: ${error.message}`;
            console.log(`  ❌ ${check.name}: 查詢失敗`);
            issues.push(issue);
        }
    }
}

async function checkAltarConnections(provider, issues) {
    const contract = new ethers.Contract(CONTRACTS.ALTAROFASCENSION, ABIS.AltarOfAscension, provider);
    
    const checks = [
        { name: 'Hero Contract', method: 'heroContract', expected: CONTRACTS.HERO },
        { name: 'Relic Contract', method: 'relicContract', expected: CONTRACTS.RELIC },
        { name: 'VRF Manager', method: 'vrfManager', expected: CONTRACTS.VRFMANAGER }
    ];
    
    for (const check of checks) {
        try {
            const actual = await contract[check.method]();
            if (actual.toLowerCase() === check.expected.toLowerCase()) {
                console.log(`  ✅ ${check.name}: ${actual}`);
            } else {
                const issue = `AltarOfAscension.${check.method}() 返回 ${actual}，期望 ${check.expected}`;
                console.log(`  ❌ ${check.name}: 配置錯誤`);
                issues.push(issue);
            }
        } catch (error) {
            const issue = `AltarOfAscension.${check.method}() 查詢失敗: ${error.message}`;
            console.log(`  ❌ ${check.name}: 查詢失敗`);
            issues.push(issue);
        }
    }
}

async function checkVRFConnections(provider, issues) {
    try {
        // 檢查 VRF Manager 授權
        const vrfManager = new ethers.Contract(CONTRACTS.VRFMANAGER, ABIS.VRFManager, provider);
        
        const expectedConsumers = [CONTRACTS.DUNGEONMASTER, CONTRACTS.ALTAROFASCENSION];
        
        for (const consumer of expectedConsumers) {
            try {
                const isAuthorized = await vrfManager.isAuthorizedContract(consumer);
                if (isAuthorized) {
                    console.log(`  ✅ VRF 授權: ${consumer.substring(0, 10)}...`);
                } else {
                    const issue = `VRF Manager 未授權合約: ${consumer}`;
                    console.log(`  ❌ VRF 授權: ${consumer.substring(0, 10)}... 未授權`);
                    issues.push(issue);
                }
            } catch (error) {
                const issue = `無法檢查 VRF 授權狀態: ${consumer} - ${error.message}`;
                console.log(`  ❌ VRF 授權檢查失敗: ${consumer.substring(0, 10)}...`);
                issues.push(issue);
            }
        }
        
        // 檢查 VRF 訂閱
        const vrfCoordinator = new ethers.Contract(VRF_CONFIG.COORDINATOR, ABIS.VRFCoordinator, provider);
        
        try {
            const subscriptionInfo = await vrfCoordinator.getSubscription(VRF_CONFIG.SUBSCRIPTION_ID);
            const balance = parseFloat(ethers.formatEther(subscriptionInfo.balance));
            
            console.log(`  ✅ VRF 訂閱餘額: ${balance.toFixed(6)} LINK`);
            console.log(`  ✅ VRF 訂閱擁有者: ${subscriptionInfo.owner}`);
            console.log(`  ✅ VRF Consumer 數量: ${subscriptionInfo.consumers.length}`);
            
            if (balance < 0.1) {
                const issue = `VRF 訂閱餘額不足: ${balance.toFixed(6)} LINK (建議 > 0.1 LINK)`;
                console.log(`  ⚠️ 餘額警告: ${balance.toFixed(6)} LINK`);
                issues.push(issue);
            }
            
            // 檢查期望的 Consumer 是否在列表中
            const consumerAddresses = subscriptionInfo.consumers.map(addr => addr.toLowerCase());
            for (const expectedConsumer of expectedConsumers) {
                if (consumerAddresses.includes(expectedConsumer.toLowerCase())) {
                    console.log(`  ✅ VRF Consumer: ${expectedConsumer.substring(0, 10)}... 已添加`);
                } else {
                    const issue = `VRF 訂閱缺少 Consumer: ${expectedConsumer}`;
                    console.log(`  ❌ VRF Consumer: ${expectedConsumer.substring(0, 10)}... 未添加`);
                    issues.push(issue);
                }
            }
            
        } catch (error) {
            const issue = `VRF 訂閱查詢失敗: ${error.message}`;
            console.log(`  ❌ VRF 訂閱查詢失敗`);
            issues.push(issue);
        }
        
    } catch (error) {
        const issue = `VRF 系統檢查失敗: ${error.message}`;
        console.log(`  ❌ VRF 系統檢查失敗: ${error.message}`);
        issues.push(issue);
    }
}

async function checkNFTPermissions(provider, issues) {
    const MINTER_ROLE = "0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6"; // keccak256("MINTER_ROLE")
    
    const nftContracts = [
        { name: 'Hero', address: CONTRACTS.HERO },
        { name: 'Relic', address: CONTRACTS.RELIC }
    ];
    
    for (const nft of nftContracts) {
        try {
            const contract = new ethers.Contract(nft.address, ABIS.ERC721, provider);
            
            // 檢查 DungeonMaster 是否有 MINTER_ROLE
            const hasMinterRole = await contract.hasRole(MINTER_ROLE, CONTRACTS.DUNGEONMASTER);
            if (hasMinterRole) {
                console.log(`  ✅ ${nft.name}: DungeonMaster 有 MINTER_ROLE`);
            } else {
                const issue = `${nft.name} 合約未授予 DungeonMaster MINTER_ROLE`;
                console.log(`  ❌ ${nft.name}: DungeonMaster 缺少 MINTER_ROLE`);
                issues.push(issue);
            }
            
        } catch (error) {
            const issue = `${nft.name} 權限檢查失敗: ${error.message}`;
            console.log(`  ❌ ${nft.name}: 權限檢查失敗`);
            issues.push(issue);
        }
    }
}

function generateFixSuggestions(issues) {
    console.log('\n1. 合約配置問題：使用 DungeonMaster 的 set 函數');
    console.log('   例如: dungeonMaster.setHeroContract("0x671d937b171e2ba2c4dc23c133b07e4449f283ef")');
    
    console.log('\n2. VRF 授權問題：');
    console.log('   - VRFManager.setAuthorizedContract(address, true)');
    console.log('   - VRFCoordinator.addConsumer(subscriptionId, consumerAddress)');
    
    console.log('\n3. NFT 權限問題：');
    console.log('   - Hero.grantRole(MINTER_ROLE, dungeonMasterAddress)');
    console.log('   - Relic.grantRole(MINTER_ROLE, dungeonMasterAddress)');
    
    console.log('\n4. VRF 餘額問題：');
    console.log('   - 訪問 https://vrf.chain.link/bsc 充值 LINK');
    
    console.log('\n⚡ 使用自動化腳本執行修復：');
    console.log('   cd /path/to/contracts && npx hardhat run scripts/setup-v25-connections.js --network bsc');
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });