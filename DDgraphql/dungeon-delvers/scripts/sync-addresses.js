#!/usr/bin/env node

/**
 * 🔄 地址同步腳本
 * 
 * 功能：自動從 subgraph.yaml 提取地址並更新 src/config.ts
 * 使用：npm run sync-addresses
 * 
 * 這確保了 subgraph.yaml 是唯一的真實來源
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

// 文件路徑
const SUBGRAPH_YAML_PATH = path.join(__dirname, '../subgraph.yaml');
const CONFIG_TS_PATH = path.join(__dirname, '../src/config.ts');

/**
 * 從 subgraph.yaml 提取合約地址
 */
function extractAddressesFromSubgraph() {
    try {
        const yamlContent = fs.readFileSync(SUBGRAPH_YAML_PATH, 'utf8');
        const subgraphConfig = yaml.load(yamlContent);
        
        const addresses = {};
        
        if (subgraphConfig.dataSources) {
            subgraphConfig.dataSources.forEach(dataSource => {
                const name = dataSource.name;
                const address = dataSource.source.address;
                
                if (name && address) {
                    addresses[name] = address;
                }
            });
        }
        
        return addresses;
    } catch (error) {
        console.error('❌ 讀取 subgraph.yaml 失敗:', error.message);
        process.exit(1);
    }
}

/**
 * 生成新的 config.ts 內容
 */
function generateConfigContent(addresses) {
    const addressConstants = Object.entries(addresses)
        .map(([name, address]) => {
            // 將 CamelCase 轉換為 CONSTANT_CASE
            const constantName = name
                .replace(/([A-Z])/g, '_$1')  // 在大寫字母前添加下劃線
                .toUpperCase()                // 轉為大寫
                .replace(/^_/, '');           // 移除開頭的下劃線
            return `const ${constantName}_ADDRESS = "${address}"`;
        })
        .join('\n');
    
    const exportFunctions = Object.keys(addresses)
        .map(name => {
            // 將 CamelCase 轉換為 CONSTANT_CASE
            const constantName = name
                .replace(/([A-Z])/g, '_$1')  // 在大寫字母前添加下劃線
                .toUpperCase()                // 轉為大寫
                .replace(/^_/, '');           // 移除開頭的下劃線
            return `export function get${name}ContractAddress(): string {
    return ${constantName}_ADDRESS
}`;
        })
        .join('\n\n');

    return `// DDgraphql/dungeon-delvers/src/config.ts
// 🎯 單一來源配置管理 - 只依賴 subgraph.yaml
// ⚠️ 此文件由腳本自動生成，請勿手動編輯！
// 🔄 更新方式：修改 subgraph.yaml 後運行 npm run sync-addresses

import { dataSource } from "@graphprotocol/graph-ts"

/**
 * ⚠️ 重要說明：這些地址自動從 subgraph.yaml 同步！
 * 
 * 💡 維護方式：
 * 1. 只在 subgraph.yaml 中修改地址
 * 2. 運行 npm run sync-addresses 自動同步
 * 
 * 📋 地址來源：subgraph.yaml dataSources[].source.address
 * 🕒 最後同步時間：${new Date().toLocaleString()}
 */

// 合約地址常量 (自動從 subgraph.yaml 同步)
${addressConstants}

// 導出函數來獲取各種合約地址
${exportFunctions}

// 工具函數：驗證地址是否有效
export function isValidAddress(address: string): bool {
    return address.length == 42 && address.startsWith("0x")
}

// 工具函數：獲取當前網路
export function getCurrentNetwork(): string {
    return dataSource.network()
}

// 工具函數：建立實體 ID
export function createEntityId(contractAddress: string, tokenId: string): string {
    return contractAddress.toLowerCase().concat("-").concat(tokenId)
}`;
}

/**
 * 更新 config.ts 文件
 */
function updateConfigFile(addresses) {
    try {
        const newContent = generateConfigContent(addresses);
        fs.writeFileSync(CONFIG_TS_PATH, newContent, 'utf8');
        console.log('✅ src/config.ts 已成功更新');
    } catch (error) {
        console.error('❌ 更新 config.ts 失敗:', error.message);
        process.exit(1);
    }
}

/**
 * 驗證地址格式
 */
function validateAddresses(addresses) {
    const errors = [];
    
    Object.entries(addresses).forEach(([name, address]) => {
        if (!address || typeof address !== 'string') {
            errors.push(`${name}: 地址不能為空`);
        } else if (!address.startsWith('0x') || address.length !== 42) {
            errors.push(`${name}: 地址格式無效 (${address})`);
        }
    });
    
    return errors;
}

/**
 * 主函數
 */
function main() {
    console.log('🔄 開始同步地址...');
    
    // 1. 從 subgraph.yaml 提取地址
    const addresses = extractAddressesFromSubgraph();
    console.log(`📋 找到 ${Object.keys(addresses).length} 個合約地址`);
    
    // 2. 驗證地址格式
    const validationErrors = validateAddresses(addresses);
    if (validationErrors.length > 0) {
        console.error('❌ 地址驗證失敗:');
        validationErrors.forEach(error => console.error(`   ${error}`));
        process.exit(1);
    }
    
    // 3. 顯示提取到的地址
    console.log('\n📍 提取到的合約地址:');
    Object.entries(addresses).forEach(([name, address]) => {
        console.log(`   ${name}: ${address}`);
    });
    
    // 4. 更新 config.ts
    updateConfigFile(addresses);
    
    console.log('\n🎉 地址同步完成！');
    console.log('💡 現在只需要維護 subgraph.yaml 一個文件的地址');
}

// 執行主函數
if (require.main === module) {
    main();
}