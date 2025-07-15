/**
 * 子圖同步問題診斷腳本
 * 
 * 用途：
 * 1. 檢查合約部署區塊
 * 2. 驗證子圖配置
 * 3. 測試 The Graph 連接
 * 4. 提供修復建議
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

// BSC 主網 RPC 端點
const BSC_RPC_ENDPOINTS = [
    'https://bsc-dataseed1.binance.org/',
    'https://bsc-dataseed2.binance.org/',
    'https://bsc-dataseed3.binance.org/',
    'https://bsc-dataseed4.binance.org/'
];

// The Graph Studio API
const GRAPH_STUDIO_API = 'https://api.studio.thegraph.com/query/115633/dungeon-delvers/v2.0.1';

class SubgraphDiagnostic {
    constructor() {
        this.issues = [];
        this.suggestions = [];
        this.subgraphConfig = null;
    }

    async diagnose() {
        console.log('🔍 開始診斷子圖同步問題...\n');

        try {
            // 1. 讀取子圖配置
            await this.loadSubgraphConfig();
            
            // 2. 檢查合約部署區塊
            await this.checkContractDeploymentBlocks();
            
            // 3. 檢查 The Graph 連接
            await this.checkGraphConnection();
            
            // 4. 檢查代碼中的警告
            this.checkCodeWarnings();
            
            // 5. 生成報告
            this.generateReport();
            
        } catch (error) {
            console.error('❌ 診斷過程中發生錯誤:', error.message);
        }
    }

    async loadSubgraphConfig() {
        try {
            const yamlPath = path.join(__dirname, '../subgraph.yaml');
            const yamlContent = fs.readFileSync(yamlPath, 'utf8');
            this.subgraphConfig = yaml.load(yamlContent);
            console.log('✅ 成功讀取 subgraph.yaml');
        } catch (error) {
            this.issues.push('無法讀取 subgraph.yaml 文件');
            throw error;
        }
    }

    async checkContractDeploymentBlocks() {
        console.log('🔍 檢查合約部署區塊...');
        
        const dataSources = this.subgraphConfig.dataSources;
        
        for (const dataSource of dataSources) {
            const contractName = dataSource.name;
            const contractAddress = dataSource.source.address;
            const configuredStartBlock = dataSource.source.startBlock;
            
            try {
                const actualDeploymentBlock = await this.getContractDeploymentBlock(contractAddress);
                
                if (actualDeploymentBlock && actualDeploymentBlock !== configuredStartBlock) {
                    this.issues.push(
                        `${contractName} 合約配置的起始區塊 (${configuredStartBlock}) ` +
                        `與實際部署區塊 (${actualDeploymentBlock}) 不匹配`
                    );
                    
                    this.suggestions.push(
                        `更新 ${contractName} 的 startBlock 為 ${actualDeploymentBlock}`
                    );
                }
                
                console.log(`  ${contractName}: 配置=${configuredStartBlock}, 實際=${actualDeploymentBlock || '未知'}`);
                
            } catch (error) {
                console.log(`  ⚠️  無法獲取 ${contractName} 的部署區塊: ${error.message}`);
            }
        }
    }

    async getContractDeploymentBlock(contractAddress) {
        // 這裡實現獲取合約部署區塊的邏輯
        // 實際實現需要調用 BSC RPC
        return null; // 暫時返回 null
    }

    async checkGraphConnection() {
        console.log('🔍 檢查 The Graph 連接...');
        
        try {
            // 測試基本查詢
            const testQuery = `
                query TestQuery {
                    heroes(first: 1) {
                        id
                    }
                }
            `;
            
            const response = await this.queryGraph(testQuery);
            
            if (response.errors) {
                this.issues.push('The Graph 查詢返回錯誤: ' + JSON.stringify(response.errors));
            } else {
                console.log('✅ The Graph 連接正常');
            }
            
        } catch (error) {
            this.issues.push('無法連接到 The Graph: ' + error.message);
        }
    }

    async queryGraph(query) {
        return new Promise((resolve, reject) => {
            const postData = JSON.stringify({ query });
            
            const options = {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(postData)
                }
            };
            
            const req = https.request(GRAPH_STUDIO_API, options, (res) => {
                let data = '';
                res.on('data', (chunk) => data += chunk);
                res.on('end', () => {
                    try {
                        resolve(JSON.parse(data));
                    } catch (e) {
                        reject(e);
                    }
                });
            });
            
            req.on('error', reject);
            req.write(postData);
            req.end();
        });
    }

    checkCodeWarnings() {
        console.log('🔍 檢查代碼中的警告模式...');
        
        const srcDir = path.join(__dirname, '../src');
        const tsFiles = fs.readdirSync(srcDir).filter(file => file.endsWith('.ts'));
        
        const warningPatterns = [
            'Transfer handled for a.*that doesn\'t exist',
            'Hero already exists',
            'Party already exists',
            'non-existent profile'
        ];
        
        let warningCount = 0;
        
        tsFiles.forEach(file => {
            const filePath = path.join(srcDir, file);
            const content = fs.readFileSync(filePath, 'utf8');
            
            warningPatterns.forEach(pattern => {
                const regex = new RegExp(pattern, 'g');
                const matches = content.match(regex);
                if (matches) {
                    warningCount += matches.length;
                }
            });
        });
        
        if (warningCount > 0) {
            this.issues.push(`發現 ${warningCount} 個潛在的警告模式，可能導致同步問題`);
            this.suggestions.push('改進事件處理函數中的錯誤處理邏輯');
        }
    }

    generateReport() {
        console.log('\n📋 診斷報告');
        console.log('='.repeat(50));
        
        if (this.issues.length === 0) {
            console.log('✅ 未發現明顯問題');
        } else {
            console.log('🚨 發現的問題:');
            this.issues.forEach((issue, index) => {
                console.log(`  ${index + 1}. ${issue}`);
            });
        }
        
        if (this.suggestions.length > 0) {
            console.log('\n💡 建議的修復方案:');
            this.suggestions.forEach((suggestion, index) => {
                console.log(`  ${index + 1}. ${suggestion}`);
            });
        }
        
        console.log('\n🔧 後續步驟:');
        console.log('  1. 檢查 The Graph Studio 中的子圖狀態');
        console.log('  2. 查看子圖的錯誤日誌');
        console.log('  3. 考慮重新部署子圖');
        console.log('  4. 監控同步進度');
        
        // 生成修復腳本
        this.generateFixScript();
    }

    generateFixScript() {
        const fixScript = `#!/bin/bash
# 子圖修復腳本
# 由診斷工具自動生成

echo "🚀 開始修復子圖同步問題..."

# 1. 同步地址
echo "📦 同步合約地址..."
npm run sync-addresses

# 2. 重新構建
echo "🔨 重新構建子圖..."
npx graph build

# 3. 部署到 The Graph Studio
echo "🚀 部署到 The Graph Studio..."
npx graph deploy --node https://api.studio.thegraph.com/deploy/ dungeon-delvers

echo "✅ 修復腳本執行完成"
echo "請在 The Graph Studio 中監控部署狀態"
`;
        
        fs.writeFileSync(path.join(__dirname, '../fix-sync-issues.sh'), fixScript);
        console.log('\n📝 已生成修復腳本: fix-sync-issues.sh');
    }
}

// 執行診斷
if (require.main === module) {
    const diagnostic = new SubgraphDiagnostic();
    diagnostic.diagnose().catch(console.error);
}

module.exports = SubgraphDiagnostic;