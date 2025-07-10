// src/pages/AdminPage.tsx

import React, { useState, useMemo } from 'react';
import { useAccount, useReadContracts, useWriteContract, useReadContract } from 'wagmi';
import { formatEther, isAddress } from 'viem';
import type { ContractName } from '../config/contracts';
import { getContract, contracts as contractConfigs } from '../config/contracts';
import { useAppToast } from '../hooks/useAppToast';
import { ActionButton } from '../components/ui/ActionButton';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorBoundary } from '../components/ui/ErrorBoundary';
import { bsc } from 'wagmi/chains';
import { useTransactionStore } from '../stores/useTransactionStore';

// Import newly created admin components
import AdminSection from '../components/admin/AdminSection';
import ReadOnlyRow from '../components/admin/ReadOnlyRow';
import AddressSettingRow from '../components/admin/AddressSettingRow';
import SettingRow from '../components/admin/SettingRow';
import DungeonManager from '../components/admin/DungeonManager';
import AltarRuleManager from '../components/admin/AltarRuleManager';

type SupportedChainId = typeof bsc.id;
type Address = `0x${string}`;

// 開發者地址常量
const DEVELOPER_ADDRESS = '0x0000000000000000000000000000000000000000'; // 請替換為實際的開發者地址

const AdminPageContent: React.FC<{ chainId: SupportedChainId }> = ({ chainId }) => {
  const { address } = useAccount();
  const { showToast } = useAppToast();
  const { addTransaction } = useTransactionStore();
  const { writeContractAsync } = useWriteContract();
  
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [isBatchSetting, setIsBatchSetting] = useState(false);
  const [pendingTx, setPendingTx] = useState<string | null>(null);

  const setupConfig = useMemo(() => {
    const createSetting = (key: string, title: string, target: ContractName, setter: string, value: ContractName, getter: string) => ({ key, title, targetContractName: target, setterFunctionName: setter, valueToSetContractName: value, getterFunctionName: getter });
    return [
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
      createSetting('storageForDM', '在 DungeonMaster 中設定儲存', 'dungeonMaster', 'setDungeonStorage', 'dungeonStorage', 'dungeonStorage'),
      createSetting('logicForStorage', '在 DungeonStorage 中授權邏輯', 'dungeonStorage', 'setLogicContract', 'dungeonMaster', 'logicContract'),
      createSetting('dungeonCoreForProfile', '在 PlayerProfile 中設定總機', 'playerProfile', 'setDungeonCore', 'dungeonCore', 'dungeonCore'),
      createSetting('dungeonCoreForVip', '在 VIPStaking 中設定總機', 'vipStaking', 'setDungeonCore', 'dungeonCore', 'dungeonCore'),
      createSetting('dungeonCoreForAltar', '在 Altar 中設定總機', 'altarOfAscension', 'setDungeonCore', 'dungeonCore', 'dungeonCore'),
    ];
  }, [chainId]);

  const contractsToRead = useMemo(() => {
    const coreContract = getContract(chainId, 'dungeonCore');
    const configs = setupConfig.map(c => {
      const contract = getContract(chainId, c.targetContractName);
      if (!contract) return null;
      return { ...contract, functionName: c.getterFunctionName };
    });
    if (coreContract) {
      configs.unshift({ ...coreContract, functionName: 'owner' });
    }
    return configs.filter((c): c is NonNullable<typeof c> => c !== null && !!c.address);
  }, [chainId, setupConfig]);

  const { data: readResults, isLoading: isLoadingSettings } = useReadContracts({
    contracts: contractsToRead,
    query: { enabled: !!chainId && contractsToRead.length > 0 },
  });

  const currentAddressMap: Record<string, Address | undefined> = useMemo(() => {
    if (!readResults || !Array.isArray(readResults)) return {};
    const owner = readResults[0]?.result as Address | undefined;
    const settings = setupConfig.reduce((acc, config, index) => {
      acc[config.key] = readResults[index + 1]?.result as Address | undefined;
      return acc;
    }, {} as Record<string, Address | undefined>);
    return { owner, ...settings };
  }, [readResults, setupConfig]);
  
  const envAddressMap: Record<string, { name: ContractName, address?: Address }> = useMemo(() => {
    const getAddr = (name: ContractName) => ({ name, address: contractConfigs[chainId]?.[name]?.address });
    return setupConfig.reduce((acc, config) => {
      acc[config.key] = getAddr(config.valueToSetContractName);
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
    const contracts = {
      hero: getContract(chainId, 'hero'),
      relic: getContract(chainId, 'relic'),
      party: getContract(chainId, 'party'),
      dungeonMaster: getContract(chainId, 'dungeonMaster'),
      playerVault: getContract(chainId, 'playerVault'),
      vipStaking: getContract(chainId, 'vipStaking'),
    };
    const config = [
      { key: 'heroMintPrice', label: "英雄鑄造價", contract: contracts.hero, getter: 'mintPriceUSD', setter: 'setMintPriceUSD', unit: 'USD', placeholders: ['新價格 (USD)'] },
      { key: 'relicMintPrice', label: "聖物鑄造價", contract: contracts.relic, getter: 'mintPriceUSD', setter: 'setMintPriceUSD', unit: 'USD', placeholders: ['新價格 (USD)'] },
      { key: 'provisionPrice', label: "儲備購買價", contract: contracts.dungeonMaster, getter: 'provisionPriceUSD', setter: 'setProvisionPriceUSD', unit: 'USD', placeholders: ['新價格 (USD)'] },
      { key: 'heroFee', label: "英雄平台費", contract: contracts.hero, getter: 'platformFee', setter: 'setPlatformFee', unit: 'BNB', placeholders: ['新費用 (BNB)'] },
      { key: 'relicFee', label: "聖物平台費", contract: contracts.relic, getter: 'platformFee', setter: 'setPlatformFee', unit: 'BNB', placeholders: ['新費用 (BNB)'] },
      { key: 'partyFee', label: "隊伍平台費", contract: contracts.party, getter: 'platformFee', setter: 'setPlatformFee', unit: 'BNB', placeholders: ['新費用 (BNB)'] },
      { key: 'explorationFee', label: "遠征探索費", contract: contracts.dungeonMaster, getter: 'explorationFee', setter: 'setExplorationFee', unit: 'BNB', placeholders: ['新費用 (BNB)'] },
      { key: 'restDivisor', label: "休息成本係數", contract: contracts.dungeonMaster, getter: 'restCostPowerDivisor', setter: 'setRestCostPowerDivisor', unit: '無', placeholders: ['新係數 (戰力/USD)'] },
      { key: 'vipCooldown', label: "VIP 取消質押冷卻 (秒)", contract: contracts.vipStaking, getter: 'unstakeCooldown', setter: 'setUnstakeCooldown', unit: '無', placeholders: ['新冷卻時間 (秒)'] },
      { key: 'taxParams', label: "稅務參數", contract: contracts.playerVault, getter: 'standardInitialRate', setter: 'setTaxParameters', unit: '‱', placeholders: ['標準稅率 (‱)', '大額稅率 (‱)', '衰減率 (‱)', '週期(秒)'] },
      { key: 'commissionRate', label: "邀請佣金率", contract: contracts.playerVault, getter: 'commissionRate', setter: 'setCommissionRate', unit: '‱', placeholders: ['新佣金率 (萬分位)'] },
      { key: 'withdrawThresholds', label: "提現門檻 (USD)", contract: contracts.playerVault, getter: 'smallWithdrawThresholdUSD', setter: 'setWithdrawThresholds', unit: 'USD', placeholders: ['小額門檻 (USD)', '大額門檻 (USD)'] },
    ];
    return config.filter((c) => !!c.contract && !!c.contract.address) as ParameterConfigItem[];
  }, [chainId]);

  const { data: params, isLoading: isLoadingParams } = useReadContracts({
    contracts: parameterConfig.map(p => ({ ...p.contract, functionName: p.getter })),
    query: { enabled: parameterConfig.length > 0 }
  });

  const { data: largeThresholdData, isLoading: isLoadingLargeThreshold } = useReadContract({
    ...getContract(chainId, 'playerVault'),
    functionName: 'largeWithdrawThresholdUSD',
    query: { enabled: !!getContract(chainId, 'playerVault') }
  });

  const handleSet = async (key: string, targetContract: NonNullable<ReturnType<typeof getContract>>, functionName: string) => {
    const newAddress = inputs[key];
    if (!isAddress(newAddress)) { showToast('請輸入有效的地址', 'error'); return; }
    setPendingTx(key);
    try {
      const hash = await writeContractAsync({ address: targetContract.address, abi: targetContract.abi, functionName: functionName, args: [newAddress] });
      addTransaction({ hash, description: `管理員設定: ${key}` });
      showToast(`${key} 設定交易已送出`, 'success');
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
  };
  
  const handleFillFromEnv = () => {
    const definedEnvAddresses = Object.entries(envAddressMap)
      .filter(([, value]) => !!value.address)
      .reduce((acc, [key, value]) => { acc[key] = value.address!; return acc; }, {} as Record<string, string>);
    setInputs(prev => ({ ...prev, ...definedEnvAddresses }));
    showToast('已從 .env 設定檔載入所有地址！', 'info');
  };
  
  const ownerAddress = currentAddressMap.owner;
  if (isLoadingSettings || isLoadingParams || isLoadingLargeThreshold) {
    return <div className="flex justify-center items-center h-64"><LoadingSpinner /></div>;
  }

  // 優化權限檢查邏輯 - 允許開發者地址和合約擁有者訪問
  const isDeveloper = address?.toLowerCase() === DEVELOPER_ADDRESS.toLowerCase();
  const isOwner = ownerAddress && ownerAddress.toLowerCase() === address?.toLowerCase();
  
  if (!isDeveloper && !isOwner) {
    return <EmptyState message={`權限不足，僅合約擁有者可訪問。當前擁有者: ${ownerAddress ? `${ownerAddress.substring(0, 6)}...${ownerAddress.substring(ownerAddress.length - 4)}` : '載入中...'}`} />;
  }

  return (
    <>
      <AdminSection title="合約串接中心">
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
                onSet={() => handleSet(config.key, getContract(chainId, config.targetContractName)!, config.setterFunctionName)} 
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
                onSet={() => handleSet(config.key, getContract(chainId, config.targetContractName)!, config.setterFunctionName)} 
                isSetting={pendingTx === config.key} 
              />
            ))}
          </div>
        </div>
      </AdminSection>

      <AdminSection title="地城參數管理">
        <DungeonManager chainId={chainId} />
      </AdminSection>
      
      <AdminSection title="升星祭壇規則管理">
        <AltarRuleManager chainId={chainId} />
      </AdminSection>
      
      <AdminSection title="核心價格管理 (USD)">
        {parameterConfig.filter(p => p.unit === 'USD').map((p) => {
          const { key, setter, ...rest } = p;
          return (
            <SettingRow
              key={key}
              {...rest}
              functionName={setter}
              readSource={`${p.contract.address}.${p.getter}()`}
              currentValue={params?.[parameterConfig.findIndex(pc => pc.key === p.key)]?.result}
              isLoading={isLoadingParams}
            />
          );
        })}
      </AdminSection>

      <AdminSection title="平台費用管理 (BNB)">
        {parameterConfig.filter(p => p.unit === 'BNB').map((p) => {
          const { key, setter, ...rest } = p;
          return (
            <SettingRow
              key={key}
              {...rest}
              functionName={setter}
              readSource={`${p.contract.address}.${p.getter}()`}
              currentValue={params?.[parameterConfig.findIndex(pc => pc.key === p.key)]?.result}
              isLoading={isLoadingParams}
            />
          );
        })}
      </AdminSection>

      <AdminSection title="稅務與提現系統">
        {parameterConfig.filter(p => ['taxParams', 'commissionRate', 'withdrawThresholds'].includes(p.key)).map((p) => {
          const paramIndex = parameterConfig.findIndex(pc => pc.key === p.key);
          const currentValue = params?.[paramIndex]?.result;
          const { key, setter, ...rest } = p;
          if (p.key === 'withdrawThresholds') {
            return (
              <React.Fragment key={p.key}>
                <SettingRow
                  {...rest}
                  functionName={setter}
                  readSource={`${p.contract.address}.${p.getter}()`}
                  currentValue={currentValue}
                  isLoading={isLoadingParams}
                />
                <ReadOnlyRow label="當前大額門檻" value={`${formatEther(largeThresholdData as bigint ?? 0n)} USD`} isLoading={isLoadingLargeThreshold} />
              </React.Fragment>
            )
          }
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
      </AdminSection>

      <AdminSection title="遊戲機制參數">
        {parameterConfig.filter(p => ['restDivisor', 'vipCooldown'].includes(p.key)).map((p) => {
          const { key, setter, ...rest } = p;
          return (
            <SettingRow
              key={key}
              {...rest}
              functionName={setter}
              readSource={`${p.contract.address}.${p.getter}()`}
              currentValue={params?.[parameterConfig.findIndex(pc => pc.key === p.key)]?.result}
              isLoading={isLoadingParams}
            />
          );
        })}
      </AdminSection>
    </>
  );
};

const AdminPage: React.FC = () => {
  const { chainId } = useAccount();
  const isSupportedChain = (id: number | undefined): id is SupportedChainId => id === bsc.id;

  return (
    <ErrorBoundary>
      <section className="space-y-8">
        <h2 className="page-title">超級管理控制台</h2>
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
