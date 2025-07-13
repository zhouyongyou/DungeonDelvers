#!/usr/bin/env node

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// 載入配置
const config = JSON.parse(fs.readFileSync('./shared-config.json', 'utf8'));

const services = {
  frontend: {
    name: '前端開發服務器',
    dir: './src',
    command: 'npm run dev',
    port: 5173,
    healthCheck: 'http://localhost:5173'
  },
  backend: {
    name: '後端 API 服務器',
    dir: './dungeon-delvers-metadata-server',
    command: 'npm start',
    port: 3001,
    healthCheck: 'http://localhost:3001/health'
  },
  subgraph: {
    name: 'The Graph 子圖',
    dir: './DDgraphql/dungeon-delvers',
    command: 'docker-compose up -d',
    port: 8000,
    healthCheck: 'http://localhost:8000'
  }
};

class ServiceManager {
  constructor() {
    this.processes = new Map();
  }

  async checkPort(port) {
    try {
      execSync(`lsof -i :${port}`, { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }

  async killPort(port) {
    try {
      execSync(`lsof -ti :${port} | xargs kill -9`, { stdio: 'ignore' });
      console.log(`✅ 已清理端口 ${port}`);
    } catch {
      // 端口可能已經空閒
    }
  }

  async startService(serviceName) {
    const service = services[serviceName];
    if (!service) {
      console.error(`❌ 未知服務: ${serviceName}`);
      return;
    }

    console.log(`🚀 啟動 ${service.name}...`);

    // 檢查端口是否被占用
    if (await this.checkPort(service.port)) {
      console.log(`⚠️  端口 ${service.port} 已被占用，正在清理...`);
      await this.killPort(service.port);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // 檢查目錄是否存在
    if (!fs.existsSync(service.dir)) {
      console.error(`❌ 目錄不存在: ${service.dir}`);
      return;
    }

    // 啟動服務
    try {
      const process = spawn('sh', ['-c', service.command], {
        cwd: service.dir,
        stdio: 'inherit'
      });

      this.processes.set(serviceName, process);

      process.on('exit', (code) => {
        console.log(`${service.name} 已退出，代碼: ${code}`);
        this.processes.delete(serviceName);
      });

      // 等待服務啟動
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // 健康檢查
      if (service.healthCheck) {
        try {
          execSync(`curl -f ${service.healthCheck}`, { stdio: 'ignore' });
          console.log(`✅ ${service.name} 啟動成功`);
        } catch {
          console.log(`⚠️  ${service.name} 可能還在啟動中...`);
        }
      }

    } catch (error) {
      console.error(`❌ 啟動 ${service.name} 失敗:`, error.message);
    }
  }

  async stopService(serviceName) {
    const service = services[serviceName];
    if (!service) {
      console.error(`❌ 未知服務: ${serviceName}`);
      return;
    }

    console.log(`🛑 停止 ${service.name}...`);

    // 停止進程
    const process = this.processes.get(serviceName);
    if (process) {
      process.kill('SIGTERM');
      this.processes.delete(serviceName);
    }

    // 清理端口
    await this.killPort(service.port);
    console.log(`✅ ${service.name} 已停止`);
  }

  async restartService(serviceName) {
    await this.stopService(serviceName);
    await new Promise(resolve => setTimeout(resolve, 2000));
    await this.startService(serviceName);
  }

  async startAll() {
    console.log('🚀 啟動所有服務...');
    for (const serviceName of Object.keys(services)) {
      await this.startService(serviceName);
    }
  }

  async stopAll() {
    console.log('🛑 停止所有服務...');
    for (const serviceName of Object.keys(services)) {
      await this.stopService(serviceName);
    }
  }

  async status() {
    console.log('📊 服務狀態檢查...\n');
    
    for (const [serviceName, service] of Object.entries(services)) {
      const isRunning = await this.checkPort(service.port);
      const status = isRunning ? '🟢 運行中' : '🔴 已停止';
      console.log(`${service.name}: ${status} (端口 ${service.port})`);
    }

    console.log('\n📋 合約地址:');
    for (const [name, address] of Object.entries(config.contracts)) {
      console.log(`  ${name}: ${address}`);
    }
  }

  async updateConfig() {
    console.log('🔄 更新配置...');
    
    // 更新前端環境變數
    const frontendEnv = `
VITE_MAINNET_HERO_ADDRESS=${config.contracts.hero}
VITE_MAINNET_RELIC_ADDRESS=${config.contracts.relic}
VITE_MAINNET_PARTY_ADDRESS=${config.contracts.party}
VITE_MAINNET_VIPSTAKING_ADDRESS=${config.contracts.vipStaking}
VITE_MAINNET_PLAYERPROFILE_ADDRESS=${config.contracts.playerProfile}
VITE_MAINNET_DUNGEONCORE_ADDRESS=${config.contracts.dungeonCore}
VITE_SUBGRAPH_URL=${config.services.subgraph.url}
`;

    // 更新後端環境變數
    const backendEnv = `
VITE_MAINNET_HERO_ADDRESS=${config.contracts.hero}
VITE_MAINNET_RELIC_ADDRESS=${config.contracts.relic}
VITE_MAINNET_PARTY_ADDRESS=${config.contracts.party}
VITE_MAINNET_VIPSTAKING_ADDRESS=${config.contracts.vipStaking}
THE_GRAPH_API_URL=${config.services.subgraph.url}
`;

    // 寫入文件
    fs.writeFileSync('./src/.env', frontendEnv);
    fs.writeFileSync('./dungeon-delvers-metadata-server/.env', backendEnv);
    
    console.log('✅ 配置更新完成');
  }
}

// 主程序
async function main() {
  const manager = new ServiceManager();
  const command = process.argv[2];
  const service = process.argv[3];

  switch (command) {
    case 'start':
      if (service) {
        await manager.startService(service);
      } else {
        await manager.startAll();
      }
      break;

    case 'stop':
      if (service) {
        await manager.stopService(service);
      } else {
        await manager.stopAll();
      }
      break;

    case 'restart':
      if (service) {
        await manager.restartService(service);
      } else {
        await manager.stopAll();
        await manager.startAll();
      }
      break;

    case 'status':
      await manager.status();
      break;

    case 'update-config':
      await manager.updateConfig();
      break;

    default:
      console.log(`
🎮 Dungeon Delvers 服務管理器

使用方法:
  node manage.js <command> [service]

命令:
  start [service]     - 啟動服務 (frontend, backend, subgraph)
  stop [service]      - 停止服務
  restart [service]   - 重啟服務
  status              - 查看服務狀態
  update-config       - 更新配置文件

範例:
  node manage.js start          # 啟動所有服務
  node manage.js start frontend # 只啟動前端
  node manage.js status         # 查看狀態
  node manage.js update-config  # 更新配置
      `);
  }
}

// 優雅退出
process.on('SIGINT', async () => {
  console.log('\n🛑 正在關閉所有服務...');
  const manager = new ServiceManager();
  await manager.stopAll();
  process.exit(0);
});

main().catch(console.error); 