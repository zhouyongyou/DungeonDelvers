// src/pages/AdminPage.tsx

import React, { useState, useMemo, useEffect, useCallback, useRef, memo } from 'react';
import { useAccount, useReadContracts, useWriteContract } from 'wagmi';
// 移除循環依賴的 hooks
// import { useMonitoredReadContracts } from '../hooks/useMonitoredContract';
// import { useSafeMultipleReads } from '../hooks/useSafeMultipleReads';
// import { useAdminContracts } from '../hooks/useAdminContracts';
import { useQueryClient } from '@tanstack/react-query';
import { formatEther, isAddress } from 'viem';
import { getContractWithABI, CONTRACTS_WITH_ABI as contractConfigs } from '../config/contractsWithABI';
import {  CONTRACT_ADDRESSES  } from '../config/env-contracts'; // 保留原有函數供地址查詢使用
import { useAppToast } from '../contexts/SimpleToastContext';
import { ActionButton } from '../components/ui/ActionButton';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorBoundary } from '../components/ui/ErrorBoundary';
import { bsc } from 'wagmi/chains';
import { useTransactionStore } from '../stores/useTransactionStore';
// 移除RPC監控相關的imports
// import { getOptimizedQueryConfig } from '../config/rpcOptimization';
// import { watchManager } from '../config/watchConfig';
// import { AdminPageDebugger } from '../utils/adminPageDebugger';
import { logger } from '../utils/logger';

// Import newly created admin components
import AdminSection from '../components/admin/AdminSection';
import ReadOnlyRow from '../components/admin/ReadOnlyRow';
import AddressSettingRow from '../components/admin/AddressSettingRowDark';
import SettingRow from '../components/admin/SettingRowDark';
import TaxManagement from '../components/admin/TaxManagement';
// import { ExpeditionTestComponent } from '../components/admin/ExpeditionTestComponent'; // 測試完成，暫時註釋
import DungeonManager from '../components/admin/DungeonManagerDark';
import AltarRuleManager from '../components/admin/AltarRuleManagerDark';
import FundsWithdrawal from '../components/admin/FundsWithdrawalDark';
import VipSettingsManager from '../components/admin/VipSettingsManagerDark';
import ContractHealthPanel from '../components/admin/ContractHealthPanelDark';
// import OraclePriceTest from '../components/admin/OraclePriceTestDark'; // 測試完成，暫時註釋
// import GameFlowTest from '../components/admin/GameFlowTestDark'; // 測試完成，暫時註釋
// RPC監控已移除以解決循環依賴問題
// import { ContractHealthCheck } from '../components/admin/ContractHealthCheck'; // 移除重複組件
import { PitchUrlManager } from '../components/admin/PitchUrlManager';
import RpcMonitoringPanel from '../components/admin/RpcMonitoringPanel';
import { PausableContractsManager } from '../components/admin/PausableContractsManager';
import { validateContract, getSafeContract } from '../utils/contractValidator';

type SupportedChainId = typeof bsc.id;
type Address = `0x${string}`;

// 開發者地址從環境變數讀取
const DEVELOPER_ADDRESS = import.meta.env.VITE_DEVELOPER_ADDRESS?.trim() || null;
if (!DEVELOPER_ADDRESS) {
  logger.warn('開發者地址未在環境變數中設定 (VITE_DEVELOPER_ADDRESS)');
}

const AdminPageContent: React.FC<{ chainId: SupportedChainId }> = memo(({ chainId }) => {
  const { address } = useAccount();
  const { showToast } = useAppToast();
  const { addTransaction } = useTransactionStore();
  const { writeContractAsync } = useWriteContract();
  const queryClient = useQueryClient();
  
  // 移除不必要的調試日誌
  
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [isBatchSetting, setIsBatchSetting] = useState(false);
  const [pendingTx, setPendingTx] = useState<string | null>(null);
  
  // 懶加載狀態 - 追蹤哪些區塊應該加載數據
  const [loadedSections, setLoadedSections] = useState<Record<string, boolean>>({
    contractCenter: false, // 合約串接中心默認收起
    globalReward: false,
    dungeonParams: false,
    altarRules: false,
    vipSettings: false,
    corePrice: false,
    platformFee: false,
    taxSystem: false,
    // gameParams: false, // 移除 - 只有固定值，不需要懶加載
    oracle: false,
    // contractControl: false, // 移除 - 純 UI 控制，無 RPC 讀取
    rpcMonitor: false, // RPC監控默認不展開
    contractHealth: false, // 合約健康檢查默認不展開
    oracleTest: false, // Oracle測試默認不展開
    pausableManager: false, // 暫停管理默認不展開
    gameFlowTest: false, // 遊戲流程測試默認不展開
    expeditionTest: false, // 出征測試默認不展開
    pitchManager: false // Pitch頁面管理默認不展開
  });

  // 移除 watchManager 相關代碼以解決循環依賴
  // useEffect(() => {
  //   watchManager.clearAll();
  //   return () => {};
  // }, []);

  // 將 setupConfig 移到組件外部，避免每次渲染都重新創建
  const setupConfig = useMemo(() => {
    try {
      const createSetting = (key: string, title: string, target: ContractName, setter: string, value: ContractName, getter: string) => ({ key, title, targetContractName: target, setterFunctionName: setter, valueToSetContractName: value, getterFunctionName: getter });
      
      const config = [
        createSetting('oracle', '設定價格預言機', 'dungeonCore', 'setOracle', 'oracle', 'oracleAddress'),
        createSetting('playerVault', '設定玩家金庫', 'dungeonCore', 'setPlayerVault', 'playerVault', 'playerVaultAddress'),
        createSetting('dungeonMaster', '設定地城主', 'dungeonCore', 'setDungeonMaster', 'dungeonMaster', 'dungeonMasterAddress'),
        createSetting('altar', '設定升星祭壇', 'dungeonCore', 'setAltarOfAscension', 'altarOfAscension', 'altarOfAscensionAddress'),
        createSetting('playerProfile', '設定玩家檔案', 'dungeonCore', 'setPlayerProfile', 'playerProfile', 'playerProfileAddress'),
        createSetting('vip', '設定VIP質押', 'dungeonCore', 'setVipStaking', 'vipStaking', 'vipStakingAddress'),
        createSetting('hero', '註冊英雄合約', 'dungeonCore', 'setHeroContract', 'hero', 'heroContractAddress'),
        createSetting('relic', '註冊聖物合約', 'dungeonCore', 'setRelicContract', 'relic', 'relicContractAddress'),
        createSetting('party', '註冊隊伍合約', 'dungeonCore', 'setPartyContract', 'party', 'partyContractAddress'),
        createSetting('dungeonCoreForHero', '在 Hero 中設定總機', 'hero', 'setDungeonCore', 'dungeonCore', 'dungeonCore'),
        createSetting('dungeonCoreForRelic', '在 Relic 中設定總機', 'relic', 'setDungeonCore', 'dungeonCore', 'dungeonCore'),
        createSetting('dungeonCoreForParty', '在 Party 中設定總機', 'party', 'setDungeonCore', 'dungeonCore', 'dungeonCoreContract'),
        createSetting('dungeonCoreForDM', '在 DungeonMaster 中設定總機', 'dungeonMaster', 'setDungeonCore', 'dungeonCore', 'dungeonCore'),
        // 暫時移除 dungeonStorage 相關設定，因為合約配置中沒有這個合約
        // createSetting('storageForDM', '在 DungeonMaster 中設定儲存', 'dungeonMaster', 'setDungeonStorage', 'dungeonStorage', 'dungeonStorage'),
        // createSetting('logicForStorage', '在 DungeonStorage 中授權邏輯', 'dungeonStorage', 'setLogicContract', 'dungeonMaster', 'logicContract'),
        createSetting('dungeonCoreForProfile', '在 PlayerProfile 中設定總機', 'playerProfile', 'setDungeonCore', 'dungeonCore', 'dungeonCore'),
        createSetting('dungeonCoreForVip', '在 VIPStaking 中設定總機', 'vipStaking', 'setDungeonCore', 'dungeonCore', 'dungeonCore'),
        createSetting('dungeonCoreForAltar', '在 Altar 中設定總機', 'altarOfAscension', 'setDungeonCore', 'dungeonCore', 'dungeonCore'),
        createSetting('soulShardForDM', '在 DungeonMaster 中設定 SoulShard', 'dungeonMaster', 'setSoulShardToken', 'soulShard', 'soulShardToken'),
      ];
      
      return config;
    } catch (error) {
      logger.error('setupConfig 創建失敗:', error);
      return [];
    }
  }, []); // 確保空依賴項陣列，只計算一次

  const contractsToRead = useMemo(() => {
    try {
      if (!chainId || !setupConfig || !Array.isArray(setupConfig) || setupConfig.length === 0) {
        return [];
      }
      
      const coreContract = getContractWithABI(chainId, 'dungeonCore');
      if (!coreContract || !coreContract.address) {
        logger.warn('DungeonCore 合約未找到或地址無效', { chainId, coreContract });
        return [];
      }
      
      const configs = setupConfig.map(c => {
        if (!c || !c.targetContractName || !c.getterFunctionName) {
          logger.warn('無效的配置項:', c);
          return null;
        }
        
        const contract = getContractWithABI(chainId, c.targetContractName);
        if (!contract || !contract.address) {
          logger.warn(`合約未找到: ${c.targetContractName}`, { chainId, contract });
          return null;
        }
        
        // 特殊處理：Party 合約的 dungeonCoreContract 可能會 revert
        if (c.targetContractName === 'party' && c.getterFunctionName === 'dungeonCoreContract') {
          logger.info('跳過 Party.dungeonCoreContract 讀取（已知會 revert）');
          return { ...contract, functionName: c.getterFunctionName, skipRead: true };
        }
        
        return { ...contract, functionName: c.getterFunctionName };
      });
      
      configs.unshift({ ...coreContract, functionName: 'owner' });
      
      const filteredConfigs = configs.filter((c): c is NonNullable<typeof c> => 
        c !== null && !!c.address && !(c as any).skipRead
      );
      
      return filteredConfigs;
    } catch (error) {
      logger.error('contractsToRead 計算失敗:', error);
      return [];
    }
  }, [chainId, setupConfig]);


  // 安全的合約讀取配置
  const safeContractsToRead = useMemo(() => {
    if (!contractsToRead || !Array.isArray(contractsToRead)) return [];
    
    return contractsToRead.map(contract => {
      if (!contract || !contract.address || !contract.functionName || !contract.abi) {
        logger.warn('發現無效合約配置:', contract);
        return null;
      }
      
      return {
        address: contract.address,
        abi: contract.abi,
        functionName: contract.functionName,
        args: contract.args || []
      };
    }).filter(Boolean);
  }, [contractsToRead]);

  // 更安全的合約讀取 - 添加額外的防護
  const contractsReadEnabled = useMemo(() => {
    return !!chainId && 
           Array.isArray(safeContractsToRead) && 
           safeContractsToRead.length > 0 && 
           loadedSections.contractCenter &&
           safeContractsToRead.every(contract => 
             contract && 
             contract.address && 
             contract.abi && 
             contract.functionName
           );
  }, [chainId, safeContractsToRead, loadedSections.contractCenter]);

  // 移除不必要的調試日誌

  // 全局錯誤處理器
  useEffect(() => {
    const originalError = console.error;
    console.error = (...args) => {
      const errorMessage = args[0];
      if (typeof errorMessage === 'string' && errorMessage.includes('Cannot read properties of undefined')) {
        logger.error('捕獲到 undefined.length 錯誤:', {
          message: errorMessage,
          stack: args[1]?.stack,
          context: 'AdminPage useReadContracts'
        });
        // 不阻止正常的錯誤輸出
      }
      originalError.apply(console, args);
    };

    return () => {
      console.error = originalError;
    };
  }, []);

  // 移除不必要的狀態，直接使用 hook 返回的值
  // const [contractsReadResult, setContractsReadResult] = useState<any>(undefined);
  // const [isLoadingContracts, setIsLoadingContracts] = useState(false);
  // const [contractsReadError, setContractsReadError] = useState<any>(null);
  
  // 直接使用 wagmi 的 useReadContracts，移除循環依賴
  const { data: contractsReadResult, isLoading: isLoadingContracts, error: contractsReadError } = useReadContracts({
    contracts: safeContractsToRead,
    query: {
      enabled: contractsReadEnabled,
      staleTime: 1000 * 60 * 30,
      gcTime: 1000 * 60 * 60,
      refetchOnWindowFocus: false,
      refetchInterval: false,
      retry: 1,
      retryDelay: 3000,
      structuralSharing: false,
      refetchOnReconnect: false
    }
  });
  
  // 移除會導致無限循環的 useEffect
  // 直接使用 contractsReadResult、isLoadingContracts 和 contractsReadError
  // 不需要同步到本地狀態

  // 移除手動觸發邏輯，使用自動查詢

  const currentAddressMap: Record<string, Address | undefined> = useMemo(() => {
    try {
      if (!contractsReadResult || !Array.isArray(contractsReadResult) || contractsReadResult.length === 0 || 
          !setupConfig || !Array.isArray(setupConfig) || setupConfig.length === 0) {
        return {};
      }
      
      const owner = contractsReadResult[0]?.result as Address | undefined;
      const settings = setupConfig.reduce((acc, config, index) => {
        // 特殊處理 Party.dungeonCoreContract
        if (config && config.key === 'dungeonCoreForParty') {
          // 不從 contractsReadResult 讀取，因為我們跳過了這個讀取
          acc[config.key] = undefined; // 或者設置為 "未設定" 的佔位符
        } else if (config && config.key && contractsReadResult[index + 1] && contractsReadResult[index + 1].result) {
          acc[config.key] = contractsReadResult[index + 1].result as Address | undefined;
        }
        return acc;
      }, {} as Record<string, Address | undefined>);
      
      return { owner, ...settings };
    } catch (error) {
      logger.error('currentAddressMap 計算失敗:', error);
      return {};
    }
  }, [contractsReadResult, setupConfig]);
  
  // 移除開發環境的自動診斷以減少重新渲染
  
  // 調試信息將在 parameterContracts 和 vaultContracts 定義之後添加
  
  const envAddressMap: Record<string, { name: ContractName, address?: Address }> = useMemo(() => {
    if (!setupConfig || !Array.isArray(setupConfig)) return {};
    
    // 從配置文件獲取地址
    const getConfigAddr = (name: ContractName) => {
      // 修復：使用正確的函數簽名和名稱映射
      let addressKey: keyof typeof CONTRACT_ADDRESSES;
      
      // 映射合約名稱到配置文件中的常數名稱
      switch (name) {
        case 'oracle':
          addressKey = 'ORACLE';
          break;
        case 'playerVault':
          addressKey = 'PLAYERVAULT';
          break;
        case 'dungeonMaster':
          addressKey = 'DUNGEONMASTER';
          break;
        case 'altarOfAscension':
          addressKey = 'ALTAROFASCENSION';
          break;
        case 'playerProfile':
          addressKey = 'PLAYERPROFILE';
          break;
        case 'vipStaking':
          addressKey = 'VIPSTAKING';
          break;
        case 'hero':
          addressKey = 'HERO';
          break;
        case 'relic':
          addressKey = 'RELIC';
          break;
        case 'party':
          addressKey = 'PARTY';
          break;
        case 'dungeonCore':
          addressKey = 'DUNGEONCORE';
          break;
        case 'soulShard':
          addressKey = 'SOULSHARD';
          break;
        default:
          logger.warn(`未知的合約名稱: ${name}`);
          return { name, address: undefined };
      }
      
      const contractAddress = CONTRACT_ADDRESSES[addressKey as keyof typeof CONTRACT_ADDRESSES];
      
      return { 
        name, 
        address: contractAddress as Address | undefined
      };
    };
    
    return setupConfig.reduce((acc, config) => {
      if (config && config.key && config.valueToSetContractName) {
        acc[config.key] = getConfigAddr(config.valueToSetContractName);
      }
      return acc;
    }, {} as Record<string, { name: ContractName, address?: Address }>);
  }, [chainId, setupConfig]);
  
  type ParameterConfigItem = {
    key: string;
    label: string;
    contract: NonNullable<ReturnType<typeof getContractWithABI>>;
    getter: string;
    setter: string;
    unit?: 'USD' | 'BNB' | '‱' | '無';
    placeholders?: string[];
  };
  
  const parameterConfig = useMemo((): ParameterConfigItem[] => {
    try {
      if (!chainId) {
        logger.debug('parameterConfig: chainId 未設定');
        return [];
      }
      
      const contracts = {
        hero: getContractWithABI(chainId, 'HERO'),
        relic: getContractWithABI(chainId, 'RELIC'),
        party: getContractWithABI(chainId, 'PARTY'),
        dungeonMaster: getContractWithABI(chainId, 'DUNGEONMASTER'),
        playerVault: getContractWithABI(chainId, 'PLAYERVAULT'),
        vipStaking: getContractWithABI(chainId, 'VIPSTAKING'),
        oracle: getContractWithABI(chainId, 'ORACLE'),
        altarOfAscension: getContractWithABI(chainId, 'ALTAROFASCENSION'),
      };
      
      // 驗證所有合約
      const validatedContracts: Record<string, NonNullable<ReturnType<typeof getContractWithABI>>> = {};
      for (const [name, contract] of Object.entries(contracts)) {
        const validation = validateContract(name, contract);
        if (validation.isValid && contract) {
          validatedContracts[name] = contract;
        } else {
          logger.warn(`合約 ${name} 驗證失敗:`, validation.errors);
        }
      }
    
    const config = [
      // 鑄造價格設定
      { key: 'heroMintPrice', label: "英雄鑄造價", contract: validatedContracts.hero, getter: 'mintPriceUSD', setter: 'setMintPriceUSD', unit: 'USD', placeholders: ['新價格 (USD)'], isWei: true },
      { key: 'relicMintPrice', label: "聖物鑄造價", contract: validatedContracts.relic, getter: 'mintPriceUSD', setter: 'setMintPriceUSD', unit: 'USD', placeholders: ['新價格 (USD)'], isWei: true },
      // { key: 'provisionPrice', label: "儲備購買價", contract: validatedContracts.dungeonMaster, getter: 'provisionPriceUSD', setter: 'setProvisionPriceUSD', unit: 'USD', placeholders: ['新價格 (USD)'] }, // 暫時注釋
      
      // 平台費用設定
      { key: 'heroFee', label: "英雄平台費", contract: validatedContracts.hero, getter: 'platformFee', setter: 'setPlatformFee', unit: 'BNB', placeholders: ['新費用 (BNB)'] },
      { key: 'relicFee', label: "聖物平台費", contract: validatedContracts.relic, getter: 'platformFee', setter: 'setPlatformFee', unit: 'BNB', placeholders: ['新費用 (BNB)'] },
      { key: 'partyFee', label: "隊伍平台費", contract: validatedContracts.party, getter: 'platformFee', setter: 'setPlatformFee', unit: 'BNB', placeholders: ['新費用 (BNB)'] },
      { key: 'explorationFee', label: "遠征探索費", contract: validatedContracts.dungeonMaster, getter: 'explorationFee', setter: 'setExplorationFee', unit: 'BNB', placeholders: ['新費用 (BNB)'] },
      
      // 遊戲機制參數
      // { key: 'restDivisor', label: "休息成本係數", contract: validatedContracts.dungeonMaster, getter: 'restCostPowerDivisor', setter: 'setRestCostPowerDivisor', unit: '無', placeholders: ['新係數 (戰力/USD)'] }, // 暫時沒這功能
      // 冷卻時間是固定的 24 小時，移除設置功能
      // { key: 'dungeonCooldown', label: "地下城挑戰冷卻 (秒)", contract: validatedContracts.dungeonMaster, getter: 'cooldownPeriod', setter: 'setCooldownPeriod', unit: '無', placeholders: ['新冷卻時間 (秒)'] },
      // { key: 'vipCooldown', label: "VIP 取消質押冷卻 (秒)", contract: validatedContracts.vipStaking, getter: 'unstakeCooldown', setter: 'setUnstakeCooldown', unit: '無', placeholders: ['新冷卻時間 (秒)'] }, // 暫時註釋 - 與 VipSettingsManager 重複
      // { key: 'globalRewardMultiplier', label: "全域獎勵倍率", contract: validatedContracts.dungeonMaster, getter: 'globalRewardMultiplier', setter: 'setGlobalRewardMultiplier', unit: '‱', placeholders: ['新倍率 (1000=100%)'] }, // 暫時註釋 - 在 GlobalRewardSettings 中處理
      
      // 稅務與提現系統
      { key: 'commissionRate', label: "邀請佣金率", contract: validatedContracts.playerVault, getter: 'commissionRate', setter: 'setCommissionRate', unit: '‱', placeholders: ['新佣金率 (萬分位)'] },
      
      // Oracle 設定
      // { key: 'twapPeriod', label: "Oracle TWAP 週期", contract: validatedContracts.oracle, getter: 'twapPeriod', setter: 'setTwapPeriod', unit: '無', placeholders: ['新週期 (秒)'] }, // 暫時註釋 - 固定值
    ];
    
      const filteredConfig = config.filter((c) => {
        return c && c.contract && c.contract.address && c.contract.address !== '0x0000000000000000000000000000000000000000';
      }) as ParameterConfigItem[];
      
      logger.debug('parameterConfig 計算完成', { 
        totalConfig: config.length,
        filteredConfig: filteredConfig.length
      });
      
      return filteredConfig;
    } catch (error) {
      logger.error('parameterConfig 計算失敗:', error);
      return [];
    }
  }, [chainId]);

  const parameterContracts = useMemo(() => {
    try {
      if (!parameterConfig || !Array.isArray(parameterConfig) || parameterConfig.length === 0) {
        logger.warn('參數配置為空或無效', { 
          parameterConfig: parameterConfig ? 'exists' : 'undefined',
          isArray: Array.isArray(parameterConfig),
          length: parameterConfig?.length
        });
        return [];
      }
      
      const contracts = parameterConfig
        .filter(p => {
          const isValid = p && p.contract && p.contract.address && p.getter;
          if (!isValid) {
            logger.warn(`參數配置無效: ${p?.key || 'unknown'}`, p);
          }
          return isValid;
        })
        .map(p => ({ ...p.contract, functionName: p.getter }));
      
      // 調試：輸出 dungeonCooldown 的配置
      const cooldownConfig = parameterConfig.find(p => p.key === 'dungeonCooldown');
      if (cooldownConfig) {
        console.log('🔍 dungeonCooldown 配置:', {
          key: cooldownConfig.key,
          contract: cooldownConfig.contract?.address,
          getter: cooldownConfig.getter,
          index: parameterConfig.findIndex(p => p.key === 'dungeonCooldown'),
          totalConfigs: parameterConfig.length
        });
      }
      
      return contracts;
    } catch (error) {
      logger.error('parameterContracts 計算失敗:', error);
      return [];
    }
  }, [parameterConfig]);

  // 直接使用 wagmi 的 useReadContracts，移除循環依賴
  const { data: params, isLoading: isLoadingParams, error: paramsError, refetch: refetchParams } = useReadContracts({
    contracts: parameterContracts,
    query: { 
      enabled: parameterContracts.length > 0,
      staleTime: 1000 * 60 * 5, // 5分鐘緩存
      refetchOnWindowFocus: false,
    }
  });

  // 調試：檢查 params 數據
  useEffect(() => {
    if (params && params.length > 0) {
      const cooldownIndex = parameterConfig.findIndex(p => p.key === 'dungeonCooldown');
      console.log('🔍 參數讀取結果:', {
        totalParams: params.length,
        cooldownIndex,
        cooldownData: params[cooldownIndex],
        cooldownDataDetails: {
          status: params[cooldownIndex]?.status,
          result: params[cooldownIndex]?.result,
          error: params[cooldownIndex]?.error,
          resultType: typeof params[cooldownIndex]?.result
        },
        allParams: params.map((p, i) => ({
          index: i,
          key: parameterConfig[i]?.key,
          result: p.result,
          status: p.status,
          error: p.error
        }))
      });
    }
  }, [params, parameterConfig]);

  // 讀取 PlayerVault 的稅務參數
  const playerVaultContract = getContractWithABI(chainId, 'playerVault');
  const vaultContracts = useMemo(() => {
    try {
      if (!playerVaultContract || !playerVaultContract.address) {
        logger.warn('PlayerVault 合約未配置或地址無效', { 
          playerVaultContract: playerVaultContract ? 'exists' : 'undefined',
          address: playerVaultContract?.address
        });
        return [];
      }
      
      const vaultFunctions = [
        'largeWithdrawThresholdUSD',
        'smallWithdrawThresholdUSD', 
        'standardInitialRate',
        'largeWithdrawInitialRate',
        'decreaseRatePerPeriod',
        'periodDuration'
      ];
      
      const contracts = vaultFunctions.map(functionName => ({
        ...playerVaultContract,
        functionName: functionName as const
      }));
      
      // 移除日誌以避免重複輸出
      return contracts;
    } catch (error) {
      logger.error('vaultContracts 計算失敗:', error);
      return [];
    }
  }, [playerVaultContract]);

  // 直接使用 wagmi 的 useReadContracts，移除循環依賴
  const { data: vaultParams, isLoading: isLoadingVaultParams, error: vaultParamsError, refetch: refetchVaultParams } = useReadContracts({
    contracts: vaultContracts,
    query: { enabled: loadedSections.taxSystem }
  });

  // 保留必要的調試信息，但使用 useCallback 穩定引用
  const logParameterContracts = useCallback(() => {
    if (import.meta.env.DEV && parameterContracts.length > 0) {
      logger.debug('📊 參數合約配置:', {
        count: parameterContracts.length,
        contracts: parameterContracts.map(c => ({
          address: c.address,
          functionName: c.functionName,
          hasAbi: !!c.abi
        }))
      });
    }
  }, [parameterContracts.length]);
  
  const logVaultContracts = useCallback(() => {
    if (import.meta.env.DEV && vaultContracts.length > 0) {
      logger.debug('=== Vault 合約配置 ===', {
        count: vaultContracts.length,
        contracts: vaultContracts.map(c => ({
          address: c.address,
          functionName: c.functionName
        }))
      });
    }
  }, [vaultContracts.length]);
  
  // 只在開發環境且數量變化時記錄
  useEffect(() => {
    logParameterContracts();
  }, [logParameterContracts]);
  
  useEffect(() => {
    logVaultContracts();
  }, [logVaultContracts]);

  // 使用 useRef 來跟踪是否已執行健康檢查
  const healthCheckExecuted = useRef(false);
  
  // 合約健康檢查 - 在組件首次加載時檢查所有合約
  useEffect(() => {
    const performHealthCheck = async () => {
      if (!chainId || healthCheckExecuted.current) return;
      healthCheckExecuted.current = true;
      
      logger.info('🏥 開始合約健康檢查...');
      
      // 檢查所有合約是否有效配置
      const contractNames = ['dungeonCore', 'oracle', 'playerVault', 'hero', 'relic', 'party', 'dungeonMaster', 'altarOfAscension', 'playerProfile', 'soulShard', 'vipStaking'] as const;
      
      const healthStatus = contractNames.map(name => {
        const contract = getContractWithABI(chainId, name);
        const isValid = contract && contract.address && contract.address !== '0x0000000000000000000000000000000000000000';
        
        if (!isValid) {
          logger.warn(`❌ 合約 ${name} 配置無效:`, {
            hasContract: !!contract,
            address: contract?.address,
            hasAbi: !!contract?.abi
          });
        }
        
        return {
          name,
          isValid,
          address: contract?.address,
          hasAbi: !!contract?.abi
        };
      });
      
      const validContracts = healthStatus.filter(c => c.isValid);
      const invalidContracts = healthStatus.filter(c => !c.isValid);
      
      logger.info('🏥 合約健康檢查完成:', {
        total: healthStatus.length,
        valid: validContracts.length,
        invalid: invalidContracts.length,
        invalidContracts: invalidContracts.map(c => c.name),
        chainId
      });
      
      // 如果有無效合約，在 UI 中顯示警告
      if (invalidContracts.length > 0) {
        showToast(`發現 ${invalidContracts.length} 個無效合約配置: ${invalidContracts.map(c => c.name).join(', ')}`, 'error');
      }
    };
    
    performHealthCheck();
  }, [chainId]); // 移除 showToast 依賴以避免重複執行 // 只在 chainId 變化時執行

  const handleSet = async (key: string, targetContract: NonNullable<ReturnType<typeof getContractWithABI>>, functionName: string) => {
    const newAddress = inputs[key];
    if (!isAddress(newAddress)) { showToast('請輸入有效的地址', 'error'); return; }
    setPendingTx(key);
    try {
      const hash = await writeContractAsync({ address: targetContract.address, abi: targetContract.abi, functionName: functionName as any, args: [newAddress] });
      addTransaction({ hash, description: `管理員設定: ${key}` });
      showToast(`${key} 設定交易已送出`, 'success');
      
      // 🔄 立即失效相關快取
      queryClient.invalidateQueries({ queryKey: ['admin-contracts'] });
      queryClient.invalidateQueries({ queryKey: ['admin-settings'] });
      queryClient.invalidateQueries({ queryKey: ['contract-addresses'] });
    } catch (e: unknown) {
      const error = e as { message?: string; shortMessage?: string };
      if (!error.message?.includes('User rejected')) { showToast(error.shortMessage || `設定 ${key} 失敗`, 'error'); }
    } finally {
      setPendingTx(null);
    }
  };

  const handleBatchSet = async () => {
    setIsBatchSetting(true);
    showToast('開始批次設定，請逐一在錢包中確認交易...', 'info');
    for (const config of setupConfig) {
      const newAddress = inputs[config.key];
      const currentAddress = currentAddressMap[config.key];
      if (newAddress && isAddress(newAddress) && currentAddress && newAddress.toLowerCase() !== currentAddress.toLowerCase()) {
        showToast(`正在設定 ${config.title}...`, 'info');
        const contract = getContractWithABI(chainId, config.targetContractName);
        if(contract) {
          await handleSet(config.key, contract, config.setterFunctionName);
        }
      }
    }
    setIsBatchSetting(false);
    showToast('批次設定流程已完成！', 'success');
    
    // 🔄 批次設定完成後立即失效所有管理員相關快取
    queryClient.invalidateQueries({ queryKey: ['admin-contracts'] });
    queryClient.invalidateQueries({ queryKey: ['admin-settings'] });
    queryClient.invalidateQueries({ queryKey: ['admin-parameters'] });
    queryClient.invalidateQueries({ queryKey: ['contract-addresses'] });
  };
  
  const handleFillFromEnv = () => {
    const definedEnvAddresses = Object.entries(envAddressMap)
      .filter(([, value]) => !!value.address)
      .reduce((acc, [key, value]) => { acc[key] = value.address!; return acc; }, {} as Record<string, string>);
    setInputs(prev => ({ ...prev, ...definedEnvAddresses }));
    showToast('已從 .env 設定檔載入所有地址！', 'info');
  };
  
  const ownerAddress = currentAddressMap.owner;
  
  // 錯誤處理 - 使用 useCallback 和 useRef 避免重複觸發
  const [hasShownError, setHasShownError] = useState<{ settings?: boolean; params?: boolean; vault?: boolean }>({});
  
  // 簡化錯誤處理，避免循環依賴
  useEffect(() => {
    if (contractsReadError && !hasShownError.settings) {
      const errorMessage = contractsReadError.message || '未知錯誤';
      logger.error('讀取管理員設定失敗:', { errorMessage, chainId });
      showToast(`讀取合約設定失敗: ${errorMessage}`, 'error');
      setHasShownError(prev => ({ ...prev, settings: true }));
    } else if (!contractsReadError && hasShownError.settings) {
      setHasShownError(prev => ({ ...prev, settings: false }));
    }
  }, [contractsReadError, hasShownError.settings, showToast, chainId]);
  
  useEffect(() => {
    if (paramsError && !hasShownError.params) {
      showToast(`讀取參數設定失敗: ${paramsError.message || '未知錯誤'}`, 'error');
      logger.debug('讀取參數設定失敗:', paramsError);
      setHasShownError(prev => ({ ...prev, params: true }));
    } else if (!paramsError && hasShownError.params) {
      setHasShownError(prev => ({ ...prev, params: false }));
    }
  }, [paramsError, hasShownError.params, showToast]);
  
  useEffect(() => {
    if (vaultParamsError && !hasShownError.vault) {
      showToast(`讀取稅務參數失敗: ${vaultParamsError.message || '未知錯誤'}`, 'error');
      logger.debug('讀取稅務參數失敗:', vaultParamsError);
      setHasShownError(prev => ({ ...prev, vault: true }));
    } else if (!vaultParamsError && hasShownError.vault) {
      setHasShownError(prev => ({ ...prev, vault: false }));
    }
  }, [vaultParamsError, hasShownError.vault, showToast]);

  // 添加詳細的合約讀取診斷
  useEffect(() => {
    if (contractsReadResult || contractsReadError) {
      logger.info('🔍 合約讀取診斷結果:', {
        hasResult: !!contractsReadResult,
        resultLength: contractsReadResult?.length,
        hasError: !!contractsReadError,
        errorMessage: contractsReadError?.message,
        loadingState: isLoadingContracts,
        contractsToReadCount: contractsToRead?.length,
        safeContractsCount: safeContractsToRead?.length,
        contractsReadEnabled,
        setupConfigLength: setupConfig?.length,
        chainId
      });
      
      // 詳細記錄每個合約的讀取狀態
      if (contractsReadResult && Array.isArray(contractsReadResult)) {
        contractsReadResult.forEach((result, index) => {
          const configItem = setupConfig?.[index - 1]; // 第0個是owner，所以減1
          if (result?.status === 'failure' || result?.error) {
            logger.error(`合約讀取失敗 [${index}]:`, {
              configKey: index === 0 ? 'owner' : configItem?.key,
              targetContract: index === 0 ? 'dungeonCore' : configItem?.targetContractName,
              functionName: index === 0 ? 'owner' : configItem?.getterFunctionName,
              error: result.error,
              status: result.status,
              result: result.result
            });
          }
        });
      }
    }
  }, [contractsReadResult, contractsReadError, isLoadingContracts, contractsToRead?.length, safeContractsToRead?.length, contractsReadEnabled, setupConfig?.length, chainId]);

  // 只在第一次加載合約串接中心時顯示全屏加載
  if (loadedSections.contractCenter && isLoadingContracts && !ownerAddress) {
    return <div className="flex justify-center items-center h-64"><LoadingSpinner /></div>;
  }

  // 優化權限檢查邏輯 - 允許開發者地址和合約擁有者訪問
  const isDeveloper = DEVELOPER_ADDRESS && address?.toLowerCase() === DEVELOPER_ADDRESS.toLowerCase();
  const isOwner = ownerAddress && ownerAddress.toLowerCase() === address?.toLowerCase();
  
  // 如果沒有權限，顯示錯誤
  if (!isDeveloper && !isOwner && ownerAddress) {
    return <EmptyState message={`權限不足，僅合約擁有者可訪問。當前擁有者: ${ownerAddress ? `${ownerAddress.substring(0, 6)}...${ownerAddress.substring(ownerAddress.length - 4)}` : '載入中...'}`} />;
  }

  return (
    <>
      {/* 測試組件 - 按需加載以減少 RPC 負載 */}
      <AdminSection 
        title="🔗 合約連接狀態" 
        defaultExpanded={false}
        onExpand={() => setLoadedSections(prev => ({ ...prev, contractHealth: true }))}
      >
        {loadedSections.contractHealth && (
          <ContractHealthPanel />
        )}
      </AdminSection>

      <AdminSection 
        title="⏸️ 合約暫停管理" 
        defaultExpanded={false}
        onExpand={() => setLoadedSections(prev => ({ ...prev, pausableManager: true }))}
      >
        {loadedSections.pausableManager && (
          <PausableContractsManager />
        )}
      </AdminSection>
      
      {/* 測試組件已經完成測試，暫時註釋 */}
      {/* <AdminSection 
        title="💰 Oracle 價格測試" 
        defaultExpanded={false}
        onExpand={() => setLoadedSections(prev => ({ ...prev, oracleTest: true }))}
      >
        {loadedSections.oracleTest && <OraclePriceTest />}
      </AdminSection>
      
      <AdminSection 
        title="🎮 完整遊戲流程測試" 
        defaultExpanded={false}
        onExpand={() => setLoadedSections(prev => ({ ...prev, gameFlowTest: true }))}
      >
        {loadedSections.gameFlowTest && <GameFlowTest />}
      </AdminSection>
      
      <AdminSection 
        title="🔍 出征交易測試" 
        defaultExpanded={false}
        onExpand={() => setLoadedSections(prev => ({ ...prev, expeditionTest: true }))}
      >
        {loadedSections.expeditionTest && <ExpeditionTestComponent />}
      </AdminSection> */}
      
      <AdminSection 
        title="合約串接中心"
        defaultExpanded={loadedSections.contractCenter}
        onExpand={() => setLoadedSections(prev => ({ ...prev, contractCenter: true }))}
        isLoading={isLoadingContracts && loadedSections.contractCenter}
      >
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <p className="text-gray-300 text-sm max-w-2xl">此頁面用於在合約部署後，將各個模組的地址設定到正確的位置。請依序填入所有已部署的合約地址，然後點擊「全部設定」，或逐一進行設定。</p>
          <div className="flex-shrink-0 flex flex-col md:flex-row gap-2 w-full md:w-auto">
            <ActionButton onClick={handleFillFromEnv} className="w-full md:w-auto h-12 text-base bg-gray-600">從 .env 填入</ActionButton>
            <ActionButton onClick={handleBatchSet} isLoading={isBatchSetting} className="w-full md:w-auto h-12 text-lg">全部設定</ActionButton>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4">
          <div className="space-y-4">
            <h4 className="text-xl font-semibold text-center">總機設定 (DungeonCore)</h4>
            {setupConfig && Array.isArray(setupConfig) && setupConfig.slice(0, 9).map(config => (
              <AddressSettingRow 
                key={config.key} 
                title={config.title} 
                description={`在 ${config.targetContractName} 中設定 ${config.valueToSetContractName}`} 
                readSource={`${config.targetContractName}.${config.getterFunctionName}()`} 
                currentAddress={currentAddressMap[config.key]} 
                envAddress={envAddressMap[config.key]?.address} 
                envContractName={envAddressMap[config.key]?.name} 
                isLoading={isLoadingContracts} 
                inputValue={inputs[config.key] || ''} 
                onInputChange={(val) => setInputs(prev => ({ ...prev, [config.key]: val }))} 
                onSet={() => {
                  const contract = getContractWithABI(chainId, config.targetContractName);
                  if (contract && contract.address) {
                    handleSet(config.key, contract, config.setterFunctionName);
                  } else {
                    showToast('合約地址無效', 'error');
                  }
                }} 
                isSetting={pendingTx === config.key} 
              />
            ))}
          </div>
          <div className="space-y-4">
            <h4 className="text-xl font-semibold text-center">各模組回連設定</h4>
            {setupConfig && Array.isArray(setupConfig) && setupConfig.slice(9).map(config => (
              <AddressSettingRow 
                key={config.key} 
                title={config.title} 
                description={`在 ${config.targetContractName} 中設定 ${config.valueToSetContractName}`} 
                readSource={`${config.targetContractName}.${config.getterFunctionName}()`} 
                currentAddress={currentAddressMap[config.key]} 
                envAddress={envAddressMap[config.key]?.address} 
                envContractName={envAddressMap[config.key]?.name} 
                isLoading={isLoadingContracts} 
                inputValue={inputs[config.key] || ''} 
                onInputChange={(val) => setInputs(prev => ({ ...prev, [config.key]: val }))} 
                onSet={() => {
                  const contract = getContractWithABI(chainId, config.targetContractName);
                  if (contract && contract.address) {
                    handleSet(config.key, contract, config.setterFunctionName);
                  } else {
                    showToast('合約地址無效', 'error');
                  }
                }} 
                isSetting={pendingTx === config.key} 
              />
            ))}
          </div>
        </div>
      </AdminSection>

      <AdminSection 
        title="地城參數管理"
        defaultExpanded={loadedSections.dungeonParams}
        onExpand={() => setLoadedSections(prev => ({ ...prev, dungeonParams: true }))}
      >
        <DungeonManager chainId={chainId} />
      </AdminSection>
      
      <AdminSection 
        title="⚔️ 升星祭壇規則管理"
        defaultExpanded={false}
        onExpand={() => setLoadedSections(prev => ({ ...prev, altarRules: true }))}
      >
        {loadedSections.altarRules && <AltarRuleManager chainId={chainId} />}
      </AdminSection>
      
      <AdminSection 
        title="VIP 質押設定管理"
        defaultExpanded={loadedSections.vipSettings}
        onExpand={() => setLoadedSections(prev => ({ ...prev, vipSettings: true }))}
      >
        <VipSettingsManager chainId={chainId} />
      </AdminSection>
      
      <AdminSection 
        title="📊 Pitch 頁面管理"
        defaultExpanded={false}
        onExpand={() => setLoadedSections(prev => ({ ...prev, pitchManager: true }))}
      >
        {loadedSections.pitchManager && <PitchUrlManager />}
      </AdminSection>
      
      <AdminSection 
        title="核心價格管理 (USD)"
        defaultExpanded={loadedSections.corePrice}
        onExpand={() => setLoadedSections(prev => ({ ...prev, corePrice: true }))}
        isLoading={isLoadingParams && loadedSections.corePrice}
        headerActions={paramsError && import.meta.env.DEV ? (
          <button
            onClick={() => refetchParams()}
            className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            重新載入
          </button>
        ) : undefined}
      >
        {parameterConfig && Array.isArray(parameterConfig) && parameterConfig.filter(p => p && p.unit === 'USD').map((p) => {
          const { key, setter, ...rest } = p;
          const paramIndex = parameterConfig.findIndex(pc => pc && pc.key === p.key);
          return (
            <SettingRow
              key={key}
              {...rest}
              functionName={setter}
              readSource={`${p.contract.address}.${p.getter}()`}
              currentValue={params && paramIndex >= 0 && params[paramIndex] ? params[paramIndex].result : undefined}
              isLoading={isLoadingParams}
            />
          );
        })}
      </AdminSection>

      {/* 診斷區塊 - 暫時注釋
      {import.meta.env.DEV && (
        <AdminSection title="診斷信息" defaultExpanded={true}>
          <div className="p-4 bg-gray-800 rounded">
            <p>參數載入狀態: {isLoadingParams ? '載入中' : '完成'}</p>
            <p>參數數量: {params?.length || 0}</p>
            <p>explorationFee 索引: {parameterConfig.findIndex(p => p.key === 'explorationFee')}</p>
            {params && params[parameterConfig.findIndex(p => p.key === 'explorationFee')] && (
              <div>
                <p>explorationFee 狀態: {params[parameterConfig.findIndex(p => p.key === 'explorationFee')].status}</p>
                <p>explorationFee 結果: {params[parameterConfig.findIndex(p => p.key === 'explorationFee')].result?.toString()}</p>
              </div>
            )}
          </div>
        </AdminSection>
      )}
      */}

      <AdminSection 
        title="平台費用管理 (BNB)"
        defaultExpanded={loadedSections.platformFee}
        onExpand={() => setLoadedSections(prev => ({ ...prev, platformFee: true }))}
        isLoading={isLoadingParams && loadedSections.platformFee}
      >
        {parameterConfig && Array.isArray(parameterConfig) && parameterConfig.filter(p => p && p.unit === 'BNB').map((p) => {
          const { key, setter, ...rest } = p;
          const paramIndex = parameterConfig.findIndex(pc => pc && pc.key === p.key);
          
          // 調試：檢查探索費用的數據
          if (p.key === 'explorationFee') {
            logger.debug('🔍 探索費用調試信息:', {
              key: p.key,
              label: p.label,
              paramIndex,
              paramsExist: !!params,
              paramsLength: params?.length,
              specificParam: params?.[paramIndex],
              status: params?.[paramIndex]?.status,
              result: params?.[paramIndex]?.result,
              error: params?.[paramIndex]?.error,
              isLoadingParams,
              contractAddress: p.contract?.address,
              functionName: p.getter
            });
          }
          
          return (
            <SettingRow
              key={key}
              {...rest}
              functionName={setter}
              readSource={`${p.contract.address}.${p.getter}()`}
              currentValue={params && paramIndex >= 0 && params[paramIndex] ? params[paramIndex].result : undefined}
              isLoading={isLoadingParams}
            />
          );
        })}
      </AdminSection>

      <AdminSection 
        title="稅務與提現系統"
        defaultExpanded={loadedSections.taxSystem}
        onExpand={() => setLoadedSections(prev => ({ ...prev, taxSystem: true }))}
        isLoading={(isLoadingParams || isLoadingVaultParams) && loadedSections.taxSystem}
      >
        {/* 新版 PlayerVault v4.0 稅收管理 */}
        {loadedSections.taxSystem && <TaxManagement className="mb-6" />}
        
        {parameterConfig && Array.isArray(parameterConfig) && parameterConfig.filter(p => p && ['commissionRate'].includes(p.key)).map((p) => {
          const paramIndex = parameterConfig.findIndex(pc => pc && pc.key === p.key);
          const currentValue = params && paramIndex >= 0 ? params[paramIndex]?.result : undefined;
          const { key, setter, ...rest } = p;
          return (
            <SettingRow
              key={key}
              {...rest}
              functionName={setter}
              readSource={`${p.contract.address}.${p.getter}()`}
              currentValue={currentValue}
              isLoading={isLoadingParams}
            />
          );
        })}
        
        {/* 稅務參數顯示 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ReadOnlyRow 
            label="大額提款門檻" 
            value={vaultParams?.[0]?.result ? `${parseFloat(formatEther(vaultParams[0].result as bigint)).toFixed(2)} USD` : '載入中...'} 
            isLoading={isLoadingVaultParams} 
          />
          <ReadOnlyRow 
            label="小額提款門檻" 
            value={vaultParams?.[1]?.result ? `${parseFloat(formatEther(vaultParams[1].result as bigint)).toFixed(2)} USD` : '載入中...'} 
            isLoading={isLoadingVaultParams} 
          />
          <ReadOnlyRow 
            label="標準稅率" 
            value={vaultParams?.[2]?.result ? `${Number(vaultParams[2].result)}‱` : '載入中...'} 
            isLoading={isLoadingVaultParams} 
          />
          <ReadOnlyRow 
            label="大額稅率" 
            value={vaultParams?.[3]?.result ? `${Number(vaultParams[3].result)}‱` : '載入中...'} 
            isLoading={isLoadingVaultParams} 
          />
          <ReadOnlyRow 
            label="時間衰減率" 
            value={vaultParams?.[4]?.result ? `${Number(vaultParams[4].result)}‱` : '載入中...'} 
            isLoading={isLoadingVaultParams} 
          />
          <ReadOnlyRow 
            label="衰減週期" 
            value={vaultParams?.[5]?.result ? `${Number(vaultParams[5].result) / 86400} 天` : '載入中...'} 
            isLoading={isLoadingVaultParams} 
          />
        </div>
      </AdminSection>

      <AdminSection 
        title="遊戲機制參數"
        defaultExpanded={true}
      >
        {/* 顯示固定的冷卻時間 */}
        <ReadOnlyRow
          label="地下城挑戰冷卻"
          value="24 小時（固定值）"
          className="mb-4"
        />
        {(() => {
          // 由於冷卻時間現在是固定值，這裡不需要過濾任何參數
          const filteredParams: any[] = [];
          
          return filteredParams.map((p) => {
            const { key, setter, ...rest } = p;
            const paramIndex = parameterConfig.findIndex(pc => pc && pc.key === p.key);
            const currentValue = params?.[paramIndex]?.result;
            
            console.log('🔍 dungeonCooldown 渲染數據:', {
              key,
              paramIndex,
              paramData: params?.[paramIndex],
              paramDataStatus: params?.[paramIndex]?.status,
              paramDataResult: params?.[paramIndex]?.result,
              paramDataError: params?.[paramIndex]?.error,
              currentValue,
              isLoading: isLoadingParams
            });
            
            return (
              <SettingRow
                key={key}
                {...rest}
                functionName={setter}
                readSource={`${p.contract.address}.${p.getter}()`}
                currentValue={currentValue}
                isLoading={isLoadingParams}
              />
            );
          });
        })()}
      </AdminSection>

      {/* Oracle TWAP 週期設定 - 暫時註釋
      <AdminSection 
        title="Oracle 設定"
        defaultExpanded={false}
        onExpand={() => setLoadedSections(prev => ({ ...prev, oracle: true }))}
        isLoading={isLoadingParams && loadedSections.oracle}
      >
        {parameterConfig && Array.isArray(parameterConfig) && parameterConfig.filter(p => p && ['twapPeriod'].includes(p.key)).map((p) => {
          const { key, setter, ...rest } = p;
          const paramIndex = parameterConfig.findIndex(pc => pc && pc.key === p.key);
          return (
            <SettingRow
              key={key}
              {...rest}
              functionName={setter}
              readSource={`${p.contract.address}.${p.getter}()`}
              currentValue={params && paramIndex >= 0 && params[paramIndex] ? params[paramIndex].result : undefined}
              isLoading={isLoadingParams}
            />
          );
        })}
      </AdminSection>
      */}

      <AdminSection 
        title="合約控制"
        defaultExpanded={true}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-4">
            <h4 className="text-lg font-semibold">合約暫停/恢復</h4>
            <div className="space-y-2">
              {/* 支援 pause/unpause 的合約 */}
              {['party', 'dungeonMaster', 'hero', 'relic', 'altarOfAscension'].map(contractName => {
                const contract = getContractWithABI(chainId, contractName);
                if (!contract || !contract.address) return null;
                return (
                  <div key={contractName} className="flex gap-2">
                    <ActionButton 
                      onClick={async () => {
                        try {
                          const hash = await writeContractAsync({ 
                            address: contract.address, 
                            abi: contract.abi, 
                            functionName: 'pause' 
                          });
                          addTransaction({ hash, description: `暫停 ${contractName} 合約` });
                          showToast(`${contractName} 合約已暫停`, 'success');
                          
                          // 🔄 立即失效合約狀態相關快取
                          queryClient.invalidateQueries({ queryKey: ['contract-status'] });
                          queryClient.invalidateQueries({ queryKey: ['admin-contracts'] });
                        } catch (e: any) {
                          if (!e?.message?.includes('User rejected')) {
                            showToast(`暫停 ${contractName} 失敗: ${e?.shortMessage || e?.message || '未知錯誤'}`, 'error');
                          }
                        }
                      }}
                      className="flex-1 bg-red-600 hover:bg-red-700"
                    >
                      暫停 {
                        contractName === 'dungeonMaster' ? '地城主' : 
                        contractName === 'party' ? '隊伍' : 
                        contractName === 'hero' ? '英雄' :
                        contractName === 'relic' ? '聖物' :
                        contractName === 'altarOfAscension' ? '祭壇' :
                        contractName
                      }
                    </ActionButton>
                    <ActionButton 
                      onClick={async () => {
                        try {
                          const hash = await writeContractAsync({ 
                            address: contract.address, 
                            abi: contract.abi, 
                            functionName: 'unpause' 
                          });
                          addTransaction({ hash, description: `恢復 ${contractName} 合約` });
                          showToast(`${contractName} 合約已恢復`, 'success');
                          
                          // 🔄 立即失效合約狀態相關快取
                          queryClient.invalidateQueries({ queryKey: ['contract-status'] });
                          queryClient.invalidateQueries({ queryKey: ['admin-contracts'] });
                        } catch (e: any) {
                          if (!e?.message?.includes('User rejected')) {
                            showToast(`恢復 ${contractName} 失敗: ${e?.shortMessage || e?.message || '未知錯誤'}`, 'error');
                          }
                        }
                      }}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      恢復 {
                        contractName === 'dungeonMaster' ? '地城主' : 
                        contractName === 'party' ? '隊伍' : 
                        contractName === 'hero' ? '英雄' :
                        contractName === 'relic' ? '聖物' :
                        contractName === 'altarOfAscension' ? '祭壇' :
                        contractName
                      }
                    </ActionButton>
                  </div>
                );
              })}
            </div>
          </div>
          
          <FundsWithdrawal chainId={chainId} />
        </div>
      </AdminSection>

      <AdminSection 
        title="🚀 RPC 監控系統"
        defaultExpanded={false}
        onExpand={() => setLoadedSections(prev => ({ ...prev, rpcMonitor: true }))}
      >
        <ErrorBoundary>
          <RpcMonitoringPanel />
        </ErrorBoundary>
      </AdminSection>
    </>
  );
});

const AdminPage: React.FC = () => {
  const { chainId } = useAccount();
  const isSupportedChain = (id: number | undefined): id is SupportedChainId => id === bsc.id;
  
  // 添加全局錯誤邊界
  const [hasError, setHasError] = useState(false);
  
  useEffect(() => {
    const handleError = (error: ErrorEvent) => {
      if (error.message.includes('Cannot read properties of undefined')) {
        logger.error('全局錯誤捕獲:', {
          message: error.message,
          filename: error.filename,
          lineno: error.lineno,
          colno: error.colno,
          stack: error.error?.stack
        });
        setHasError(true);
      }
    };
    
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);
  
  if (hasError) {
    return (
      <div className="text-center mt-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <strong>錯誤：</strong>管理頁面遇到錯誤，請重新整理頁面或聯繫開發者
        </div>
        <button 
          onClick={() => window.location.reload()} 
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          重新整理頁面
        </button>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <section className="space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="page-title">超級管理控制台</h2>
            <p className="text-sm text-green-400 mt-1">
              {(import.meta.env.VITE_USE_RPC_PROXY === 'true' || 
                import.meta.env.VITE_ADMIN_USE_VERCEL_PROXY === 'true')
                ? '🛡️ 使用穩定的 Vercel 代理 RPC' 
                : '🔧 使用直接 Alchemy 連接'
              }
            </p>
          </div>
          {import.meta.env.DEV && (
            <button
              onClick={() => {
                window.location.reload();
              }}
              className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
            >
              強制刷新頁面
            </button>
          )}
        </div>
        {isSupportedChain(chainId) ? (
          <AdminPageContent chainId={chainId} />
        ) : (
          <EmptyState message="請連接到 BSC 主網以使用管理功能。" />
        )}
      </section>
    </ErrorBoundary>
  );
};

export default memo(AdminPage);
export { AdminPage };
