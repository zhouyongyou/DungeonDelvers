#!/usr/bin/env node

/**
 * 管理后台修复验证脚本
 * 用于验证修复后的应用程序状态
 */

import fs from 'fs';
import path from 'path';

console.log('🔧 管理后台修复验证脚本\n');

const checks = {
  passed: 0,
  failed: 0,
  warnings: 0
};

function logSuccess(message) {
  console.log(`✅ ${message}`);
  checks.passed++;
}

function logError(message) {
  console.log(`❌ ${message}`);
  checks.failed++;
}

function logWarning(message) {
  console.log(`⚠️  ${message}`);
  checks.warnings++;
}

function logInfo(message) {
  console.log(`ℹ️  ${message}`);
}

// 1. 检查 .env 文件
console.log('📋 检查环境变量配置:');

try {
  if (fs.existsSync('.env')) {
    logSuccess('.env 文件存在');
    const envContent = fs.readFileSync('.env', 'utf8');
    
    const requiredVars = [
      'VITE_ALCHEMY_BSC_MAINNET_RPC_URL',
      'VITE_THE_GRAPH_STUDIO_API_URL', 
      'VITE_MAINNET_HERO_ADDRESS',
      'VITE_MAINNET_RELIC_ADDRESS',
      'VITE_MAINNET_PARTY_ADDRESS',
      'VITE_MAINNET_PLAYERPROFILE_ADDRESS',
      'VITE_MAINNET_VIPSTAKING_ADDRESS'
    ];
    
    let configuredVars = 0;
    let placeholderVars = 0;
    
    requiredVars.forEach(varName => {
      if (envContent.includes(varName)) {
        configuredVars++;
        if (envContent.includes('YOUR_') || envContent.includes('0x0000000000000000000000000000000000000000')) {
          placeholderVars++;
        }
      }
    });
    
    logSuccess(`配置了 ${configuredVars}/${requiredVars.length} 个必需环境变量`);
    
    if (placeholderVars > 0) {
      logWarning(`${placeholderVars} 个环境变量仍使用占位符，需要实际地址`);
    } else {
      logSuccess('所有环境变量都已配置实际值');
    }
    
  } else {
    logError('.env 文件不存在');
    logInfo('请复制 .env.example 为 .env 并填入实际的合约地址');
  }
} catch (error) {
  logError(`检查环境变量时出错: ${error.message}`);
}

// 2. 检查依赖安装
console.log('\n📋 检查依赖安装:');

try {
  if (fs.existsSync('node_modules')) {
    logSuccess('node_modules 目录存在');
    
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const devDeps = Object.keys(packageJson.devDependencies || {});
    const deps = Object.keys(packageJson.dependencies || {});
    
    logSuccess(`已安装 ${deps.length} 个生产依赖和 ${devDeps.length} 个开发依赖`);
  } else {
    logError('node_modules 目录不存在');
    logInfo('请运行: npm install');
  }
} catch (error) {
  logError(`检查依赖时出错: ${error.message}`);
}

// 3. 检查错误边界组件
console.log('\n📋 检查错误处理:');

try {
  if (fs.existsSync('src/components/ui/ErrorBoundary.tsx')) {
    logSuccess('ErrorBoundary 组件已创建');
    
    const adminPage = fs.readFileSync('src/pages/AdminPage.tsx', 'utf8');
    if (adminPage.includes('ErrorBoundary')) {
      logSuccess('AdminPage 已包装 ErrorBoundary');
    } else {
      logWarning('AdminPage 未使用 ErrorBoundary');
    }
  } else {
    logWarning('ErrorBoundary 组件不存在');
  }
} catch (error) {
  logError(`检查错误处理时出错: ${error.message}`);
}

// 4. 检查域名配置
console.log('\n📋 检查域名配置:');

try {
  const metadataServer = fs.readFileSync('dungeon-delvers-metadata-server/src/index.js', 'utf8');
  if (metadataServer.includes('dungeondelvers.xyz')) {
    logSuccess('Metadata server 使用正确域名');
  } else if (metadataServer.includes('soulshard.fun')) {
    logError('Metadata server 仍使用旧域名');
  } else {
    logWarning('无法确定 metadata server 域名配置');
  }
} catch (error) {
  logError(`检查域名配置时出错: ${error.message}`);
}

// 5. 检查合约配置
console.log('\n📋 检查合约配置:');

try {
  const contractsFile = fs.readFileSync('src/config/contracts.ts', 'utf8');
  if (contractsFile.includes('getContract') && contractsFile.includes('import.meta.env')) {
    logSuccess('合约配置使用环境变量');
  } else {
    logWarning('合约配置可能存在问题');
  }
} catch (error) {
  logError(`检查合约配置时出错: ${error.message}`);
}

// 总结
console.log('\n📊 验证结果总结:');
console.log(`✅ 通过: ${checks.passed}`);
console.log(`❌ 失败: ${checks.failed}`);
console.log(`⚠️  警告: ${checks.warnings}`);

if (checks.failed === 0 && checks.warnings <= 2) {
  console.log('\n🎉 修复验证完成！应用程序应该可以正常启动了。');
  console.log('\n📝 下一步操作:');
  console.log('1. 运行 npm run dev 启动开发服务器');
  console.log('2. 在浏览器中访问 http://localhost:5173');
  console.log('3. 连接钱包到 BSC 主网');
  console.log('4. 导航到管理后台页面测试功能');
  
  if (checks.warnings > 0) {
    console.log('\n⚠️  注意事项:');
    console.log('- 某些环境变量可能仍使用占位符');
    console.log('- 请确保所有合约地址都是正确的');
    console.log('- 验证管理员账户具有正确权限');
  }
} else {
  console.log(`\n🚨 发现 ${checks.failed} 个问题和 ${checks.warnings} 个警告需要解决。`);
  console.log('\n📝 建议操作:');
  if (checks.failed > 0) {
    console.log('1. 解决上述失败的检查项');
    console.log('2. 重新运行此验证脚本');
  }
  if (checks.warnings > 2) {
    console.log('3. 检查并配置所有环境变量');
    console.log('4. 验证合约地址的正确性');
  }
}

console.log('\n💡 如果仍有问题，请查看 admin_bug_diagnosis_report.md 获取详细信息。');