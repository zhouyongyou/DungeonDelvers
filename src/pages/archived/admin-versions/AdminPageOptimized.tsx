// src/pages/AdminPageOptimized.tsx - 優化的管理員頁面

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useAccount, useWriteContract } from 'wagmi';
import { useMonitoredReadContracts } from '../../hooks/useMonitoredContract';
import { useQueryClient } from '@tanstack/react-query';
import { formatEther, isAddress } from 'viem';
import { getContractWithABI, CONTRACTS_WITH_ABI as contractConfigs } from '../../config/contractsWithABI';
import { getContract } from '../../config/contracts'; // 保留原有函數供地址查詢使用
import { useAppToast } from '../../contexts/SimpleToastContext';
import { ActionButton } from '../../components/ui/ActionButton';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorBoundary } from '../../components/ui/ErrorBoundary';
import { bsc } from 'wagmi/chains';
import { useTransactionStore } from '../../stores/useTransactionStore';

// 優化工具導入
import { contractBatchOptimizer, createOptimizedContractReadConfig } from '../../utils/contractBatchOptimizer';
import { createAdminConfigValidator, generateSafeParameterConfig } from '../../utils/adminConfigValidator';
import { adminErrorHandler, safeContractCall, contractCallWithRetry } from '../../utils/adminErrorHandler';
import { initializeAdminOptimizations, cleanupAdminOptimizations, createAdminOptimizedConfig } from '../../utils/watchOptimizer';
import { logger } from '../../utils/logger';

// 導入管理員組件
import AdminSection from '../../components/admin/AdminSection';
import ReadOnlyRow from '../../components/admin/ReadOnlyRow';
import AddressSettingRow from '../../components/admin/AddressSettingRow';
import SettingRow from '../../components/admin/SettingRow';
import DungeonManager from '../../components/admin/DungeonManager';
import AltarRuleManager from '../../components/admin/AltarRuleManager';
import FundsWithdrawal from '../../components/admin/FundsWithdrawal';
import VipSettingsManager from '../../components/admin/VipSettingsManager';
import GlobalRewardSettings from '../../components/admin/GlobalRewardSettings';
// import RpcMonitoringPanel from '../../components/admin/RpcMonitoringPanel'; // Removed RPC monitoring

type SupportedChainId = typeof bsc.id;
type Address = `0x${string}`;

// 開發者地址常量
const DEVELOPER_ADDRESS = import.meta.env.VITE_DEVELOPER_ADDRESS || '0x10925A7138649C7E1794CE646182eeb5BF8ba647';

// 優化的管理員頁面內容組件
const AdminPageOptimizedContent: React.FC<{ chainId: SupportedChainId }> = ({ chainId }) => {
  const { address } = useAccount();
  const { showToast } = useAppToast();
  const { addTransaction } = useTransactionStore();
  const { writeContractAsync } = useWriteContract();
  const queryClient = useQueryClient();
  
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [isBatchSetting, setIsBatchSetting] = useState(false);
  const [pendingTx, setPendingTx] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // 初始化管理員模式優化
  useEffect(() => {
    if (!isInitialized) {
      initializeAdminOptimizations();
      setIsInitialized(true);
      logger.info('🚀 管理員頁面優化已啟用');
    }

    return () => {
      cleanupAdminOptimizations();
      logger.info('🧹 管理員頁面優化已清理');
    };
  }, [isInitialized]);

  // 使用優化的設定配置
  const setupConfig = useMemo(() => {
    const validator = createAdminConfigValidator(chainId);
    const createSetting = (key: string, title: string, target: ContractName, setter: string, value: ContractName, getter: string) => ({ key, title, targetContractName: target, setterFunctionName: setter, valueToSetContractName: value, getterFunctionName: getter });
    
    const configs = [
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
      createSetting('dungeonCoreForProfile', '在 PlayerProfile 中設定總機', 'playerProfile', 'setDungeonCore', 'dungeonCore', 'dungeonCore'),
      createSetting('dungeonCoreForVip', '在 VIPStaking 中設定總機', 'vipStaking', 'setDungeonCore', 'dungeonCore', 'dungeonCore'),
      createSetting('dungeonCoreForAltar', '在 Altar 中設定總機', 'altarOfAscension', 'setDungeonCore', 'dungeonCore', 'dungeonCore'),
    ];

    const validation = validator.validateSetupConfig(configs);
    if (validation.errors.length > 0) {
      logger.warn('設定配置驗證失敗:', validation.errors);
    }

    return validation.validConfigs;
  }, [chainId]);

  // 使用優化的合約讀取配置
  const contractsToRead = useMemo(() => {
    const coreContract = getContractWithABI(chainId, 'dungeonCore');
    const configs = setupConfig.map(c => {
      const contract = getContractWithABI(chainId, c.targetContractName);
      if (!contract) return null;
      return { ...contract, functionName: c.getterFunctionName };
    });
    
    if (coreContract) {
      configs.unshift({ ...coreContract, functionName: 'owner' });
    }
    
    const validConfigs = configs.filter((c): c is NonNullable<typeof c> => c !== null && !!c.address);
    
    // 驗證配置
    const { valid, errors } = contractBatchOptimizer.validateContractConfig(validConfigs);
    if (errors.length > 0) {
      logger.warn('合約配置驗證失敗:', errors);
    }
    
    return valid;
  }, [chainId, setupConfig]);

  // 使用優化的 useMonitoredReadContracts
  const optimizedConfig = createOptimizedContractReadConfig(contractsToRead, 'adminContractsBatch', {
    enabled: !!chainId && contractsToRead.length > 0,
    staleTime: 1000 * 60 * 30, // 30分鐘
    gcTime: 1000 * 60 * 90,    // 90分鐘
  });
  
  const { data: readResults, isLoading: isLoadingSettings, error: settingsError } = useMonitoredReadContracts({
    contracts: optimizedConfig.contracts,
    query: optimizedConfig.query,
    contractName: 'adminSettings',
    batchName: 'adminContractsBatch',
  });

  // 使用優化的參數配置
  const parameterConfig = useMemo(() => {
    return generateSafeParameterConfig(chainId);
  }, [chainId]);

  // 參數合約讀取配置
  const parameterContracts = useMemo(() => {
    const validator = createAdminConfigValidator(chainId);
    return validator.generateContractReadConfigs(parameterConfig);
  }, [parameterConfig, chainId]);

  // 使用優化的參數讀取
  const paramsOptimizedConfig = createOptimizedContractReadConfig(parameterContracts, 'adminParametersBatch', {
    enabled: parameterContracts.length > 0,
    staleTime: 1000 * 60 * 20, // 20分鐘
    gcTime: 1000 * 60 * 60,    // 60分鐘
  });
  
  const { data: params, isLoading: isLoadingParams, error: paramsError } = useMonitoredReadContracts({
    contracts: paramsOptimizedConfig.contracts,
    query: paramsOptimizedConfig.query,
    contractName: 'adminParameters',
    batchName: 'adminParametersBatch',
  });

  // 使用優化的 Vault 參數讀取
  const playerVaultContract = getContractWithABI(chainId, 'playerVault');
  const vaultContracts = useMemo(() => {
    if (!playerVaultContract) return [];
    return [
      { ...playerVaultContract, functionName: 'largeWithdrawThresholdUSD' as const },
      { ...playerVaultContract, functionName: 'smallWithdrawThresholdUSD' as const },
      { ...playerVaultContract, functionName: 'standardInitialRate' as const },
      { ...playerVaultContract, functionName: 'largeWithdrawInitialRate' as const },
      { ...playerVaultContract, functionName: 'decreaseRatePerPeriod' as const },
      { ...playerVaultContract, functionName: 'periodDuration' as const },
    ];
  }, [playerVaultContract]);

  const vaultOptimizedConfig = createOptimizedContractReadConfig(vaultContracts, 'vaultParametersBatch', {
    enabled: !!playerVaultContract && vaultContracts.length > 0,
    staleTime: 1000 * 60 * 25, // 25分鐘
    gcTime: 1000 * 60 * 75,    // 75分鐘
  });
  
  const { data: vaultParams, isLoading: isLoadingVaultParams, error: vaultError } = useMonitoredReadContracts({
    contracts: vaultOptimizedConfig.contracts,
    query: vaultOptimizedConfig.query,
    contractName: 'playerVault',
    batchName: 'vaultParametersBatch',
  });

  // 計算當前地址映射
  const currentAddressMap: Record<string, Address | undefined> = useMemo(() => {
    if (!readResults || !Array.isArray(readResults)) return {};
    
    return safeContractCall(
      () => {
        const owner = readResults[0]?.result as Address | undefined;
        const settings = setupConfig.reduce((acc, config, index) => {
          acc[config.key] = readResults[index + 1]?.result as Address | undefined;
          return acc;
        }, {} as Record<string, Address | undefined>);
        return { owner, ...settings };
      },
      {},
      '計算地址映射失敗'
    );
  }, [readResults, setupConfig]);

  // 環境地址映射
  const envAddressMap: Record<string, { name: ContractName, address?: Address }> = useMemo(() => {
    if (!setupConfig || !Array.isArray(setupConfig) || !chainId) return {};
    
    // 建立環境變數名稱到合約地址的映射
    const envVarMapping: Record<ContractName, string> = {
      'TESTUSD': import.meta.env.VITE_TESTUSD_ADDRESS,
      'SOULSHARD': import.meta.env.VITE_SOULSHARD_ADDRESS,
      'HERO': import.meta.env.VITE_HERO_ADDRESS,
      'RELIC': import.meta.env.VITE_RELIC_ADDRESS,
      'PARTY': import.meta.env.VITE_PARTY_ADDRESS,
      'DUNGEONCORE': import.meta.env.VITE_DUNGEONCORE_ADDRESS,
      'DUNGEONMASTER': import.meta.env.VITE_DUNGEONMASTER_ADDRESS,
      'DUNGEONSTORAGE': import.meta.env.VITE_DUNGEONSTORAGE_ADDRESS,
      'PLAYERVAULT': import.meta.env.VITE_PLAYERVAULT_ADDRESS,
      'PLAYERPROFILE': import.meta.env.VITE_PLAYERPROFILE_ADDRESS,
      'VIPSTAKING': import.meta.env.VITE_VIPSTAKING_ADDRESS,
      'ORACLE': import.meta.env.VITE_ORACLE_ADDRESS,
      'ALTAROFASCENSION': import.meta.env.VITE_ALTAROFASCENSION_ADDRESS,
      'DUNGEONMASTERWALLET': import.meta.env.VITE_DUNGEONMASTERWALLET_ADDRESS,
    };

    // 調試環境變數載入情況
    if (import.meta.env.DEV) {
      console.log('環境變數調試:', {
        oracle: import.meta.env.VITE_ORACLE_ADDRESS,
        dungeonCore: import.meta.env.VITE_DUNGEONCORE_ADDRESS,
        envVarMapping
      });
    }
    
    const getAddr = (name: ContractName) => {
      // 優先使用環境變數，如果沒有則使用配置文件
      const envAddress = envVarMapping[name];
      const configAddress = contractConfigs[name];
      const finalAddress = envAddress || configAddress;
      
      return { 
        name, 
        address: finalAddress && finalAddress !== '0x0000000000000000000000000000000000000000' 
          ? finalAddress as Address 
          : undefined 
      };
    };
    
    return setupConfig.reduce((acc, config) => {
      if (config && config.key && config.valueToSetContractName) {
        acc[config.key] = getAddr(config.valueToSetContractName);
      }
      return acc;
    }, {} as Record<string, { name: ContractName, address?: Address }>);
  }, [chainId, setupConfig]);

  // 優化的設定處理函數
  const handleSet = useCallback(async (key: string, targetContract: NonNullable<ReturnType<typeof getContractWithABI>>, functionName: string) => {
    const newAddress = inputs[key];
    if (!isAddress(newAddress)) {
      showToast('請輸入有效的地址', 'error');
      return;
    }
    
    setPendingTx(key);
    
    try {
      const result = await contractCallWithRetry(
        `admin_set_${key}`,
        async () => {
          return await writeContractAsync({
            address: targetContract.address,
            abi: targetContract.abi,
            functionName: functionName as any,
            args: [newAddress]
          });
        },
        {
          maxRetries: 2,
          timeout: 30000,
          onRetry: (attemptNumber) => {
            showToast(`重試設定 ${key} (${attemptNumber}/2)`, 'info');
          }
        }
      );
      
      addTransaction({ hash: result, description: `管理員設定: ${key}` });
      showToast(`${key} 設定交易已送出`, 'success');
      
      // 優化快取失效
      queryClient.invalidateQueries({
        queryKey: ['monitored-read-contracts', 'adminSettings'],
      });
      
    } catch (error) {
      const adminError = adminErrorHandler.handleError(error, {
        component: 'AdminPage',
        action: 'handleSet',
        contractName: targetContract.address,
        functionName,
      });
      
      if (!adminError.details?.message?.includes('User rejected')) {
        showToast(adminError.message, 'error');
      }
    } finally {
      setPendingTx(null);
    }
  }, [inputs, writeContractAsync, addTransaction, showToast, queryClient]);

  // 優化的批次設定處理
  const handleBatchSet = useCallback(async () => {
    setIsBatchSetting(true);
    showToast('開始批次設定，請逐一在錢包中確認交易...', 'info');
    
    const batchOperations = setupConfig.map(config => ({
      key: config.key,
      operation: async () => {
        const newAddress = inputs[config.key];
        const currentAddress = currentAddressMap[config.key];
        
        if (newAddress && isAddress(newAddress) && currentAddress && newAddress.toLowerCase() !== currentAddress.toLowerCase()) {
          const contract = getContractWithABI(chainId, config.targetContractName);
          if (contract) {
            await handleSet(config.key, contract, config.setterFunctionName);
          }
        }
      }
    }));

    // 批次執行
    let successCount = 0;
    let errorCount = 0;
    
    for (const { key, operation } of batchOperations) {
      try {
        await operation();
        successCount++;
      } catch (error) {
        errorCount++;
        logger.error(`批次設定失敗: ${key}`, error);
      }
    }
    
    setIsBatchSetting(false);
    showToast(`批次設定完成！成功: ${successCount}, 失敗: ${errorCount}`, successCount > 0 ? 'success' : 'error');
    
    // 批次完成後失效快取
    queryClient.invalidateQueries({
      predicate: (query) => {
        const queryKey = query.queryKey;
        return queryKey.includes('admin') || queryKey.includes('monitored-read-contracts');
      },
    });
  }, [setupConfig, inputs, currentAddressMap, chainId, handleSet, showToast, queryClient]);

  // 從環境填入地址
  const handleFillFromEnv = useCallback(() => {
    const definedEnvAddresses = Object.entries(envAddressMap)
      .filter(([, value]) => !!value.address)
      .reduce((acc, [key, value]) => {
        acc[key] = value.address!;
        return acc;
      }, {} as Record<string, string>);
    
    setInputs(prev => ({ ...prev, ...definedEnvAddresses }));
    showToast('已從 .env 設定檔載入所有地址！', 'info');
  }, [envAddressMap, showToast]);

  // 錯誤處理
  const hasErrors = settingsError || paramsError || vaultError;
  const isLoading = isLoadingSettings || isLoadingParams || isLoadingVaultParams;

  if (hasErrors) {
    const error = settingsError || paramsError || vaultError;
    const adminError = adminErrorHandler.handleError(error, {
      component: 'AdminPage',
      action: 'dataLoading',
    });
    
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="text-red-400 text-center">
          <h3 className="text-lg font-semibold mb-2">載入失敗</h3>
          <p className="text-sm mb-4">{adminError.message}</p>
          <pre className="text-xs bg-gray-800 p-2 rounded max-w-md overflow-auto">
            {adminError.details?.message || '未知錯誤'}
          </pre>
        </div>
        <ActionButton 
          onClick={() => window.location.reload()} 
          className="bg-blue-600 hover:bg-blue-700"
        >
          重新載入頁面
        </ActionButton>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <LoadingSpinner />
          <p className="mt-2 text-gray-400">正在載入管理員數據...</p>
        </div>
      </div>
    );
  }

  // 權限檢查
  const ownerAddress = currentAddressMap.owner;
  const isDeveloper = address?.toLowerCase() === DEVELOPER_ADDRESS.toLowerCase();
  const isOwner = ownerAddress && ownerAddress.toLowerCase() === address?.toLowerCase();

  if (!isDeveloper && !isOwner) {
    return (
      <EmptyState 
        message={`權限不足，僅合約擁有者可訪問。當前擁有者: ${ownerAddress ? `${ownerAddress.substring(0, 6)}...${ownerAddress.substring(ownerAddress.length - 4)}` : '載入中...'}`} 
      />
    );
  }

  return (
    <>
      <AdminSection title="合約串接中心">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <p className="text-gray-300 text-sm max-w-2xl">
            此頁面用於在合約部署後，將各個模組的地址設定到正確的位置。請依序填入所有已部署的合約地址，然後點擊「全部設定」，或逐一進行設定。
          </p>
          <div className="flex-shrink-0 flex flex-col md:flex-row gap-2 w-full md:w-auto">
            <ActionButton 
              onClick={handleFillFromEnv} 
              className="w-full md:w-auto h-12 text-base bg-gray-600"
            >
              從 .env 填入
            </ActionButton>
            <ActionButton 
              onClick={handleBatchSet} 
              isLoading={isBatchSetting} 
              className="w-full md:w-auto h-12 text-lg"
            >
              全部設定
            </ActionButton>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4">
          <div className="space-y-4">
            <h4 className="text-xl font-semibold text-center">總機設定 (DungeonCore)</h4>
            {setupConfig.slice(0, 9).map(config => (
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
                onSet={() => handleSet(config.key, getContractWithABI(chainId, config.targetContractName)!, config.setterFunctionName)} 
                isSetting={pendingTx === config.key} 
              />
            ))}
          </div>
          
          <div className="space-y-4">
            <h4 className="text-xl font-semibold text-center">各模組回連設定</h4>
            {setupConfig.slice(9).map(config => (
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
                onSet={() => handleSet(config.key, getContractWithABI(chainId, config.targetContractName)!, config.setterFunctionName)} 
                isSetting={pendingTx === config.key} 
              />
            ))}
          </div>
        </div>
      </AdminSection>

      <AdminSection title="全局獎勵設定">
        <GlobalRewardSettings chainId={chainId} />
      </AdminSection>

      <AdminSection title="地城參數管理">
        <DungeonManager chainId={chainId} />
      </AdminSection>
      
      <AdminSection title="升星祭壇規則管理">
        <AltarRuleManager chainId={chainId} />
      </AdminSection>
      
      <AdminSection title="VIP 質押設定管理">
        <VipSettingsManager chainId={chainId} />
      </AdminSection>
      
      <AdminSection title="核心價格管理 (USD)">
        {parameterConfig.filter(p => p.unit === 'USD').map((p, index) => {
          const paramIndex = parameterConfig.findIndex(pc => pc.key === p.key);
          return (
            <SettingRow
              key={p.key}
              label={p.label}
              contract={p.contract}
              functionName={p.setter}
              readSource={`${p.contract.address}.${p.getter}()`}
              currentValue={params?.[paramIndex]?.result}
              isLoading={isLoadingParams}
              unit={p.unit}
              placeholders={p.placeholders}
            />
          );
        })}
      </AdminSection>

      <AdminSection title="平台費用管理 (BNB)">
        {parameterConfig.filter(p => p.unit === 'BNB').map((p, index) => {
          const paramIndex = parameterConfig.findIndex(pc => pc.key === p.key);
          return (
            <SettingRow
              key={p.key}
              label={p.label}
              contract={p.contract}
              functionName={p.setter}
              readSource={`${p.contract.address}.${p.getter}()`}
              currentValue={params?.[paramIndex]?.result}
              isLoading={isLoadingParams}
              unit={p.unit}
              placeholders={p.placeholders}
            />
          );
        })}
      </AdminSection>

      <AdminSection title="稅務與提現系統">
        {parameterConfig.filter(p => ['commissionRate'].includes(p.key)).map((p) => {
          const paramIndex = parameterConfig.findIndex(pc => pc.key === p.key);
          return (
            <SettingRow
              key={p.key}
              label={p.label}
              contract={p.contract}
              functionName={p.setter}
              readSource={`${p.contract.address}.${p.getter}()`}
              currentValue={params?.[paramIndex]?.result}
              isLoading={isLoadingParams}
              unit={p.unit}
              placeholders={p.placeholders}
            />
          );
        })}
        
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

      <AdminSection title="遊戲機制參數">
        {parameterConfig.filter(p => ['restDivisor', 'vipCooldown', 'globalRewardMultiplier'].includes(p.key)).map((p) => {
          const paramIndex = parameterConfig.findIndex(pc => pc.key === p.key);
          return (
            <SettingRow
              key={p.key}
              label={p.label}
              contract={p.contract}
              functionName={p.setter}
              readSource={`${p.contract.address}.${p.getter}()`}
              currentValue={params?.[paramIndex]?.result}
              isLoading={isLoadingParams}
              unit={p.unit}
              placeholders={p.placeholders}
            />
          );
        })}
      </AdminSection>

      <AdminSection title="Oracle 設定">
        {parameterConfig.filter(p => ['twapPeriod'].includes(p.key)).map((p) => {
          const paramIndex = parameterConfig.findIndex(pc => pc.key === p.key);
          return (
            <SettingRow
              key={p.key}
              label={p.label}
              contract={p.contract}
              functionName={p.setter}
              readSource={`${p.contract.address}.${p.getter}()`}
              currentValue={params?.[paramIndex]?.result}
              isLoading={isLoadingParams}
              unit={p.unit}
              placeholders={p.placeholders}
            />
          );
        })}
      </AdminSection>

      <AdminSection title="合約控制">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-4">
            <h4 className="text-lg font-semibold">合約暫停/恢復</h4>
            <div className="space-y-2">
              {['hero', 'relic', 'party', 'dungeonMaster', 'vipStaking'].map(contractName => {
                const contract = getContractWithABI(chainId, contractName);
                if (!contract) return null;
                
                return (
                  <div key={contractName} className="flex gap-2">
                    <ActionButton 
                      onClick={async () => {
                        try {
                          const hash = await contractCallWithRetry(
                            `pause_${contractName}`,
                            async () => {
                              return await writeContractAsync({ 
                                address: contract.address, 
                                abi: contract.abi, 
                                functionName: 'pause' 
                              });
                            }
                          );
                          addTransaction({ hash, description: `暫停 ${contractName} 合約` });
                          showToast(`${contractName} 合約已暫停`, 'success');
                          queryClient.invalidateQueries({ queryKey: ['contract-status'] });
                        } catch (error) {
                          const adminError = adminErrorHandler.handleError(error);
                          if (!adminError.details?.message?.includes('User rejected')) {
                            showToast(adminError.message, 'error');
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
                          const hash = await contractCallWithRetry(
                            `unpause_${contractName}`,
                            async () => {
                              return await writeContractAsync({ 
                                address: contract.address, 
                                abi: contract.abi, 
                                functionName: 'unpause' 
                              });
                            }
                          );
                          addTransaction({ hash, description: `恢復 ${contractName} 合約` });
                          showToast(`${contractName} 合約已恢復`, 'success');
                          queryClient.invalidateQueries({ queryKey: ['contract-status'] });
                        } catch (error) {
                          const adminError = adminErrorHandler.handleError(error);
                          if (!adminError.details?.message?.includes('User rejected')) {
                            showToast(adminError.message, 'error');
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
      <AdminSection title="RPC 監控系統">
        <RpcMonitoringPanel />
      </AdminSection>
      */}
    </>
  );
};

// 優化的管理員頁面主組件
const AdminPageOptimized: React.FC = () => {
  const { chainId } = useAccount();
  const isSupportedChain = (id: number | undefined): id is SupportedChainId => id === bsc.id;

  return (
    <ErrorBoundary>
      <section className="space-y-8">
        <div className="flex items-center justify-between">
          <h2 className="page-title">超級管理控制台 (優化版)</h2>
          <div className="text-sm text-gray-400">
            🚀 已啟用性能優化
          </div>
        </div>
        
        {isSupportedChain(chainId) ? (
          <AdminPageOptimizedContent chainId={chainId} />
        ) : (
          <EmptyState message="請連接到 BSC 主網以使用管理功能。" />
        )}
      </section>
    </ErrorBoundary>
  );
};

export default AdminPageOptimized;