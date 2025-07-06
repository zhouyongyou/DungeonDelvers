// src/pages/AdminPage.tsx (已修復)

import React, { useState, useMemo, useEffect, type ReactNode } from 'react';
import { useAccount, useReadContracts, useWriteContract, useReadContract } from 'wagmi';
import { parseEther, formatEther, type Address, type Abi, isAddress } from 'viem';
import { getContract, type ContractName, contracts as contractConfigs } from '../config/contracts';
import { useAppToast } from '../hooks/useAppToast';
import { ActionButton } from '../components/ui/ActionButton';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { EmptyState } from '../components/ui/EmptyState';
import { bsc, bscTestnet } from 'wagmi/chains';
import { useTransactionStore } from '../stores/useTransactionStore';

type SupportedChainId = typeof bsc.id | typeof bscTestnet.id;

// =================================================================
// Section: 可重用的 UI 子元件
// =================================================================

const AdminSection: React.FC<{ title: string; children: ReactNode }> = ({ title, children }) => (
    <div className="card-bg p-6 rounded-2xl shadow-lg">
        <h3 className="section-title border-b border-gray-700 pb-2 mb-4">{title}</h3>
        <div className="space-y-4">{children}</div>
    </div>
);

const ReadOnlyRow: React.FC<{ label: string; value?: string; isLoading?: boolean }> = ({ label, value, isLoading }) => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
        <label className="text-gray-300 md:col-span-1">{label}</label>
        <div className="font-mono text-sm bg-black/20 p-2 rounded md:col-span-2 break-all">
            {isLoading ? <LoadingSpinner size="h-4 w-4" /> : <span className="text-cyan-400">{value ?? 'N/A'}</span>}
        </div>
    </div>
);

const AddressSettingRow: React.FC<{ title: string; description: string; readSource: string; currentAddress?: Address; envAddress?: Address; envContractName?: string; isLoading: boolean; inputValue: string; onInputChange: (value: string) => void; onSet: () => Promise<void>; isSetting: boolean; }> = ({ title, description, readSource, currentAddress, envAddress, envContractName, isLoading, inputValue, onInputChange, onSet, isSetting }) => {
    const isConfigured = currentAddress && currentAddress !== '0x0000000000000000000000000000000000000000';
    const isEnvSet = envAddress && envAddress !== '0x0000000000000000000000000000000000000000';
    const isMatched = isConfigured && isEnvSet && currentAddress?.toLowerCase() === envAddress?.toLowerCase();

    return (
        <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700 space-y-2">
            <div>
                <h4 className="font-bold text-white">{title}</h4>
                <p className="text-xs text-gray-400">{description}</p>
            </div>
            <div className="text-xs font-mono grid grid-cols-[90px_1fr_20px] items-center gap-x-2">
                <span className="text-gray-400">應為 (.env):</span>
                {isEnvSet ? (
                    <span className="text-blue-400 truncate" title={envAddress}>{envContractName} ({envAddress})</span>
                ) : (
                    <span className="text-red-400 col-span-2">尚未在 .env 中設定 {envContractName}</span>
                )}
            </div>
            <div className="text-xs font-mono grid grid-cols-[90px_1fr_20px] items-center gap-x-2">
                <span className="text-gray-400" title={`讀取來源: ${readSource}`}>鏈上當前:</span>
                {isLoading ? <LoadingSpinner size="h-3 w-3" /> : (
                    <>
                        <span className={`${isConfigured ? 'text-green-400' : 'text-yellow-400'} truncate`} title={currentAddress}>
                            {currentAddress || '尚未設定'}
                        </span>
                        {isEnvSet && isConfigured && (
                            isMatched ? (
                                <span title="匹配" className="text-green-400">✅</span>
                            ) : (
                                <span title="不匹配" className="text-yellow-400">⚠️</span>
                            )
                        )}
                    </>
                )}
            </div>
            <div className="flex gap-2 pt-2">
                <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => onInputChange(e.target.value)}
                    placeholder="貼上新的合約地址"
                    className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500 outline-none h-10 bg-gray-900 border-gray-600 text-sm font-mono"
                />
                <ActionButton onClick={onSet} isLoading={isSetting} className="px-4 h-10 whitespace-nowrap">設定</ActionButton>
            </div>
        </div>
    );
};

const SettingRow: React.FC<{ label: string; readSource: string; contract: NonNullable<ReturnType<typeof getContract>>; functionName: string; currentValue?: any; isLoading: boolean; isEther?: boolean; isBasisPoints?: boolean; placeholders?: string[]; }> = ({ label, readSource, contract, functionName, currentValue, isLoading, isEther = false, isBasisPoints = false, placeholders = ['輸入新值'] }) => {
    const [inputValues, setInputValues] = useState<string[]>(new Array(placeholders.length).fill(''));
    const { showToast } = useAppToast();
    const { writeContractAsync, isPending } = useWriteContract();

    const handleUpdate = async () => {
        if (inputValues.some(v => !v)) return;
        try {
            const valuesToSet = inputValues.map((val, index) => {
                if (placeholders[index]?.toLowerCase().includes('usd')) return parseEther(val);
                if (placeholders[index]?.toLowerCase().includes('bnb')) return parseEther(val);
                return BigInt(val);
            });
            await writeContractAsync({ address: contract.address, abi: contract.abi as Abi, functionName, args: valuesToSet });
            showToast(`${label} 更新成功！`, 'success');
        } catch (e: any) {
            showToast(e.shortMessage || "更新失敗", "error");
        }
    };
    
    const displayValue = isLoading ? <LoadingSpinner size="h-4 w-4" /> : currentValue === undefined || currentValue === null ? 'N/A' : isEther ? `${formatEther(currentValue ?? 0n)}` : isBasisPoints ? `${(Number(currentValue ?? 0n) / 100).toFixed(2)}%` : currentValue.toString();

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            <label className="text-gray-300 md:col-span-1" title={`讀取來源: ${readSource}`}>{label}</label>
            <div className="font-mono text-sm bg-black/20 p-2 rounded md:col-span-1 break-all">
                當前值: <span className="text-yellow-400">{displayValue}</span>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 md:col-span-1">
                {inputValues.map((val, index) => (
                    <input key={index} type="text" value={val} onChange={(e) => { const newValues = [...inputValues]; newValues[index] = e.target.value; setInputValues(newValues); }} className="input-field w-full" placeholder={placeholders[index]} />
                ))}
                <ActionButton onClick={handleUpdate} isLoading={isPending} className="h-10 w-full sm:w-24">更新</ActionButton>
            </div>
        </div>
    );
};

// =================================================================
// Section: 複雜參數管理元件
// =================================================================

const DungeonManager: React.FC<{ chainId: SupportedChainId }> = ({ chainId }) => {
    const { showToast } = useAppToast();
    const { writeContractAsync } = useWriteContract();
    const [pendingDungeon, setPendingDungeon] = useState<number | null>(null);
    const dungeonMasterContract = getContract(chainId, 'dungeonMaster');
    const dungeonStorageContract = getContract(chainId, 'dungeonStorage');
    
    const { data: dungeonsData, isLoading, refetch } = useReadContracts({
        contracts: Array.from({ length: 10 }, (_, i) => ({ ...dungeonStorageContract, functionName: 'getDungeon', args: [BigInt(i + 1)] })),
        query: { enabled: !!dungeonStorageContract }
    });

    const [dungeonInputs, setDungeonInputs] = useState<Record<number, { requiredPower: string; rewardAmountUSD: string; baseSuccessRate: string }>>({});

    useEffect(() => {
        if (dungeonsData) {
            const initialInputs: Record<number, any> = {};
            dungeonsData.forEach((d, i) => {
                if (d.status === 'success' && Array.isArray(d.result)) {
                    const [requiredPower, rewardAmountUSD, baseSuccessRate] = d.result as [bigint, bigint, number];
                    initialInputs[i + 1] = { requiredPower: requiredPower.toString(), rewardAmountUSD: formatEther(rewardAmountUSD), baseSuccessRate: baseSuccessRate.toString() };
                }
            });
            setDungeonInputs(initialInputs);
        }
    }, [dungeonsData]);
    
    const handleInputChange = (id: number, field: string, value: string) => setDungeonInputs(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }));

    const handleUpdateDungeon = async (id: number) => {
        if (!dungeonMasterContract) return;
        setPendingDungeon(id);
        const inputs = dungeonInputs[id];
        try {
            await writeContractAsync({
                address: dungeonMasterContract.address,
                abi: dungeonMasterContract.abi as Abi,
                functionName: 'adminSetDungeon', 
                args: [ BigInt(id), BigInt(inputs.requiredPower), parseEther(inputs.rewardAmountUSD), BigInt(inputs.baseSuccessRate) ],
            });
            showToast(`地城 #${id} 更新成功！`, 'success');
            setTimeout(() => refetch(), 2000);
        } catch (e: any) {
            showToast(e.shortMessage || `地城 #${id} 更新失敗`, "error");
        } finally {
            setPendingDungeon(null);
        }
    };

    if (isLoading) return <LoadingSpinner />;

    return (
        <div className="space-y-4">
            {dungeonsData?.map((d, i) => {
                const dungeonId = i + 1;
                if (d.status !== 'success' || !d.result) return <div key={dungeonId}>地城 #{dungeonId}: 讀取失敗</div>;
                const inputs = dungeonInputs[dungeonId] || { requiredPower: '', rewardAmountUSD: '', baseSuccessRate: '' };
                return (
                    <div key={dungeonId} className="p-4 bg-black/20 rounded-lg space-y-2">
                        <h4 className="font-bold text-lg text-yellow-400">地城 #{dungeonId}</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-end">
                            <input type="text" value={inputs.requiredPower} onChange={e => handleInputChange(dungeonId, 'requiredPower', e.target.value)} placeholder="要求戰力" className="input-field" />
                            <input type="text" value={inputs.rewardAmountUSD} onChange={e => handleInputChange(dungeonId, 'rewardAmountUSD', e.target.value)} placeholder="獎勵 (USD)" className="input-field" />
                            <input type="text" value={inputs.baseSuccessRate} onChange={e => handleInputChange(dungeonId, 'baseSuccessRate', e.target.value)} placeholder="成功率 (%)" className="input-field" />
                            <ActionButton onClick={() => handleUpdateDungeon(dungeonId)} isLoading={pendingDungeon === dungeonId} className="h-10">更新</ActionButton>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

const AltarRuleManager: React.FC<{ chainId: SupportedChainId }> = ({ chainId }) => {
    const { showToast } = useAppToast();
    const { writeContractAsync } = useWriteContract();
    const [pendingRule, setPendingRule] = useState<number | null>(null);
    const altarContract = getContract(chainId, 'altarOfAscension');

    const { data: rulesData, isLoading, refetch } = useReadContracts({
        contracts: Array.from({ length: 4 }, (_, i) => ({ ...altarContract, functionName: 'upgradeRules', args: [i + 1] })),
        query: { enabled: !!altarContract }
    });

    const [ruleInputs, setRuleInputs] = useState<Record<number, { materialsRequired: string; nativeFee: string; greatSuccessChance: string; successChance: string; partialFailChance: string; }>>({});

    useEffect(() => {
        if (rulesData) {
            const initialInputs: Record<number, any> = {};
            rulesData.forEach((d, i) => {
                if (d.status === 'success' && Array.isArray(d.result)) {
                    const [materialsRequired, nativeFee, greatSuccessChance, successChance, partialFailChance] = d.result as [number, bigint, number, number, number];
                    if (materialsRequired !== undefined) {
                        initialInputs[i + 1] = { materialsRequired: materialsRequired.toString(), nativeFee: formatEther(nativeFee), greatSuccessChance: greatSuccessChance.toString(), successChance: successChance.toString(), partialFailChance: partialFailChance.toString() };
                    }
                }
            });
            setRuleInputs(initialInputs);
        }
    }, [rulesData]);

    const handleInputChange = (id: number, field: string, value: string) => setRuleInputs(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }));

    const handleUpdateRule = async (id: number) => {
        if (!altarContract) return;
        setPendingRule(id);
        const inputs = ruleInputs[id];
        try {
            await writeContractAsync({
                address: altarContract.address,
                abi: altarContract.abi as Abi,
                functionName: 'setUpgradeRule',
                args: [ id, { materialsRequired: Number(inputs.materialsRequired), nativeFee: parseEther(inputs.nativeFee), greatSuccessChance: Number(inputs.greatSuccessChance), successChance: Number(inputs.successChance), partialFailChance: Number(inputs.partialFailChance) } ],
            });
            showToast(`升星規則 #${id} 更新成功！`, 'success');
            setTimeout(() => refetch(), 2000);
        } catch (e: any) {
            showToast(e.shortMessage || `規則 #${id} 更新失敗`, "error");
        } finally {
            setPendingRule(null);
        }
    };

    if (isLoading) return <LoadingSpinner />;

    return (
        <div className="space-y-3">
            {rulesData?.map((d, i) => {
                const ruleId = i + 1;
                if (d.status !== 'success' || !d.result) return <div key={ruleId}>規則 #{ruleId}: 讀取失敗</div>;
                const inputs = ruleInputs[ruleId] || { materialsRequired: '', nativeFee: '', greatSuccessChance: '', successChance: '', partialFailChance: '' };
                return (
                    <details key={ruleId} className="p-3 bg-black/20 rounded-lg" open>
                        <summary className="font-bold text-lg text-yellow-400 cursor-pointer">升 {ruleId + 1}★ 規則</summary>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-end pt-2">
                            <input type="text" value={inputs.materialsRequired} onChange={e => handleInputChange(ruleId, 'materialsRequired', e.target.value)} placeholder="材料數量" className="input-field" />
                            <input type="text" value={inputs.nativeFee} onChange={e => handleInputChange(ruleId, 'nativeFee', e.target.value)} placeholder="費用 (BNB)" className="input-field" />
                            <input type="text" value={inputs.greatSuccessChance} onChange={e => handleInputChange(ruleId, 'greatSuccessChance', e.target.value)} placeholder="大成功率 (%)" className="input-field" />
                            <input type="text" value={inputs.successChance} onChange={e => handleInputChange(ruleId, 'successChance', e.target.value)} placeholder="成功率 (%)" className="input-field" />
                            <input type="text" value={inputs.partialFailChance} onChange={e => handleInputChange(ruleId, 'partialFailChance', e.target.value)} placeholder="部分失敗率 (%)" className="input-field" />
                            <ActionButton onClick={() => handleUpdateRule(ruleId)} isLoading={pendingRule === ruleId} className="h-10">更新</ActionButton>
                        </div>
                    </details>
                );
            })}
        </div>
    );
};


// =================================================================
// Section: AdminPageContent (核心邏輯元件)
// =================================================================

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
        isEther?: boolean;
        isBasisPoints?: boolean;
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
            { key: 'heroMintPrice', label: "英雄鑄造價", contract: contracts.hero, getter: 'mintPriceUSD', setter: 'setMintPriceUSD', isEther: true, placeholders: ['新價格 (USD)'] },
            { key: 'relicMintPrice', label: "聖物鑄造價", contract: contracts.relic, getter: 'mintPriceUSD', setter: 'setMintPriceUSD', isEther: true, placeholders: ['新價格 (USD)'] },
            { key: 'provisionPrice', label: "儲備購買價", contract: contracts.dungeonMaster, getter: 'provisionPriceUSD', setter: 'setProvisionPriceUSD', isEther: true, placeholders: ['新價格 (USD)'] },
            { key: 'heroFee', label: "英雄平台費", contract: contracts.hero, getter: 'platformFee', setter: 'setPlatformFee', isEther: true, placeholders: ['新費用 (BNB)'] },
            { key: 'relicFee', label: "聖物平台費", contract: contracts.relic, getter: 'platformFee', setter: 'setPlatformFee', isEther: true, placeholders: ['新費用 (BNB)'] },
            { key: 'partyFee', label: "隊伍平台費", contract: contracts.party, getter: 'platformFee', setter: 'setPlatformFee', isEther: true, placeholders: ['新費用 (BNB)'] },
            { key: 'explorationFee', label: "遠征探索費", contract: contracts.dungeonMaster, getter: 'explorationFee', setter: 'setExplorationFee', isEther: true, placeholders: ['新費用 (BNB)'] },
            { key: 'restDivisor', label: "休息成本係數", contract: contracts.dungeonMaster, getter: 'restCostPowerDivisor', setter: 'setRestCostPowerDivisor', placeholders: ['新係數 (戰力/USD)'] },
            { key: 'vipCooldown', label: "VIP 取消質押冷卻 (秒)", contract: contracts.vipStaking, getter: 'unstakeCooldown', setter: 'setUnstakeCooldown', placeholders: ['新冷卻時間 (秒)'] },
            { key: 'taxParams', label: "稅務參數", contract: contracts.playerVault, getter: 'standardInitialRate', setter: 'setTaxParameters', isBasisPoints: true, placeholders: ['標準稅率 (‱)', '大額稅率 (‱)', '衰減率 (‱)', '週期(秒)'] },
            { key: 'commissionRate', label: "邀請佣金率", contract: contracts.playerVault, getter: 'commissionRate', setter: 'setCommissionRate', isBasisPoints: true, placeholders: ['新佣金率 (萬分位)'] },
            { key: 'withdrawThresholds', label: "提現門檻 (USD)", contract: contracts.playerVault, getter: 'smallWithdrawThresholdUSD', setter: 'setWithdrawThresholds', isEther: true, placeholders: ['小額門檻 (USD)', '大額門檻 (USD)'] },
        ];
        return config.filter((c): c is ParameterConfigItem => !!c.contract && !!c.contract.address);
    }, [chainId]);

    const { data: params, isLoading: isLoadingParams } = useReadContracts({
        contracts: parameterConfig.map(p => ({ ...p.contract, functionName: p.getter })) as any,
        query: { enabled: parameterConfig.length > 0 }
    });

    const { data: largeThresholdData, isLoading: isLoadingLargeThreshold } = useReadContract({
        ...getContract(chainId, 'playerVault'),
        functionName: 'largeWithdrawThresholdUSD',
        query: { enabled: !!getContract(chainId, 'playerVault') }
    });

    const handleSet = async (key: string, targetContract: any, functionName: string) => {
        const newAddress = inputs[key];
        if (!isAddress(newAddress)) { showToast('請輸入有效的地址', 'error'); return; }
        setPendingTx(key);
        try {
            const hash = await writeContractAsync({ address: targetContract.address, abi: targetContract.abi, functionName: functionName, args: [newAddress] });
            addTransaction({ hash, description: `管理員設定: ${key}` });
            showToast(`${key} 設定交易已送出`, 'success');
        } catch (e: any) {
            if (!e.message.includes('User rejected')) { showToast(e.shortMessage || `設定 ${key} 失敗`, 'error'); }
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

    if (ownerAddress && ownerAddress.toLowerCase() !== address?.toLowerCase()) {
        return <EmptyState message="權限不足，僅合約擁有者可訪問。" />;
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
                            <AddressSettingRow key={config.key} title={config.title} description={`在 ${config.targetContractName} 中設定 ${config.valueToSetContractName}`} readSource={`${config.targetContractName}.${config.getterFunctionName}()`} currentAddress={currentAddressMap[config.key]} envAddress={envAddressMap[config.key]?.address} envContractName={envAddressMap[config.key]?.name} isLoading={isLoadingSettings} inputValue={inputs[config.key] || ''} onInputChange={(val) => setInputs(prev => ({ ...prev, [config.key]: val }))} onSet={() => handleSet(config.key, getContract(chainId, config.targetContractName)!, config.setterFunctionName)} isSetting={pendingTx === config.key} />
                        ))}
                    </div>
                    <div className="space-y-4">
                        <h4 className="text-xl font-semibold text-center">各模組回連設定</h4>
                        {setupConfig.slice(9).map(config => (
                            <AddressSettingRow key={config.key} title={config.title} description={`在 ${config.targetContractName} 中設定 ${config.valueToSetContractName}`} readSource={`${config.targetContractName}.${config.getterFunctionName}()`} currentAddress={currentAddressMap[config.key]} envAddress={envAddressMap[config.key]?.address} envContractName={envAddressMap[config.key]?.name} isLoading={isLoadingSettings} inputValue={inputs[config.key] || ''} onInputChange={(val) => setInputs(prev => ({ ...prev, [config.key]: val }))} onSet={() => handleSet(config.key, getContract(chainId, config.targetContractName)!, config.setterFunctionName)} isSetting={pendingTx === config.key} />
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
                {parameterConfig.filter(p => p.label.includes('價')).map((p) => {
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
                 {parameterConfig.filter(p => p.label.includes('費')).map((p) => {
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


// =================================================================
// Section: AdminPage (入口元件)
// =================================================================

const AdminPage: React.FC = () => {
    const { chainId } = useAccount();
    const isSupportedChain = (id: number | undefined): id is SupportedChainId => id === bsc.id || id === bscTestnet.id;

    return (
        <section className="space-y-8">
            <h2 className="page-title">超級管理控制台</h2>
            {isSupportedChain(chainId) ? (
                <AdminPageContent chainId={chainId} />
            ) : (
                <EmptyState message="請連接到支援的網路 (BSC 或 BSC 測試網)。" />
            )}
        </section>
    );
};

export default AdminPage;