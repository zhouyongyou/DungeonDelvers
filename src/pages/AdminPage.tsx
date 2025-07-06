import React, { useState, type ReactNode } from 'react';
import { useAccount, useReadContract, useReadContracts, useWriteContract } from 'wagmi';
import { parseEther, formatEther, type Address, type Abi } from 'viem';
import { getContract } from '../config/contracts';
import { useAppToast } from '../hooks/useAppToast';
import { ActionButton } from '../components/ui/ActionButton';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { EmptyState } from '../components/ui/EmptyState';
import { bsc, bscTestnet } from 'wagmi/chains'; // 導入支援的鏈

// =================================================================
// Section: 可重用的管理介面子元件
// =================================================================

// AdminSection: 為每個管理區塊提供統一的卡片樣式
const AdminSection: React.FC<{ title: string; children: ReactNode }> = ({ title, children }) => (
    <div className="card-bg p-6 rounded-2xl shadow-lg">
        <h3 className="section-title border-b border-gray-700 pb-2 mb-4">{title}</h3>
        <div className="space-y-4">{children}</div>
    </div>
);

// SettingRow: 處理單個設定項的顯示、輸入和更新邏輯
interface SettingRowProps {
  label: string;
  contract: ReturnType<typeof getContract>;
  functionName: string;
  currentValue?: any;
  isLoading: boolean;
  isAddress?: boolean;
  isEther?: boolean;
  isBasisPoints?: boolean; // 用於顯示萬分位 (%)
  args?: any[]; // 支援多參數的函式
}

const SettingRow: React.FC<SettingRowProps> = ({ label, contract, functionName, currentValue, isLoading, isAddress = false, isEther = false, isBasisPoints = false, args = [] }) => {
    const [inputValues, setInputValues] = useState<string[]>(new Array(args.length || 1).fill(''));
    const { showToast } = useAppToast();
    const { writeContractAsync, isPending } = useWriteContract();

    const handleUpdate = async () => {
        if (inputValues.some(v => !v) || !contract) return;
        try {
            const valuesToSet = inputValues.map((val, index) => {
                const argType = (isAddress && index === 0) ? 'address' : (isEther && index === 0) ? 'ether' : 'bigint';
                if (argType === 'ether') return parseEther(val);
                if (argType === 'bigint') return BigInt(val);
                return val as Address; // address
            });

            await writeContractAsync({
                address: contract.address,
                abi: contract.abi as Abi,
                functionName,
                args: valuesToSet,
            });
            showToast(`${label} 更新成功！`, 'success');
        } catch (e: any) {
            showToast(e.shortMessage || "更新失敗", "error");
        }
    };
    
    const displayValue = isLoading
        ? <LoadingSpinner size="h-4 w-4" />
        : isEther ? `${formatEther(currentValue ?? 0n)} BNB` 
        : isBasisPoints ? `${(Number(currentValue ?? 0n) / 100).toFixed(2)}%`
        : (currentValue?.toString() ?? 'N/A');

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            <label className="text-gray-300 md:col-span-1">{label}</label>
            <div className="font-mono text-sm bg-black/20 p-2 rounded md:col-span-1 break-all">
                當前值: <span className="text-yellow-400">{displayValue}</span>
            </div>
            <div className="flex gap-2 md:col-span-1">
                {inputValues.map((val, index) => (
                    <input
                        key={index}
                        type="text"
                        value={val}
                        onChange={(e) => {
                            const newValues = [...inputValues];
                            newValues[index] = e.target.value;
                            setInputValues(newValues);
                        }}
                        className="input-field w-full"
                        placeholder={args[index] || `輸入新值`}
                    />
                ))}
                <ActionButton onClick={handleUpdate} isLoading={isPending} className="h-10 w-24">更新</ActionButton>
            </div>
        </div>
    );
};

// =================================================================
// Section: AdminPage 主元件
// =================================================================

const AdminPage: React.FC = () => {
    const { address, chainId } = useAccount();

    // ★ 核心修正: 在元件頂部加入型別防衛
    if (!chainId || (chainId !== bsc.id && chainId !== bscTestnet.id)) {
        return (
            <section className="space-y-8">
                <h2 className="page-title">遊戲管理控制台</h2>
                <div className="card-bg p-10 rounded-xl text-center text-gray-400">
                    <p>請先連接到支援的網路 (BSC 或 BSC 測試網) 並使用管理員帳號。</p>
                </div>
            </section>
        );
    }

    const dungeonCoreContract = getContract(chainId, 'dungeonCore');
    const heroContract = getContract(chainId, 'hero');
    const relicContract = getContract(chainId, 'relic');
    const partyContract = getContract(chainId, 'party');
    const dungeonMasterContract = getContract(chainId, 'dungeonMaster');
    const playerVaultContract = getContract(chainId, 'playerVault');

    const { data: owner, isLoading: isLoadingOwner } = useReadContract({
        ...dungeonCoreContract,
        functionName: 'owner',
        query: { enabled: !!dungeonCoreContract },
    });

    const { data: params, isLoading: isLoadingParams } = useReadContracts({
        contracts: [
            { ...heroContract, functionName: 'platformFee' },
            { ...relicContract, functionName: 'platformFee' },
            { ...partyContract, functionName: 'platformFee' },
            { ...dungeonMasterContract, functionName: 'restCostPowerDivisor' },
            { ...playerVaultContract, functionName: 'standardInitialRate' },
            { ...playerVaultContract, functionName: 'largeWithdrawInitialRate' },
            { ...playerVaultContract, functionName: 'decreaseRatePerPeriod' },
            { ...playerVaultContract, functionName: 'commissionRate' },
        ],
        query: { enabled: !!address && owner === address && !!heroContract && !!relicContract && !!partyContract && !!dungeonMasterContract && !!playerVaultContract }
    });

    if (isLoadingOwner) {
        return <div className="flex justify-center items-center h-64"><LoadingSpinner /></div>;
    }

    if (owner?.toLowerCase() !== address?.toLowerCase()) {
        return <EmptyState message="權限不足" />;
    }

    const [heroFee, relicFee, partyFee, restDivisor, standardRate, largeRate, decreaseRate, commissionRate] = params?.map(p => p.result) ?? [];

    return (
        <section className="space-y-8">
            <h2 className="page-title">遊戲管理控制台</h2>
            
            <AdminSection title="費用管理">
                <SettingRow label="英雄鑄造費" contract={heroContract} functionName="setPlatformFee" currentValue={heroFee} isLoading={isLoadingParams} isEther args={['新費用 (BNB)']} />
                <SettingRow label="聖物鑄造費" contract={relicContract} functionName="setPlatformFee" currentValue={relicFee} isLoading={isLoadingParams} isEther args={['新費用 (BNB)']} />
                <SettingRow label="隊伍創建費" contract={partyContract} functionName="setPlatformFee" currentValue={partyFee} isLoading={isLoadingParams} isEther args={['新費用 (BNB)']} />
            </AdminSection>

            <AdminSection title="遊戲參數管理">
                <SettingRow label="休息成本係數" contract={dungeonMasterContract} functionName="setRestCostPowerDivisor" currentValue={restDivisor} isLoading={isLoadingParams} args={['新係數']} />
            </AdminSection>
            
            <AdminSection title="稅務系統管理">
                <SettingRow label="標準初始稅率" contract={playerVaultContract} functionName="setStandardInitialRate" currentValue={standardRate} isLoading={isLoadingParams} isBasisPoints args={['新稅率 (萬分位)']} />
                <SettingRow label="大額初始稅率" contract={playerVaultContract} functionName="setLargeWithdrawInitialRate" currentValue={largeRate} isLoading={isLoadingParams} isBasisPoints args={['新稅率 (萬分位)']} />
                <SettingRow label="每日衰減率" contract={playerVaultContract} functionName="setDecreaseRatePerPeriod" currentValue={decreaseRate} isLoading={isLoadingParams} isBasisPoints args={['新衰減率 (萬分位)']} />
                <SettingRow label="邀請佣金率" contract={playerVaultContract} functionName="setCommissionRate" currentValue={commissionRate} isLoading={isLoadingParams} isBasisPoints args={['新佣金率 (萬分位)']} />
            </AdminSection>

             <AdminSection title="合約地址管理 (DungeonCore)">
                <p className="text-sm text-gray-500 -mt-2 mb-4">管理 DungeonCore 所依賴的其他合約地址。</p>
                <SettingRow label="設定 Oracle 地址" contract={dungeonCoreContract} functionName="setOracle" isLoading={false} isAddress args={['新地址']} />
                <SettingRow label="設定 PlayerVault 地址" contract={dungeonCoreContract} functionName="setPlayerVault" isLoading={false} isAddress args={['新地址']} />
                <SettingRow label="設定 DungeonMaster 地址" contract={dungeonCoreContract} functionName="setDungeonMaster" isLoading={false} isAddress args={['新地址']} />
            </AdminSection>

        </section>
    );
};

export default AdminPage;
