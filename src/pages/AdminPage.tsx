// src/pages/AdminPage.tsx

import React, { useState, useMemo, useEffect } from 'react';
import { useAccount, useReadContracts, useWriteContract } from 'wagmi';
import { useMonitoredReadContracts } from '../hooks/useMonitoredContract';
import { useQueryClient } from '@tanstack/react-query';
import { formatEther, isAddress } from 'viem';
type ContractName = keyof typeof import('../config/contracts').contracts[typeof bsc.id];
import { getContract, contracts as contractConfigs } from '../config/contracts';
import { useAppToast } from '../hooks/useAppToast';
import { ActionButton } from '../components/ui/ActionButton';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorBoundary } from '../components/ui/ErrorBoundary';
import { bsc } from 'wagmi/chains';
import { useTransactionStore } from '../stores/useTransactionStore';
import { getOptimizedQueryConfig } from '../config/rpcOptimization';
import { watchManager } from '../config/watchConfig';
import { AdminPageDebugger } from '../utils/adminPageDebugger';
import { logger } from '../utils/logger';

// Import newly created admin components
import AdminSection from '../components/admin/AdminSection';
import ReadOnlyRow from '../components/admin/ReadOnlyRow';
import AddressSettingRow from '../components/admin/AddressSettingRow';
import SettingRow from '../components/admin/SettingRow';
import DungeonManager from '../components/admin/DungeonManager';
import AltarRuleManager from '../components/admin/AltarRuleManager';
import FundsWithdrawal from '../components/admin/FundsWithdrawal';
import VipSettingsManager from '../components/admin/VipSettingsManager';
import GlobalRewardSettings from '../components/admin/GlobalRewardSettings';
// import RpcMonitoringPanel from '../components/admin/RpcMonitoringPanel'; // Removed RPC monitoring

type SupportedChainId = typeof bsc.id;
type Address = `0x${string}`;

// 開發者地址常量
const DEVELOPER_ADDRESS = import.meta.env.VITE_DEVELOPER_ADDRESS || '0x10925A7138649C7E1794CE646182eeb5BF8ba647';

const AdminPageContent: React.FC<{ chainId: SupportedChainId }> = ({ chainId }) => {
  const { address } = useAccount();
  const { showToast } = useAppToast();
  const { addTransaction } = useTransactionStore();
  const { writeContractAsync } = useWriteContract();
  const queryClient = useQueryClient();
  
  // 調試 chainId
  useEffect(() => {
    logger.debug('AdminPageContent chainId 變更:', { chainId, type: typeof chainId });
  }, [chainId]);
  
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [isBatchSetting, setIsBatchSetting] = useState(false);
  const [pendingTx, setPendingTx] = useState<string | null>(null);
  
  // 懶加載狀態 - 追蹤哪些區塊應該加載數據
  const [loadedSections, setLoadedSections] = useState<Record<string, boolean>>({
    contractCenter: true, // 合約串接中心默認展開
    globalReward: false,
    dungeonParams: false,
    altarRules: false,
    vipSettings: false,
    corePrice: false,
    platformFee: false,
    taxSystem: false,
    gameParams: false,
    oracle: false,
    contractControl: false,
    rpcMonitor: false,
  });

  // 管理員頁面初始化時清理 Watch
  useEffect(() => {
    watchManager.clearAll();
    showToast('管理員模式已啟用，Watch 監聽已優化', 'info');
    return () => {
      // 離開管理員頁面時不需要特別處理，因為其他頁面會重新註冊需要的 Watch
    };
  }, [showToast]);

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
      ];
      
      logger.debug('setupConfig 創建成功', { configCount: config.length });
      return config;
    } catch (error) {
      logger.error('setupConfig 創建失敗:', error);
      return [];
    }
  }, []);

  const contractsToRead = useMemo(() => {
    try {
      if (!chainId || !setupConfig || !Array.isArray(setupConfig) || setupConfig.length === 0) {
        logger.debug('contractsToRead: 基礎數據不完整', { 
          chainId, 
          setupConfig: setupConfig ? 'exists' : 'undefined',
          isArray: Array.isArray(setupConfig),
          length: setupConfig?.length
        });
        return [];
      }
      
      const coreContract = getContract(chainId, 'dungeonCore');
      if (!coreContract || !coreContract.address) {
        logger.warn('DungeonCore 合約未找到或地址無效', { chainId, coreContract });
        return [];
      }
      
      const configs = setupConfig.map(c => {
        if (!c || !c.targetContractName || !c.getterFunctionName) {
          logger.warn('無效的配置項:', c);
          return null;
        }
        
        const contract = getContract(chainId, c.targetContractName);
        if (!contract || !contract.address) {
          logger.warn(`合約未找到: ${c.targetContractName}`, { chainId, contract });
          return null;
        }
        return { ...contract, functionName: c.getterFunctionName };
      });
      
      configs.unshift({ ...coreContract, functionName: 'owner' });
      
      const filteredConfigs = configs.filter((c): c is NonNullable<typeof c> => c !== null && !!c.address);
      logger.debug('contractsToRead 計算完成', { 
        totalConfigs: configs.length,
        filteredConfigs: filteredConfigs.length,
        chainId
      });
      
      return filteredConfigs;
    } catch (error) {
      logger.error('contractsToRead 計算失敗:', error);
      return [];
    }
  }, [chainId, setupConfig]);


  const { data: readResults, isLoading: isLoadingSettings, error: settingsError, refetch: refetchSettings } = useMonitoredReadContracts({
    contracts: contractsToRead,
    contractName: 'adminSettings',
    batchName: 'adminContractsBatch',
    query: { 
      enabled: !!chainId && Array.isArray(contractsToRead) && contractsToRead.length > 0 && loadedSections.contractCenter,
      staleTime: 1000 * 60 * 30, // 30分鐘緩存
      gcTime: 1000 * 60 * 60,    // 60分鐘
      refetchOnWindowFocus: false,
      refetchInterval: false,     // 禁用自動刷新
      retry: 2,                   // 允許合理的重試次數
      retryDelay: 1000,           // 重試延遲 1 秒
      retryOnMount: true          // 允許掛載時重試
    },
  });

  const currentAddressMap: Record<string, Address | undefined> = useMemo(() => {
    try {
      if (!readResults || !Array.isArray(readResults) || readResults.length === 0 || 
          !setupConfig || !Array.isArray(setupConfig) || setupConfig.length === 0) {
        logger.debug('currentAddressMap: 數據不完整', { 
          readResults: readResults ? 'exists' : 'undefined',
          readResultsLength: readResults?.length,
          setupConfig: setupConfig ? 'exists' : 'undefined',
          setupConfigLength: setupConfig?.length
        });
        return {};
      }
      
      const owner = readResults[0]?.result as Address | undefined;
      const settings = setupConfig.reduce((acc, config, index) => {
        if (config && config.key && readResults[index + 1] && readResults[index + 1].result) {
          acc[config.key] = readResults[index + 1].result as Address | undefined;
        }
        return acc;
      }, {} as Record<string, Address | undefined>);
      
      logger.debug('currentAddressMap 計算完成', { owner, settingsCount: Object.keys(settings).length });
      return { owner, ...settings };
    } catch (error) {
      logger.error('currentAddressMap 計算失敗:', error);
      return {};
    }
  }, [readResults, setupConfig]);
  
  // 診斷模式：在開發環境中執行診斷（移到 currentAddressMap 定義之後）
  useEffect(() => {
    if (import.meta.env.DEV && contractsToRead.length > 0 && currentAddressMap) {
      AdminPageDebugger.runFullDiagnostics(chainId, contractsToRead, address, currentAddressMap.owner);
    }
  }, [chainId, contractsToRead, address, currentAddressMap]);
  
  // 調試信息將在 parameterContracts 和 vaultContracts 定義之後添加
  
  const envAddressMap: Record<string, { name: ContractName, address?: Address }> = useMemo(() => {
    if (!setupConfig || !Array.isArray(setupConfig) || !chainId) return {};
    
    const getAddr = (name: ContractName) => ({ name, address: contractConfigs[chainId]?.[name]?.address });
    return setupConfig.reduce((acc, config) => {
      if (config && config.key && config.valueToSetContractName) {
        acc[config.key] = getAddr(config.valueToSetContractName);
      }
      return acc;
    }, {} as Record<string, { name: ContractName, address?: Address }>);
  }, [chainId, setupConfig]);
  
  type ParameterConfigItem = {
    key: string;
    label: string;
    contract: NonNullable<ReturnType<typeof getContract>>;
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
        hero: getContract(chainId, 'hero'),
        relic: getContract(chainId, 'relic'),
        party: getContract(chainId, 'party'),
        dungeonMaster: getContract(chainId, 'dungeonMaster'),
        playerVault: getContract(chainId, 'playerVault'),
        vipStaking: getContract(chainId, 'vipStaking'),
        oracle: getContract(chainId, 'oracle'),
      };
      
      // 檢查關鍵合約是否存在
      const missingContracts = Object.entries(contracts).filter(([_, contract]) => !contract || !contract.address);
      if (missingContracts.length > 0) {
        logger.warn('部分合約缺失:', missingContracts.map(([name]) => name));
      }
    
    const config = [
      // 鑄造價格設定
      { key: 'heroMintPrice', label: "英雄鑄造價", contract: contracts.hero, getter: 'mintPriceUSD', setter: 'setMintPriceUSD', unit: 'USD', placeholders: ['新價格 (USD)'] },
      { key: 'relicMintPrice', label: "聖物鑄造價", contract: contracts.relic, getter: 'mintPriceUSD', setter: 'setMintPriceUSD', unit: 'USD', placeholders: ['新價格 (USD)'] },
      { key: 'provisionPrice', label: "儲備購買價", contract: contracts.dungeonMaster, getter: 'provisionPriceUSD', setter: 'setProvisionPriceUSD', unit: 'USD', placeholders: ['新價格 (USD)'] },
      
      // 平台費用設定
      { key: 'heroFee', label: "英雄平台費", contract: contracts.hero, getter: 'platformFee', setter: 'setPlatformFee', unit: 'BNB', placeholders: ['新費用 (BNB)'] },
      { key: 'relicFee', label: "聖物平台費", contract: contracts.relic, getter: 'platformFee', setter: 'setPlatformFee', unit: 'BNB', placeholders: ['新費用 (BNB)'] },
      { key: 'partyFee', label: "隊伍平台費", contract: contracts.party, getter: 'platformFee', setter: 'setPlatformFee', unit: 'BNB', placeholders: ['新費用 (BNB)'] },
      { key: 'explorationFee', label: "遠征探索費", contract: contracts.dungeonMaster, getter: 'explorationFee', setter: 'setExplorationFee', unit: 'BNB', placeholders: ['新費用 (BNB)'] },
      
      // 遊戲機制參數
      { key: 'restDivisor', label: "休息成本係數", contract: contracts.dungeonMaster, getter: 'restCostPowerDivisor', setter: 'setRestCostPowerDivisor', unit: '無', placeholders: ['新係數 (戰力/USD)'] },
      { key: 'vipCooldown', label: "VIP 取消質押冷卻 (秒)", contract: contracts.vipStaking, getter: 'unstakeCooldown', setter: 'setUnstakeCooldown', unit: '無', placeholders: ['新冷卻時間 (秒)'] },
      { key: 'globalRewardMultiplier', label: "全域獎勵倍率", contract: contracts.dungeonMaster, getter: 'globalRewardMultiplier', setter: 'setGlobalRewardMultiplier', unit: '‱', placeholders: ['新倍率 (1000=100%)'] },
      
      // 稅務與提現系統
      { key: 'commissionRate', label: "邀請佣金率", contract: contracts.playerVault, getter: 'commissionRate', setter: 'setCommissionRate', unit: '‱', placeholders: ['新佣金率 (萬分位)'] },
      
      // Oracle 設定
      { key: 'twapPeriod', label: "Oracle TWAP 週期", contract: contracts.oracle, getter: 'twapPeriod', setter: 'setTwapPeriod', unit: '無', placeholders: ['新週期 (秒)'] },
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
      
      logger.info(`過濾後的參數合約數量: ${contracts.length}/${parameterConfig.length}`);
      return contracts;
    } catch (error) {
      logger.error('parameterContracts 計算失敗:', error);
      return [];
    }
  }, [parameterConfig]);

  const { data: params, isLoading: isLoadingParams, error: paramsError, refetch: refetchParams } = useMonitoredReadContracts({
    contracts: parameterContracts,
    contractName: 'adminParameters',
    batchName: 'adminParametersBatch',
    query: { 
      enabled: Array.isArray(parameterContracts) && parameterContracts.length > 0 && 
        (loadedSections.corePrice || loadedSections.platformFee || loadedSections.taxSystem || loadedSections.gameParams || loadedSections.oracle),
      staleTime: 1000 * 60 * 30, // 30分鐘緩存
      gcTime: 1000 * 60 * 60,    // 60分鐘
      refetchOnWindowFocus: false,
      refetchInterval: false,     // 禁用自動刷新
      retry: 2,                   // 允許合理的重試次數
      retryDelay: 1000,           // 重試延遲 1 秒
      retryOnMount: true          // 允許掛載時重試
    }
  });

  // 讀取 PlayerVault 的稅務參數
  const playerVaultContract = getContract(chainId, 'playerVault');
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
      
      logger.info(`Vault 合約配置完成: ${contracts.length} 個函數`);
      return contracts;
    } catch (error) {
      logger.error('vaultContracts 計算失敗:', error);
      return [];
    }
  }, [playerVaultContract]);

  const { data: vaultParams, isLoading: isLoadingVaultParams, error: vaultParamsError, refetch: refetchVaultParams } = useMonitoredReadContracts({
    contracts: vaultContracts,
    contractName: 'playerVault',
    batchName: 'vaultParametersBatch',
    query: { 
      enabled: !!playerVaultContract && !!playerVaultContract.address && Array.isArray(vaultContracts) && vaultContracts.length > 0 && loadedSections.taxSystem,
      staleTime: 1000 * 60 * 30, // 30分鐘緩存
      gcTime: 1000 * 60 * 60,    // 60分鐘
      refetchOnWindowFocus: false,
      refetchInterval: false,     // 禁用自動刷新
      retry: 2,                   // 允許合理的重試次數
      retryDelay: 1000,           // 重試延遲 1 秒
      retryOnMount: true          // 允許掛載時重試
    }
  });

  // 額外的調試信息 - 檢查參數合約
  useEffect(() => {
    if (import.meta.env.DEV && parameterContracts.length > 0) {
      logger.info('=== 參數合約配置 ===');
      logger.info(`參數合約數量: ${parameterContracts.length}`);
      parameterContracts.forEach((contract, index) => {
        logger.info(`參數合約 ${index}: ${contract.address}.${contract.functionName}`);
      });
    }
  }, [parameterContracts]);
  
  // 調試信息 - 檢查 vault 合約
  useEffect(() => {
    if (import.meta.env.DEV && vaultContracts.length > 0) {
      logger.info('=== Vault 合約配置 ===');
      logger.info(`Vault 合約數量: ${vaultContracts.length}`);
      vaultContracts.forEach((contract, index) => {
        logger.info(`Vault 合約 ${index}: ${contract.address}.${contract.functionName}`);
      });
    }
  }, [vaultContracts]);

  const handleSet = async (key: string, targetContract: NonNullable<ReturnType<typeof getContract>>, functionName: string) => {
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
        const contract = getContract(chainId, config.targetContractName);
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
  
  // 錯誤處理 - 使用 useEffect 避免重複觸發
  const [hasShownError, setHasShownError] = useState<{ settings?: boolean; params?: boolean; vault?: boolean }>({});
  
  useEffect(() => {
    if (settingsError && !hasShownError.settings) {
      showToast(`讀取合約設定失敗: ${settingsError.message || '未知錯誤'}`, 'error');
      logger.debug('讀取管理員設定失敗:', settingsError);
      setHasShownError(prev => ({ ...prev, settings: true }));
    }
    if (!settingsError && hasShownError.settings) {
      setHasShownError(prev => ({ ...prev, settings: false }));
    }
  }, [settingsError, hasShownError.settings, showToast]);
  
  useEffect(() => {
    if (paramsError && !hasShownError.params) {
      showToast(`讀取參數設定失敗: ${paramsError.message || '未知錯誤'}`, 'error');
      logger.debug('讀取參數設定失敗:', paramsError);
      setHasShownError(prev => ({ ...prev, params: true }));
    }
    if (!paramsError && hasShownError.params) {
      setHasShownError(prev => ({ ...prev, params: false }));
    }
  }, [paramsError, hasShownError.params, showToast]);
  
  useEffect(() => {
    if (vaultParamsError && !hasShownError.vault) {
      showToast(`讀取稅務參數失敗: ${vaultParamsError.message || '未知錯誤'}`, 'error');
      logger.debug('讀取稅務參數失敗:', vaultParamsError);
      setHasShownError(prev => ({ ...prev, vault: true }));
    }
    if (!vaultParamsError && hasShownError.vault) {
      setHasShownError(prev => ({ ...prev, vault: false }));
    }
  }, [vaultParamsError, hasShownError.vault, showToast]);

  // 只在第一次加載合約串接中心時顯示全屏加載
  if (loadedSections.contractCenter && isLoadingSettings && !ownerAddress) {
    return <div className="flex justify-center items-center h-64"><LoadingSpinner /></div>;
  }

  // 優化權限檢查邏輯 - 允許開發者地址和合約擁有者訪問
  const isDeveloper = address?.toLowerCase() === DEVELOPER_ADDRESS.toLowerCase();
  const isOwner = ownerAddress && ownerAddress.toLowerCase() === address?.toLowerCase();
  
  // 如果沒有權限，顯示錯誤
  if (!isDeveloper && !isOwner && ownerAddress) {
    return <EmptyState message={`權限不足，僅合約擁有者可訪問。當前擁有者: ${ownerAddress ? `${ownerAddress.substring(0, 6)}...${ownerAddress.substring(ownerAddress.length - 4)}` : '載入中...'}`} />;
  }

  return (
    <>
      <AdminSection 
        title="合約串接中心"
        defaultExpanded={true}
        onExpand={() => setLoadedSections(prev => ({ ...prev, contractCenter: true }))}
        isLoading={isLoadingSettings && loadedSections.contractCenter}
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
                isLoading={isLoadingSettings} 
                inputValue={inputs[config.key] || ''} 
                onInputChange={(val) => setInputs(prev => ({ ...prev, [config.key]: val }))} 
                onSet={() => {
                  const contract = getContract(chainId, config.targetContractName);
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
                isLoading={isLoadingSettings} 
                inputValue={inputs[config.key] || ''} 
                onInputChange={(val) => setInputs(prev => ({ ...prev, [config.key]: val }))} 
                onSet={() => {
                  const contract = getContract(chainId, config.targetContractName);
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
        title="全局獎勵設定"
        defaultExpanded={false}
        onExpand={() => setLoadedSections(prev => ({ ...prev, globalReward: true }))}
      >
        <GlobalRewardSettings chainId={chainId} />
      </AdminSection>

      <AdminSection 
        title="地城參數管理"
        defaultExpanded={false}
        onExpand={() => setLoadedSections(prev => ({ ...prev, dungeonParams: true }))}
      >
        <DungeonManager chainId={chainId} />
      </AdminSection>
      
      <AdminSection 
        title="升星祭壇規則管理"
        defaultExpanded={false}
        onExpand={() => setLoadedSections(prev => ({ ...prev, altarRules: true }))}
      >
        <AltarRuleManager chainId={chainId} />
      </AdminSection>
      
      <AdminSection 
        title="VIP 質押設定管理"
        defaultExpanded={false}
        onExpand={() => setLoadedSections(prev => ({ ...prev, vipSettings: true }))}
      >
        <VipSettingsManager chainId={chainId} />
      </AdminSection>
      
      <AdminSection 
        title="核心價格管理 (USD)"
        defaultExpanded={false}
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
              currentValue={params && paramIndex >= 0 ? params[paramIndex]?.result : undefined}
              isLoading={isLoadingParams}
            />
          );
        })}
      </AdminSection>

      <AdminSection 
        title="平台費用管理 (BNB)"
        defaultExpanded={false}
        onExpand={() => setLoadedSections(prev => ({ ...prev, platformFee: true }))}
        isLoading={isLoadingParams && loadedSections.platformFee}
      >
        {parameterConfig && Array.isArray(parameterConfig) && parameterConfig.filter(p => p && p.unit === 'BNB').map((p) => {
          const { key, setter, ...rest } = p;
          const paramIndex = parameterConfig.findIndex(pc => pc && pc.key === p.key);
          return (
            <SettingRow
              key={key}
              {...rest}
              functionName={setter}
              readSource={`${p.contract.address}.${p.getter}()`}
              currentValue={params && paramIndex >= 0 ? params[paramIndex]?.result : undefined}
              isLoading={isLoadingParams}
            />
          );
        })}
      </AdminSection>

      <AdminSection 
        title="稅務與提現系統"
        defaultExpanded={false}
        onExpand={() => setLoadedSections(prev => ({ ...prev, taxSystem: true }))}
        isLoading={(isLoadingParams || isLoadingVaultParams) && loadedSections.taxSystem}
      >
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
            value={vaultParams?.[0]?.result ? `${formatEther(vaultParams[0].result as bigint)} USD` : '載入中...'} 
            isLoading={isLoadingVaultParams} 
          />
          <ReadOnlyRow 
            label="小額提款門檻" 
            value={vaultParams?.[1]?.result ? `${formatEther(vaultParams[1].result as bigint)} USD` : '載入中...'} 
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
        defaultExpanded={false}
        onExpand={() => setLoadedSections(prev => ({ ...prev, gameParams: true }))}
        isLoading={isLoadingParams && loadedSections.gameParams}
      >
        {parameterConfig && Array.isArray(parameterConfig) && parameterConfig.filter(p => p && ['restDivisor', 'vipCooldown', 'globalRewardMultiplier'].includes(p.key)).map((p) => {
          const { key, setter, ...rest } = p;
          const paramIndex = parameterConfig.findIndex(pc => pc && pc.key === p.key);
          return (
            <SettingRow
              key={key}
              {...rest}
              functionName={setter}
              readSource={`${p.contract.address}.${p.getter}()`}
              currentValue={params && paramIndex >= 0 ? params[paramIndex]?.result : undefined}
              isLoading={isLoadingParams}
            />
          );
        })}
      </AdminSection>

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
              currentValue={params && paramIndex >= 0 ? params[paramIndex]?.result : undefined}
              isLoading={isLoadingParams}
            />
          );
        })}
      </AdminSection>

      <AdminSection 
        title="合約控制"
        defaultExpanded={false}
        onExpand={() => setLoadedSections(prev => ({ ...prev, contractControl: true }))}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-4">
            <h4 className="text-lg font-semibold">合約暫停/恢復</h4>
            <div className="space-y-2">
              {['hero', 'relic', 'party', 'dungeonMaster', 'vipStaking'].map(contractName => {
                const contract = getContract(chainId, contractName);
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
                      暫停 {contractName}
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
                      恢復 {contractName}
                    </ActionButton>
                  </div>
                );
              })}
            </div>
          </div>
          
          <FundsWithdrawal chainId={chainId} />
        </div>
      </AdminSection>

      {/* RPC Monitoring Panel - DISABLED
      <AdminSection 
        title="RPC 監控系統"
        defaultExpanded={false}
        onExpand={() => setLoadedSections(prev => ({ ...prev, rpcMonitor: true }))}
      >
        <RpcMonitoringPanel />
      </AdminSection>
      */}
    </>
  );
};

const AdminPage: React.FC = () => {
  const { chainId } = useAccount();
  const isSupportedChain = (id: number | undefined): id is SupportedChainId => id === bsc.id;

  return (
    <ErrorBoundary>
      <section className="space-y-8">
        <div className="flex justify-between items-center">
          <h2 className="page-title">超級管理控制台</h2>
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

export default AdminPage;
