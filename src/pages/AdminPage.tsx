import React, { useState, type ReactNode } from 'react';
import { useAccount, useReadContract, useWriteContract } from 'wagmi';
import { parseEther, formatEther, type Address, type Abi } from 'viem';
import { getContract } from '../config/contracts';
import { useAppToast } from '../hooks/useAppToast';
import { ActionButton } from '../components/ui/ActionButton';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { EmptyState } from '../components/ui/EmptyState';
import { Icons } from '../components/ui/icons';

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
  currentValue: any;
  isLoading: boolean;
  isAddress?: boolean;
  isEther?: boolean;
}

const SettingRow: React.FC<SettingRowProps> = ({ label, contract, functionName, currentValue, isLoading, isAddress = false, isEther = false }) => {
    const [inputValue, setInputValue] = useState('');
    const { showToast } = useAppToast();
    const { writeContractAsync, isPending } = useWriteContract();

    const handleUpdate = async () => {
        if (!inputValue || !contract) return;
        try {
            let valueToSet: any = inputValue;
            if (isEther) valueToSet = parseEther(inputValue);
            else if (!isAddress) valueToSet = BigInt(inputValue);

            await writeContractAsync({
                address: contract.address,
                abi: contract.abi as Abi,
                functionName,
                args: [valueToSet],
            });
            showToast(`${label} 更新成功！`, 'success');
        } catch (e: any) {
            showToast(e.shortMessage || "更新失敗", "error");
        }
    };
    
    const displayValue = isLoading
        ? <LoadingSpinner size="h-4 w-4" />
        : isEther ? `${formatEther(currentValue ?? 0n)} BNB` : (currentValue?.toString() ?? 'N/A');

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            <label className="text-gray-300 md:col-span-1">{label}</label>
            <div className="font-mono text-sm bg-black/20 p-2 rounded md:col-span-1 break-all">
                當前值: <span className="text-yellow-400">{displayValue}</span>
            </div>
            <div className="flex gap-2 md:col-span-1">
                <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    className="input-field w-full"
                    placeholder={`輸入新的 ${label}`}
                />
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
    const dungeonCoreContract = getContract(chainId, 'dungeonCore');
    const heroContract = getContract(chainId, 'hero');
    const relicContract = getContract(chainId, 'relic');
    const partyContract = getContract(chainId, 'party');
    const dungeonMasterContract = getContract(chainId, 'dungeonMaster');

    // 檢查當前用戶是否為合約擁有者
    const { data: owner, isLoading: isLoadingOwner } = useReadContract({
        ...dungeonCoreContract,
        functionName: 'owner',
        query: { enabled: !!dungeonCoreContract },
    });

    // 讀取所有需要管理的參數
    const { data: heroFee } = useReadContract({ ...heroContract, functionName: 'platformFee' });
    const { data: relicFee } = useReadContract({ ...relicContract, functionName: 'platformFee' });
    const { data: partyFee } = useReadContract({ ...partyContract, functionName: 'platformFee' });
    const { data: restCostDivisor } = useReadContract({ ...dungeonMasterContract, functionName: 'restCostPowerDivisor' });

    if (isLoadingOwner) {
        return <div className="flex justify-center items-center h-64"><LoadingSpinner /></div>;
    }

    if (owner?.toLowerCase() !== address?.toLowerCase()) {
        return <EmptyState message="權限不足" description="只有合約擁有者才能訪問此頁面。" />;
    }

    return (
        <section className="space-y-8">
            <h2 className="page-title">遊戲管理控制台</h2>
            
            <AdminSection title="費用管理">
                <SettingRow label="英雄鑄造費" contract={heroContract} functionName="setPlatformFee" currentValue={heroFee} isLoading={!heroFee} isEther />
                <SettingRow label="聖物鑄造費" contract={relicContract} functionName="setPlatformFee" currentValue={relicFee} isLoading={!relicFee} isEther />
                <SettingRow label="隊伍創建費" contract={partyContract} functionName="setPlatformFee" currentValue={partyFee} isLoading={!partyFee} isEther />
            </AdminSection>

            <AdminSection title="遊戲參數管理">
                <SettingRow label="休息成本係數" contract={dungeonMasterContract} functionName="setRestCostPowerDivisor" currentValue={restCostDivisor} isLoading={!restCostDivisor} />
            </AdminSection>

            <AdminSection title="合約地址管理 (DungeonCore)">
                <p className="text-sm text-gray-500 -mt-2 mb-4">管理 DungeonCore 所依賴的其他合約地址。</p>
                <SettingRow label="Oracle 地址" contract={dungeonCoreContract} functionName="setOracle" currentValue={undefined} isLoading={false} isAddress />
                <SettingRow label="PlayerVault 地址" contract={dungeonCoreContract} functionName="setPlayerVault" currentValue={undefined} isLoading={false} isAddress />
                <SettingRow label="DungeonMaster 地址" contract={dungeonCoreContract} functionName="setDungeonMaster" currentValue={undefined} isLoading={false} isAddress />
                {/* ...可以按需添加更多地址管理... */}
            </AdminSection>

             <AdminSection title="危險區域">
                <p className="text-sm text-yellow-500 -mt-2 mb-4">此區域的操作將直接影響遊戲經濟，請謹慎操作。</p>
                <div className="p-4 border border-red-500/50 rounded-lg">
                    <SettingRow label="更新隨機種子" contract={heroContract} functionName="updateSeasonSeed" currentValue={'N/A'} isLoading={false} />
                </div>
            </AdminSection>

        </section>
    );
};

export default AdminPage;
