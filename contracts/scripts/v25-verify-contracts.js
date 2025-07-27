#!/usr/bin/env node

/**
 * V25 合約驗證腳本
 * 
 * 自動驗證所有已部署的合約
 * 支援批量驗證和錯誤重試
 * 
 * 使用方式：
 * node scripts/active/v25-verify-contracts.js
 * node scripts/active/v25-verify-contracts.js --only HERO,RELIC
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
require('dotenv').config();

// 顏色輸出
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

class V25Verifier {
  constructor() {
    this.v25Config = null;
    this.verificationData = null;
    this.onlyContracts = this.parseOnlyContracts();
    this.results = {
      success: [],
      failed: [],
      skipped: []
    };
  }

  parseOnlyContracts() {
    const onlyIndex = process.argv.indexOf('--only');
    if (onlyIndex !== -1 && process.argv[onlyIndex + 1]) {
      return process.argv[onlyIndex + 1].split(',');
    }
    return null;
  }

  log(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const prefix = {
      info: `${colors.blue}[INFO]${colors.reset}`,
      success: `${colors.green}[SUCCESS]${colors.reset}`,
      error: `${colors.red}[ERROR]${colors.reset}`,
      warning: `${colors.yellow}[WARNING]${colors.reset}`
    };
    console.log(`${prefix[type]} ${timestamp} ${message}`);
  }

  async verify() {
    console.log(`${colors.bright}
==================================================
🔍 V25 合約驗證腳本
==================================================
${colors.reset}`);

    try {
      // 載入配置
      await this.loadConfigs();
      
      // 檢查 API Key
      this.checkApiKey();
      
      // 執行驗證
      await this.verifyContracts();
      
      // 生成報告
      await this.generateReport();
      
      // 顯示結果
      this.showResults();
      
    } catch (error) {
      this.log(`驗證失敗: ${error.message}`, 'error');
      console.error(error);
      process.exit(1);
    }
  }

  async loadConfigs() {
    this.log('載入配置...', 'info');
    
    // 載入 V25 配置
    const configPath = path.join(__dirname, '../../config/v25-config.js');
    if (!fs.existsSync(configPath)) {
      throw new Error('V25 配置文件不存在');
    }
    this.v25Config = require(configPath);
    this.log(`已載入配置: ${Object.keys(this.v25Config.contracts).length} 個合約`, 'info');
    
    // 載入驗證數據
    const deploymentsDir = path.join(__dirname, '../deployments');
    const verificationFiles = fs.readdirSync(deploymentsDir)
      .filter(f => f.startsWith('v25-verification-'))
      .sort()
      .reverse();
    
    if (verificationFiles.length > 0) {
      const latestVerificationFile = path.join(deploymentsDir, verificationFiles[0]);
      const verificationContent = JSON.parse(fs.readFileSync(latestVerificationFile, 'utf8'));
      this.verificationData = verificationContent.verificationData || [];
      this.log(`已載入驗證數據: ${latestVerificationFile}`, 'info');
    } else {
      this.log('找不到驗證數據文件', 'warning');
      this.verificationData = [];
    }
  }

  checkApiKey() {
    if (!process.env.BSCSCAN_API_KEY) {
      throw new Error('BSCSCAN_API_KEY 環境變數未設置');
    }
    this.log('BSCScan API Key 已配置', 'info');
  }

  async verifyContracts() {
    this.log('\n開始驗證合約...', 'info');
    
    // 構建驗證列表
    const contractsToVerify = this.buildVerificationList();
    
    // 執行驗證
    for (const contract of contractsToVerify) {
      await this.verifyContract(contract);
    }
  }

  buildVerificationList() {
    const list = [];
    
    // 從配置中獲取所有合約
    for (const [name, data] of Object.entries(this.v25Config.contracts)) {
      // 檢查是否只驗證特定合約
      if (this.onlyContracts && !this.onlyContracts.includes(name)) {
        this.results.skipped.push(name);
        continue;
      }
      
      // 查找驗證數據
      const verifyData = this.verificationData.find(v => v.name === name);
      
      list.push({
        name,
        address: data.address,
        contractName: data.contractName || verifyData?.contractName || name,
        constructorArgs: verifyData?.constructorArgs || []
      });
    }
    
    return list;
  }

  async verifyContract(contract) {
    this.log(`\n驗證 ${contract.name}...`, 'info');
    
    try {
      // 構建驗證命令
      const args = [
        contract.address,
        ...contract.constructorArgs.map(arg => {
          // 處理不同類型的參數
          if (typeof arg === 'string' && arg.startsWith('0x')) {
            return arg; // 地址
          } else if (typeof arg === 'object' && arg._isBigNumber) {
            return arg.toString(); // BigNumber
          } else {
            return String(arg); // 其他
          }
        })
      ].join(' ');
      
      const command = `npx hardhat verify --network bsc ${args}`;
      this.log(`執行命令: ${command}`, 'info');
      
      // 執行驗證
      const output = execSync(command, {
        cwd: path.join(__dirname, '../..'),
        encoding: 'utf8',
        stdio: 'pipe'
      });
      
      if (output.includes('Successfully verified') || output.includes('Already Verified')) {
        this.log(`✅ ${contract.name} 驗證成功`, 'success');
        this.results.success.push(contract.name);
      } else {
        throw new Error('驗證結果不明確');
      }
      
    } catch (error) {
      const errorMessage = error.message || error.toString();
      
      if (errorMessage.includes('Already Verified')) {
        this.log(`⚠️ ${contract.name} 已經驗證過`, 'warning');
        this.results.success.push(contract.name);
      } else if (errorMessage.includes('does not have bytecode')) {
        this.log(`❌ ${contract.name} 合約未部署或地址錯誤`, 'error');
        this.results.failed.push({ name: contract.name, error: '合約未部署' });
      } else {
        this.log(`❌ ${contract.name} 驗證失敗: ${errorMessage}`, 'error');
        this.results.failed.push({ name: contract.name, error: errorMessage });
      }
    }
    
    // 防止 API 限制
    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  async generateReport() {
    const reportPath = path.join(__dirname, '../deployments', `v25-verification-report-${Date.now()}.json`);
    
    const report = {
      version: 'V25',
      timestamp: new Date().toISOString(),
      results: this.results,
      contracts: this.v25Config.contracts
    };
    
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    this.log(`\n驗證報告已保存: ${reportPath}`, 'info');
  }

  showResults() {
    console.log(`\n${colors.bright}驗證結果總結:${colors.reset}`);
    console.log(`✅ 成功: ${this.results.success.length}`);
    console.log(`❌ 失敗: ${this.results.failed.length}`);
    console.log(`⏭️  跳過: ${this.results.skipped.length}`);
    
    if (this.results.failed.length > 0) {
      console.log(`\n${colors.bright}失敗的合約:${colors.reset}`);
      for (const fail of this.results.failed) {
        console.log(`- ${fail.name}: ${fail.error}`);
      }
      
      console.log(`\n${colors.bright}重試失敗的合約:${colors.reset}`);
      const failedNames = this.results.failed.map(f => f.name).join(',');
      console.log(`node scripts/active/v25-verify-contracts.js --only ${failedNames}`);
    }
    
    if (this.results.success.length === Object.keys(this.v25Config.contracts).length) {
      this.log('\n🎉 所有合約驗證成功！', 'success');
    }
  }
}

// 執行驗證
async function main() {
  const verifier = new V25Verifier();
  await verifier.verify();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });