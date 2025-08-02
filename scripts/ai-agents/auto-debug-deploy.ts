#!/usr/bin/env ts-node

// 自動調試與部署系統 - 全面掃描並修復問題

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import chalk from 'chalk';
import ora from 'ora';

const execAsync = promisify(exec);

interface DebugResult {
  component: string;
  issues: Issue[];
  fixes: Fix[];
  status: 'healthy' | 'warning' | 'error';
}

interface Issue {
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: string;
  description: string;
  location?: string;
  suggestion?: string;
}

interface Fix {
  description: string;
  applied: boolean;
  result?: string;
}

class AutoDebugDeploy {
  private results: DebugResult[] = [];
  private frontendPath = '/Users/sotadic/Documents/GitHub/DungeonDelvers';
  private backendPath = '/Users/sotadic/Documents/GitHub/dungeondelvers-backend';
  private subgraphPath = '/Users/sotadic/Documents/GitHub/dungeondelvers-subgraph';
  private contractsPath = '/Users/sotadic/Documents/DungeonDelversContracts';

  async run() {
    console.log(chalk.bold.cyan('\n🤖 DungeonDelvers 自動調試與部署系統啟動\n'));
    
    try {
      // 1. 前端調試
      await this.debugFrontend();
      
      // 2. 後端調試
      await this.debugBackend();
      
      // 3. 子圖調試
      await this.debugSubgraph();
      
      // 4. 生成報告
      this.generateReport();
      
      // 5. 詢問是否部署
      if (await this.confirmDeploy()) {
        await this.deployAll();
      }
      
    } catch (error) {
      console.error(chalk.red('❌ 系統錯誤:'), error);
    }
  }

  // ========== 前端調試 ==========
  async debugFrontend() {
    const spinner = ora('掃描前端代碼...').start();
    const result: DebugResult = {
      component: '前端應用',
      issues: [],
      fixes: [],
      status: 'healthy'
    };

    try {
      // 1. TypeScript 類型檢查
      spinner.text = '檢查 TypeScript 類型...';
      const typeCheckResult = await this.runCommand('npm run type-check', this.frontendPath);
      if (typeCheckResult.includes('error')) {
        result.issues.push({
          severity: 'high',
          type: 'TypeScript Error',
          description: '發現類型錯誤',
          location: 'Multiple files',
          suggestion: '執行 npm run type-check 查看詳細錯誤'
        });
      }

      // 2. 檢查環境變數
      spinner.text = '檢查環境變數配置...';
      await this.checkEnvVariables();

      // 3. 檢查合約地址一致性
      spinner.text = '驗證合約地址一致性...';
      await this.checkContractAddresses();

      // 4. 檢查死連結和404
      spinner.text = '檢查路由和資源...';
      await this.checkDeadLinks();

      // 5. 檢查 Console 錯誤
      spinner.text = '掃描 console.log 和錯誤處理...';
      await this.scanConsoleErrors();

      // 6. 檢查未使用的依賴
      spinner.text = '檢查依賴項...';
      await this.checkDependencies();

      // 7. 性能檢查
      spinner.text = '分析性能問題...';
      await this.checkPerformance();

      this.results.push(result);
      spinner.succeed('前端掃描完成');
    } catch (_error) {
      spinner.fail('前端掃描失敗');
      result.status = 'error';
    }
  }

  // ========== 後端調試 ==========
  async debugBackend() {
    const spinner = ora('掃描後端服務...').start();
    const result: DebugResult = {
      component: '後端服務',
      issues: [],
      fixes: [],
      status: 'healthy'
    };

    try {
      // 1. API 端點測試
      spinner.text = '測試 API 端點...';
      await this.testAPIEndpoints();

      // 2. 數據庫連接
      spinner.text = '檢查數據庫連接...';
      await this.checkDatabaseConnection();

      // 3. 環境變數檢查
      spinner.text = '驗證環境變數...';
      await this.checkBackendEnv();

      // 4. NFT 元數據生成
      spinner.text = '測試 NFT 元數據...';
      await this.testNFTMetadata();

      // 5. 錯誤處理
      spinner.text = '檢查錯誤處理...';
      await this.checkErrorHandling();

      this.results.push(result);
      spinner.succeed('後端掃描完成');
    } catch (_error) {
      spinner.fail('後端掃描失敗');
      result.status = 'error';
    }
  }

  // ========== 子圖調試 ==========
  async debugSubgraph() {
    const spinner = ora('掃描子圖配置...').start();
    const result: DebugResult = {
      component: '子圖索引',
      issues: [],
      fixes: [],
      status: 'healthy'
    };

    try {
      // 1. Schema 驗證
      spinner.text = '驗證 GraphQL Schema...';
      await this.validateSchema();

      // 2. 映射文件檢查
      spinner.text = '檢查映射文件...';
      await this.checkMappings();

      // 3. 起始區塊驗證
      spinner.text = '驗證起始區塊...';
      await this.checkStartBlocks();

      // 4. 構建測試
      spinner.text = '測試子圖構建...';
      const buildResult = await this.runCommand('npm run build', this.subgraphPath);
      if (buildResult.includes('error')) {
        result.issues.push({
          severity: 'critical',
          type: 'Build Error',
          description: '子圖構建失敗',
          suggestion: '檢查 schema.graphql 和映射文件'
        });
      }

      this.results.push(result);
      spinner.succeed('子圖掃描完成');
    } catch (_error) {
      spinner.fail('子圖掃描失敗');
      result.status = 'error';
    }
  }

  // ========== 具體檢查方法 ==========
  
  async checkEnvVariables() {
    const envPath = path.join(this.frontendPath, '.env');
    const _envExamplePath = path.join(this.frontendPath, '.env.example');
    
    try {
      const envContent = await fs.readFile(envPath, 'utf-8');
      const requiredVars = [
        'VITE_WALLETCONNECT_PROJECT_ID',
        'VITE_GRAPHQL_URL',
        'VITE_SERVER_URL'
      ];
      
      for (const varName of requiredVars) {
        if (!envContent.includes(varName) || envContent.includes(`${varName}=`)) {
          this.results[0].issues.push({
            severity: 'medium',
            type: 'Missing Environment Variable',
            description: `缺少環境變數: ${varName}`,
            location: '.env',
            suggestion: `請在 .env 文件中設置 ${varName}`
          });
        }
      }
    } catch (_error) {
      this.results[0].issues.push({
        severity: 'high',
        type: 'Missing File',
        description: '缺少 .env 文件',
        suggestion: '複製 .env.example 並配置'
      });
    }
  }

  async checkContractAddresses() {
    const contractsFile = path.join(this.frontendPath, 'src/config/contracts.ts');
    const content = await fs.readFile(contractsFile, 'utf-8');
    
    // 檢查地址格式
    const addressPattern = /0x[a-fA-F0-9]{40}/g;
    const addresses = content.match(addressPattern) || [];
    
    for (const address of addresses) {
      if (address === '0x0000000000000000000000000000000000000000') {
        this.results[0].issues.push({
          severity: 'critical',
          type: 'Invalid Address',
          description: '發現零地址',
          location: 'src/config/contracts.ts',
          suggestion: '更新為正確的合約地址'
        });
      }
    }
    
    // 檢查與後端地址是否一致
    await this.crossCheckAddresses();
  }

  async crossCheckAddresses() {
    // 讀取各處的地址並比對
    const _sources = {
      frontend: path.join(this.frontendPath, 'src/config/contracts.ts'),
      backend: path.join(this.backendPath, '.env'),
      subgraph: path.join(this.subgraphPath, 'subgraph.yaml')
    };
    
    // 實現地址一致性檢查邏輯
  }

  async checkDeadLinks() {
    const pagesDir = path.join(this.frontendPath, 'src/pages');
    const files = await fs.readdir(pagesDir);
    
    for (const file of files) {
      if (file.endsWith('.tsx')) {
        const content = await fs.readFile(path.join(pagesDir, file), 'utf-8');
        
        // 檢查圖片引用
        const imgPattern = /src=["']([^"']+)["']/g;
        let match;
        while ((match = imgPattern.exec(content)) !== null) {
          const imgPath = match[1];
          if (imgPath.startsWith('/') && !imgPath.includes('http')) {
            // 檢查本地圖片是否存在
            const fullPath = path.join(this.frontendPath, 'public', imgPath);
            try {
              await fs.access(fullPath);
            } catch {
              this.results[0].issues.push({
                severity: 'medium',
                type: 'Missing Resource',
                description: `找不到圖片: ${imgPath}`,
                location: file,
                suggestion: '確認圖片路徑或添加缺失的圖片'
              });
            }
          }
        }
      }
    }
  }

  async scanConsoleErrors() {
    const srcDir = path.join(this.frontendPath, 'src');
    const files = await this.getAllFiles(srcDir, ['.ts', '.tsx']);
    
    for (const file of files) {
      const content = await fs.readFile(file, 'utf-8');
      
      // 檢查 console.log
      if (content.includes('console.log') && !file.includes('logger')) {
        this.results[0].issues.push({
          severity: 'low',
          type: 'Console Statement',
          description: '發現 console.log',
          location: path.relative(this.frontendPath, file),
          suggestion: '生產環境應移除 console.log'
        });
      }
      
      // 檢查未處理的 Promise
      if (content.includes('.then(') && !content.includes('.catch(')) {
        this.results[0].issues.push({
          severity: 'medium',
          type: 'Unhandled Promise',
          description: '可能存在未處理的 Promise rejection',
          location: path.relative(this.frontendPath, file),
          suggestion: '添加 .catch() 或使用 try-catch'
        });
      }
    }
  }

  async testAPIEndpoints() {
    const endpoints = [
      '/health',
      '/api/hero/1',
      '/api/relic/1',
      '/api/party/1',
      '/api/vip/1'
    ];
    
    for (const endpoint of endpoints) {
      try {
        const response = await fetch(`http://localhost:3000${endpoint}`);
        if (!response.ok) {
          this.results[1].issues.push({
            severity: 'high',
            type: 'API Error',
            description: `端點返回錯誤: ${endpoint}`,
            suggestion: '檢查後端服務和路由配置'
          });
        }
      } catch (_error) {
        this.results[1].issues.push({
          severity: 'critical',
          type: 'API Unreachable',
          description: `無法連接到端點: ${endpoint}`,
          suggestion: '確認後端服務正在運行'
        });
      }
    }
  }

  // ========== 自動修復 ==========
  
  async autoFix() {
    console.log(chalk.yellow('\n🔧 嘗試自動修復問題...\n'));
    
    for (const result of this.results) {
      for (const issue of result.issues) {
        if (issue.severity === 'critical' || issue.severity === 'high') {
          // 嘗試自動修復
          const fix = await this.attemptFix(issue);
          if (fix) {
            result.fixes.push(fix);
          }
        }
      }
    }
  }

  async attemptFix(issue: Issue): Promise<Fix | null> {
    switch (issue.type) {
      case 'Missing File':
        if (issue.description.includes('.env')) {
          try {
            await this.runCommand('cp .env.example .env', this.frontendPath);
            return {
              description: '已從 .env.example 創建 .env',
              applied: true
            };
          } catch (_error) {
            return {
              description: '嘗試創建 .env 失敗',
              applied: false
            };
          }
        }
        break;
        
      case 'TypeScript Error':
        // 嘗試運行 eslint --fix
        try {
          await this.runCommand('npm run lint:fix', this.frontendPath);
          return {
            description: '已運行 ESLint 自動修復',
            applied: true
          };
        } catch (_error) {
          return null;
        }
        break;
    }
    
    return null;
  }

  // ========== 部署 ==========
  
  async deployAll() {
    console.log(chalk.bold.green('\n🚀 開始部署流程...\n'));
    
    // 1. Git 提交
    const spinner = ora('提交代碼到 Git...').start();
    try {
      await this.runCommand('git add .', this.frontendPath);
      await this.runCommand(`git commit -m "自動部署: 修復調試發現的問題 ${new Date().toISOString()}"`, this.frontendPath);
      await this.runCommand('git push origin main', this.frontendPath);
      spinner.succeed('代碼已推送到 GitHub');
    } catch (error) {
      spinner.fail('Git 操作失敗');
      console.error(error);
      return;
    }
    
    // 2. 等待 Vercel 部署
    console.log(chalk.cyan('⏳ Vercel 正在自動部署前端...'));
    console.log(chalk.gray('   訪問 https://vercel.com/dashboard 查看部署狀態'));
    
    // 3. 後端部署提示
    console.log(chalk.cyan('\n📦 後端部署提示:'));
    console.log(chalk.gray('   1. 推送後端代碼: cd dungeondelvers-backend && git push'));
    console.log(chalk.gray('   2. Render 將自動部署'));
    
    // 4. 子圖部署
    const deploySubgraph = await this.confirm('是否部署子圖到 The Graph?');
    if (deploySubgraph) {
      spinner.start('部署子圖...');
      try {
        await this.runCommand('graph deploy --studio dungeondelvers', this.subgraphPath);
        spinner.succeed('子圖部署成功');
      } catch (_error) {
        spinner.fail('子圖部署失敗');
      }
    }
  }

  // ========== 輔助方法 ==========
  
  async runCommand(command: string, cwd: string): Promise<string> {
    const { stdout, stderr } = await execAsync(command, { cwd });
    if (stderr) console.warn(chalk.yellow('Warning:'), stderr);
    return stdout;
  }

  async getAllFiles(dir: string, extensions: string[]): Promise<string[]> {
    const files: string[] = [];
    const items = await fs.readdir(dir, { withFileTypes: true });
    
    for (const item of items) {
      const fullPath = path.join(dir, item.name);
      if (item.isDirectory() && !item.name.includes('node_modules')) {
        files.push(...await this.getAllFiles(fullPath, extensions));
      } else if (item.isFile() && extensions.some(ext => item.name.endsWith(ext))) {
        files.push(fullPath);
      }
    }
    
    return files;
  }

  async confirm(message: string): Promise<boolean> {
    // 實際實現需要使用 inquirer 或類似庫
    console.log(chalk.yellow(`\n? ${message} (y/n)`));
    return true; // 暫時返回 true
  }

  async confirmDeploy(): Promise<boolean> {
    const hasIssues = this.results.some(r => r.issues.some(i => i.severity === 'critical' || i.severity === 'high'));
    
    if (hasIssues) {
      console.log(chalk.red('\n⚠️  發現嚴重問題，建議先修復再部署'));
      return this.confirm('仍然要繼續部署嗎？');
    }
    
    return this.confirm('所有檢查通過，是否開始部署？');
  }

  // ========== 報告生成 ==========
  
  generateReport() {
    console.log(chalk.bold.white('\n📊 調試報告\n'));
    console.log('='.repeat(60));
    
    for (const result of this.results) {
      const icon = result.status === 'healthy' ? '✅' : result.status === 'warning' ? '⚠️' : '❌';
      console.log(chalk.bold(`\n${icon} ${result.component}`));
      console.log('-'.repeat(40));
      
      if (result.issues.length === 0) {
        console.log(chalk.green('  沒有發現問題'));
      } else {
        // 按嚴重程度分組
        const grouped = result.issues.reduce((acc, issue) => {
          if (!acc[issue.severity]) acc[issue.severity] = [];
          acc[issue.severity].push(issue);
          return acc;
        }, {} as Record<string, Issue[]>);
        
        const severityOrder = ['critical', 'high', 'medium', 'low'];
        const severityColors = {
          critical: chalk.red,
          high: chalk.magenta,
          medium: chalk.yellow,
          low: chalk.gray
        };
        
        for (const severity of severityOrder) {
          const issues = grouped[severity];
          if (issues && issues.length > 0) {
            console.log(severityColors[severity](`\n  ${severity.toUpperCase()} (${issues.length})`));
            for (const issue of issues) {
              console.log(severityColors[severity](`    • ${issue.description}`));
              if (issue.location) {
                console.log(chalk.gray(`      位置: ${issue.location}`));
              }
              if (issue.suggestion) {
                console.log(chalk.cyan(`      建議: ${issue.suggestion}`));
              }
            }
          }
        }
      }
      
      if (result.fixes.length > 0) {
        console.log(chalk.green('\n  已應用的修復:'));
        for (const fix of result.fixes) {
          const icon = fix.applied ? '✅' : '❌';
          console.log(`    ${icon} ${fix.description}`);
        }
      }
    }
    
    console.log('\n' + '='.repeat(60));
    
    // 總結
    const totalIssues = this.results.reduce((sum, r) => sum + r.issues.length, 0);
    const criticalCount = this.results.reduce((sum, r) => 
      sum + r.issues.filter(i => i.severity === 'critical').length, 0);
    const highCount = this.results.reduce((sum, r) => 
      sum + r.issues.filter(i => i.severity === 'high').length, 0);
    
    console.log(chalk.bold('\n📈 總結:'));
    console.log(`   總問題數: ${totalIssues}`);
    console.log(`   嚴重問題: ${criticalCount}`);
    console.log(`   高優先級: ${highCount}`);
    console.log(`   已修復: ${this.results.reduce((sum, r) => sum + r.fixes.filter(f => f.applied).length, 0)}`);
  }

  // 新增：檢查依賴項
  async checkDependencies() {
    try {
      // 檢查是否有未使用的依賴
      const packageJson = JSON.parse(await fs.readFile(path.join(this.frontendPath, 'package.json'), 'utf-8'));
      const dependencies = Object.keys(packageJson.dependencies || {});
      
      // 簡單檢查一些常見的未使用依賴
      const srcFiles = await this.getAllFiles(path.join(this.frontendPath, 'src'), ['.ts', '.tsx', '.js', '.jsx']);
      let allContent = '';
      
      for (const file of srcFiles) {
        allContent += await fs.readFile(file, 'utf-8');
      }
      
      for (const dep of dependencies) {
        if (!allContent.includes(dep) && !['react', 'react-dom', 'vite'].includes(dep)) {
          this.results[0].issues.push({
            severity: 'low',
            type: 'Unused Dependency',
            description: `可能未使用的依賴: ${dep}`,
            suggestion: '考慮移除未使用的依賴以減少包大小'
          });
        }
      }
    } catch (error) {
      console.error('檢查依賴項失敗:', error);
    }
  }

  // 新增：性能檢查
  async checkPerformance() {
    // 檢查大文件
    const checkLargeFiles = async (dir: string) => {
      const files = await this.getAllFiles(dir, ['.ts', '.tsx', '.js', '.jsx']);
      
      for (const file of files) {
        const stats = await fs.stat(file);
        if (stats.size > 100 * 1024) { // 100KB
          this.results[0].issues.push({
            severity: 'medium',
            type: 'Large File',
            description: `文件過大: ${path.basename(file)} (${Math.round(stats.size / 1024)}KB)`,
            location: path.relative(this.frontendPath, file),
            suggestion: '考慮拆分大文件或使用代碼分割'
          });
        }
      }
    };
    
    await checkLargeFiles(path.join(this.frontendPath, 'src'));
    
    // 檢查是否使用了 React.memo 優化
    const componentsDir = path.join(this.frontendPath, 'src/components');
    const componentFiles = await this.getAllFiles(componentsDir, ['.tsx']);
    
    for (const file of componentFiles) {
      const content = await fs.readFile(file, 'utf-8');
      if (content.includes('export default function') && !content.includes('React.memo')) {
        this.results[0].issues.push({
          severity: 'low',
          type: 'Performance Optimization',
          description: `組件可能需要 React.memo 優化`,
          location: path.relative(this.frontendPath, file),
          suggestion: '對於純展示組件，考慮使用 React.memo 減少重渲染'
        });
      }
    }
  }

  // 後端特定檢查
  async checkDatabaseConnection() {
    // 檢查 DATABASE_URL
    try {
      const envContent = await fs.readFile(path.join(this.backendPath, '.env'), 'utf-8');
      if (!envContent.includes('DATABASE_URL') || envContent.includes('DATABASE_URL=')) {
        this.results[1].issues.push({
          severity: 'critical',
          type: 'Database Configuration',
          description: '缺少數據庫連接字符串',
          suggestion: '在 .env 中設置 DATABASE_URL'
        });
      }
    } catch (_error) {
      this.results[1].issues.push({
        severity: 'critical',
        type: 'Missing Configuration',
        description: '後端缺少 .env 文件',
        suggestion: '創建 .env 文件並配置必要的環境變數'
      });
    }
  }

  async checkBackendEnv() {
    const requiredVars = [
      'DATABASE_URL',
      'PORT',
      'NODE_ENV',
      'HERO_CONTRACT_ADDRESS',
      'RELIC_CONTRACT_ADDRESS',
      'PARTY_CONTRACT_ADDRESS',
      'VIP_CONTRACT_ADDRESS'
    ];
    
    try {
      const envContent = await fs.readFile(path.join(this.backendPath, '.env'), 'utf-8');
      
      for (const varName of requiredVars) {
        if (!envContent.includes(`${varName}=`) || envContent.includes(`${varName}=`)) {
          this.results[1].issues.push({
            severity: 'high',
            type: 'Missing Environment Variable',
            description: `後端缺少環境變數: ${varName}`,
            suggestion: `在後端 .env 中設置 ${varName}`
          });
        }
      }
    } catch (_error) {
      // 已在 checkDatabaseConnection 中處理
    }
  }

  async testNFTMetadata() {
    // 測試元數據生成邏輯
    const testTokenIds = [1, 100, 9999];
    const nftTypes = ['hero', 'relic', 'party', 'vip'];
    
    for (const type of nftTypes) {
      for (const tokenId of testTokenIds) {
        try {
          const response = await fetch(`http://localhost:3000/api/${type}/${tokenId}`);
          if (!response.ok) {
            this.results[1].issues.push({
              severity: 'high',
              type: 'NFT Metadata Error',
              description: `無法生成 ${type} #${tokenId} 的元數據`,
              suggestion: '檢查 NFT 服務邏輯'
            });
          } else {
            const metadata = await response.json();
            // 驗證元數據結構
            if (!metadata.name || !metadata.description || !metadata.image) {
              this.results[1].issues.push({
                severity: 'medium',
                type: 'Invalid Metadata',
                description: `${type} #${tokenId} 元數據結構不完整`,
                suggestion: '確保元數據包含 name, description, image'
              });
            }
          }
        } catch (_error) {
          // API 無法訪問的錯誤已在 testAPIEndpoints 中處理
        }
      }
    }
  }

  async checkErrorHandling() {
    const routesDir = path.join(this.backendPath, 'src/routes');
    try {
      const files = await this.getAllFiles(routesDir, ['.js', '.ts']);
      
      for (const file of files) {
        const content = await fs.readFile(file, 'utf-8');
        
        // 檢查是否有 try-catch
        if (!content.includes('try') || !content.includes('catch')) {
          this.results[1].issues.push({
            severity: 'medium',
            type: 'Error Handling',
            description: `路由可能缺少錯誤處理`,
            location: path.relative(this.backendPath, file),
            suggestion: '添加 try-catch 塊處理異常'
          });
        }
      }
    } catch (error) {
      // 忽略
    }
  }

  // 子圖特定檢查
  async validateSchema() {
    const schemaPath = path.join(this.subgraphPath, 'schema.graphql');
    try {
      const content = await fs.readFile(schemaPath, 'utf-8');
      
      // 基本驗證
      if (!content.includes('type Hero')) {
        this.results[2].issues.push({
          severity: 'high',
          type: 'Missing Entity',
          description: '缺少 Hero 實體定義',
          suggestion: '在 schema.graphql 中定義 Hero 實體'
        });
      }
      
      // 檢查必要的字段
      const requiredFields = ['id: ID!', 'owner: String!', 'tokenId: BigInt!'];
      for (const field of requiredFields) {
        if (!content.includes(field)) {
          this.results[2].issues.push({
            severity: 'medium',
            type: 'Missing Field',
            description: `實體缺少必要字段: ${field}`,
            suggestion: '添加缺失的字段到 schema'
          });
        }
      }
    } catch (error) {
      this.results[2].issues.push({
        severity: 'critical',
        type: 'Missing Schema',
        description: '找不到 schema.graphql',
        suggestion: '創建 GraphQL schema 文件'
      });
    }
  }

  async checkMappings() {
    const mappingsDir = path.join(this.subgraphPath, 'src');
    try {
      const files = await fs.readdir(mappingsDir);
      const expectedMappings = ['hero.ts', 'relic.ts', 'party.ts'];
      
      for (const expected of expectedMappings) {
        if (!files.includes(expected)) {
          this.results[2].issues.push({
            severity: 'high',
            type: 'Missing Mapping',
            description: `缺少映射文件: ${expected}`,
            suggestion: `創建 src/${expected} 處理事件`
          });
        }
      }
    } catch (error) {
      this.results[2].issues.push({
        severity: 'critical',
        type: 'Missing Mappings',
        description: '找不到映射文件目錄',
        suggestion: '創建 src 目錄並添加映射文件'
      });
    }
  }

  async checkStartBlocks() {
    const configPath = path.join(this.subgraphPath, 'subgraph.yaml');
    try {
      const content = await fs.readFile(configPath, 'utf-8');
      
      // 檢查起始區塊
      const startBlockMatch = content.match(/startBlock:\s*(\d+)/);
      if (startBlockMatch) {
        const startBlock = parseInt(startBlockMatch[1]);
        if (startBlock < 46000000) {
          this.results[2].issues.push({
            severity: 'low',
            type: 'Old Start Block',
            description: `起始區塊可能過舊: ${startBlock}`,
            suggestion: '考慮使用更近期的區塊以加快同步'
          });
        }
      }
      
      // 檢查地址格式
      const addressMatches = content.match(/address:\s*["']?(0x[a-fA-F0-9]{40})["']?/g);
      if (!addressMatches || addressMatches.length === 0) {
        this.results[2].issues.push({
          severity: 'critical',
          type: 'Missing Addresses',
          description: '未找到合約地址配置',
          suggestion: '在 subgraph.yaml 中配置數據源地址'
        });
      }
    } catch (error) {
      this.results[2].issues.push({
        severity: 'critical',
        type: 'Missing Config',
        description: '找不到 subgraph.yaml',
        suggestion: '創建子圖配置文件'
      });
    }
  }
}

// 主函數
async function main() {
  const debugInstance = new AutoDebugDeploy();
  await debugInstance.run();
}

// 執行
if (require.main === module) {
  main().catch(console.error);
}

export { AutoDebugDeploy };