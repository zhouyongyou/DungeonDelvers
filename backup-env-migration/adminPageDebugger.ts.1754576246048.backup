// src/utils/adminPageDebugger.ts - 管理頁面診斷工具

import { logger } from './logger';
import { getContract } from '../config/contracts';
import { bsc } from 'wagmi/chains';

export class AdminPageDebugger {
  // 診斷合約配置
  static diagnoseContracts(chainId: number) {
    logger.info('=== 開始診斷管理頁面合約配置 ===');
    
    // 1. 檢查鏈 ID
    logger.info(`當前鏈 ID: ${chainId}`);
    logger.info(`預期鏈 ID (BSC): ${bsc.id}`);
    
    if (chainId !== bsc.id) {
      logger.error('鏈 ID 不匹配！請切換到 BSC 主網');
      return false;
    }
    
    // 2. 檢查合約配置
    const contractNames = [
      'dungeonCore', 'oracle', 'playerVault', 'dungeonStorage',
      'hero', 'relic', 'party', 'dungeonMaster', 'altarOfAscension',
      'playerProfile', 'soulShard', 'vipStaking'
    ] as const;
    
    const missingContracts: string[] = [];
    const invalidAddresses: string[] = [];
    
    contractNames.forEach(name => {
      const contract = getContractWithABI(chainId, name);
      
      if (!contract) {
        logger.error(`合約 ${name} 未找到！`);
        missingContracts.push(name);
        return;
      }
      
      if (!contract.address) {
        logger.error(`合約 ${name} 地址為空！`);
        invalidAddresses.push(name);
        return;
      }
      
      if (contract.address === '0x0000000000000000000000000000000000000000') {
        logger.error(`合約 ${name} 地址為零地址！`);
        invalidAddresses.push(name);
        return;
      }
      
      if (!contract.abi || contract.abi.length === 0) {
        logger.error(`合約 ${name} ABI 為空！`);
        return;
      }
      
      logger.info(`✓ 合約 ${name}: ${contract.address} (ABI 函數數: ${contract.abi.length})`);
    });
    
    // 3. 總結診斷結果
    if (missingContracts.length > 0) {
      logger.error('缺失的合約:', missingContracts);
    }
    
    if (invalidAddresses.length > 0) {
      logger.error('無效地址的合約:', invalidAddresses);
    }
    
    return missingContracts.length === 0 && invalidAddresses.length === 0;
  }
  
  // 診斷參數讀取配置
  static diagnoseParameterConfig(chainId: number) {
    logger.info('=== 診斷參數讀取配置 ===');
    
    const parameterFunctions = [
      { contract: 'hero', functions: ['mintPriceUSD', 'platformFee'] },
      { contract: 'relic', functions: ['mintPriceUSD', 'platformFee'] },
      { contract: 'party', functions: ['platformFee'] },
      { contract: 'dungeonMaster', functions: ['provisionPriceUSD', 'explorationFee', 'restCostPowerDivisor', 'globalRewardMultiplier'] },
      { contract: 'playerVault', functions: ['commissionRate', 'largeWithdrawThresholdUSD', 'smallWithdrawThresholdUSD', 'standardInitialRate', 'largeWithdrawInitialRate', 'decreaseRatePerPeriod', 'periodDuration'] },
      { contract: 'vipStaking', functions: ['unstakeCooldown'] },
      { contract: 'oracle', functions: ['twapPeriod'] },
    ];
    
    const issues: string[] = [];
    
    parameterFunctions.forEach(({ contract: contractName, functions }) => {
      const contract = getContractWithABI(chainId, contractName as any);
      
      if (!contract || !contract.abi) {
        issues.push(`合約 ${contractName} 無法加載`);
        return;
      }
      
      functions.forEach(fnName => {
        const hasFunction = contract.abi.some((item: any) => 
          item.type === 'function' && item.name === fnName
        );
        
        if (!hasFunction) {
          logger.warn(`合約 ${contractName} 缺少函數: ${fnName}`);
          issues.push(`${contractName}.${fnName}`);
        } else {
          logger.info(`✓ ${contractName}.${fnName}`);
        }
      });
    });
    
    if (issues.length > 0) {
      logger.error('缺少的函數:', issues);
    }
    
    return issues.length === 0;
  }
  
  // 診斷讀取請求
  static diagnoseReadRequests(contracts: any[]) {
    logger.info('=== 診斷讀取請求配置 ===');
    logger.info(`總請求數: ${contracts.length}`);
    
    if (!Array.isArray(contracts)) {
      logger.error('contracts 不是數組！', contracts);
      return false;
    }
    
    const validRequests: any[] = [];
    const invalidRequests: any[] = [];
    
    contracts.forEach((contract, index) => {
      if (!contract) {
        logger.error(`請求 ${index} 為 null/undefined`);
        invalidRequests.push({ index, reason: 'null/undefined' });
        return;
      }
      
      if (!contract.address) {
        logger.error(`請求 ${index} 缺少地址`);
        invalidRequests.push({ index, reason: '缺少地址', contract });
        return;
      }
      
      if (!contract.abi) {
        logger.error(`請求 ${index} 缺少 ABI`);
        invalidRequests.push({ index, reason: '缺少 ABI', contract });
        return;
      }
      
      if (!contract.functionName) {
        logger.error(`請求 ${index} 缺少函數名`);
        invalidRequests.push({ index, reason: '缺少函數名', contract });
        return;
      }
      
      validRequests.push(contract);
      logger.info(`✓ 請求 ${index}: ${contract.address}.${contract.functionName}()`);
    });
    
    logger.info(`有效請求: ${validRequests.length}/${contracts.length}`);
    
    if (invalidRequests.length > 0) {
      logger.error('無效請求詳情:', invalidRequests);
    }
    
    return invalidRequests.length === 0;
  }
  
  // 診斷權限問題
  static async diagnosePermissions(address: `0x${string}` | undefined, ownerAddress: `0x${string}` | undefined) {
    logger.info('=== 診斷權限 ===');
    
    if (!address) {
      logger.error('用戶未連接錢包');
      return false;
    }
    
    logger.info(`當前用戶地址: ${address}`);
    logger.info(`合約擁有者地址: ${ownerAddress || '未讀取到'}`);
    
    const DEVELOPER_ADDRESS = import.meta.env.VITE_DEVELOPER_ADDRESS || '0x10925A7138649C7E1794CE646182eeb5BF8ba647';
    logger.info(`開發者地址: ${DEVELOPER_ADDRESS}`);
    
    const isDeveloper = address.toLowerCase() === DEVELOPER_ADDRESS.toLowerCase();
    const isOwner = ownerAddress && ownerAddress.toLowerCase() === address.toLowerCase();
    
    logger.info(`是開發者: ${isDeveloper}`);
    logger.info(`是擁有者: ${isOwner}`);
    
    if (!isDeveloper && !isOwner) {
      logger.error('當前用戶沒有管理員權限');
      return false;
    }
    
    return true;
  }
  
  // 診斷環境變量
  static diagnoseEnvironment() {
    logger.info('=== 診斷環境變量 ===');
    
    const envVars = [
      'VITE_MAINNET_DUNGEONCORE_ADDRESS',
      'VITE_MAINNET_ORACLE_ADDRESS',
      'VITE_MAINNET_PLAYERVAULT_ADDRESS',
      'VITE_MAINNET_DUNGEONSTORAGE_ADDRESS',
      'VITE_MAINNET_HERO_ADDRESS',
      'VITE_MAINNET_RELIC_ADDRESS',
      'VITE_MAINNET_PARTY_ADDRESS',
      'VITE_MAINNET_DUNGEONMASTER_ADDRESS',
      'VITE_MAINNET_ALTAROFASCENSION_ADDRESS',
      'VITE_MAINNET_PLAYERPROFILE_ADDRESS',
      'VITE_MAINNET_SOULSHARDTOKEN_ADDRESS',
      'VITE_MAINNET_VIPSTAKING_ADDRESS',
      'VITE_DEVELOPER_ADDRESS'
    ];
    
    const missingVars: string[] = [];
    
    envVars.forEach(varName => {
      const value = import.meta.env[varName];
      if (!value) {
        logger.warn(`環境變量 ${varName} 未設置（使用默認值）`);
        missingVars.push(varName);
      } else {
        logger.info(`✓ ${varName}: ${value}`);
      }
    });
    
    if (missingVars.length > 0) {
      logger.warn('未設置的環境變量:', missingVars);
    }
    
    return missingVars.length === 0;
  }
  
  // 完整診斷
  static runFullDiagnostics(
    chainId: number | undefined,
    contractsToRead: any[],
    address: `0x${string}` | undefined,
    ownerAddress: `0x${string}` | undefined
  ) {
    logger.info('');
    logger.info('========================================');
    logger.info('   管理頁面完整診斷報告');
    logger.info('========================================');
    logger.info('');
    
    // 1. 環境診斷
    const envOk = this.diagnoseEnvironment();
    logger.info(`環境變量檢查: ${envOk ? '✓ 通過' : '✗ 失敗'}`);
    logger.info('');
    
    // 2. 合約配置診斷
    if (!chainId) {
      logger.error('鏈 ID 未定義！');
      return;
    }
    
    const contractsOk = this.diagnoseContracts(chainId);
    logger.info(`合約配置檢查: ${contractsOk ? '✓ 通過' : '✗ 失敗'}`);
    logger.info('');
    
    // 3. 參數配置診斷
    const paramsOk = this.diagnoseParameterConfig(chainId);
    logger.info(`參數配置檢查: ${paramsOk ? '✓ 通過' : '✗ 失敗'}`);
    logger.info('');
    
    // 4. 讀取請求診斷
    const requestsOk = this.diagnoseReadRequests(contractsToRead);
    logger.info(`讀取請求檢查: ${requestsOk ? '✓ 通過' : '✗ 失敗'}`);
    logger.info('');
    
    // 5. 權限診斷
    this.diagnosePermissions(address, ownerAddress);
    logger.info('');
    
    logger.info('========================================');
    logger.info('診斷完成');
    logger.info('========================================');
  }
}

// 導出為全局變量以便在控制台使用
if (typeof window !== 'undefined') {
  (window as any).AdminPageDebugger = AdminPageDebugger;
  logger.info('AdminPageDebugger 已載入，可在控制台使用 window.AdminPageDebugger');
}