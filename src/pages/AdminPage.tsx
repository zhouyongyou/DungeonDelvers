import React, { useState } from 'react';
import { useAccount } from 'wagmi';
import { useWriteContract } from 'wagmi';
import { getContract } from '../config/contracts';
import { ActionButton } from '../components/ui/ActionButton';
import { useAppToast } from '../hooks/useAppToast';
import { useTransactionStore } from '../stores/useTransactionStore';
import { type Address, isAddress, parseEther, type Abi } from 'viem';

// 可折疊的區塊元件
const AdminSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => {
    const [isOpen, setIsOpen] = useState(true);
    return (
        <div className="card-bg rounded-xl shadow-lg mb-6">
            <button
                className="w-full text-left p-4 bg-gray-700/50 hover:bg-gray-700/80 rounded-t-xl"
                onClick={() => setIsOpen(!isOpen)}
            >
                <h3 className="section-title mb-0">{title}</h3>
            </button>
            {isOpen && <div className="p-4 space-y-4">{children}</div>}
        </div>
    );
};

// AdminPage 主元件
const AdminPage: React.FC = () => {
    const { chainId } = useAccount();
    const { showToast } = useAppToast();
    const { addTransaction } = useTransactionStore();
    const { writeContractAsync, isPending } = useWriteContract();

    // 狀態管理
    const [dungeonId, setDungeonId] = useState('1');
    const [requiredPower, setRequiredPower] = useState('');
    const [rewardUSD, setRewardUSD] = useState('');
    const [successRate, setSuccessRate] = useState('');
    
    const [commissionRate, setCommissionRate] = useState('');
    
    const [vipRecipient, setVipRecipient] = useState('');
    const [vipLevel, setVipLevel] = useState('10');
    const [vipMintPrice, setVipMintPrice] = useState('');

    const dungeonCoreContract = getContract(chainId, 'dungeonCore');
    const vipStakingContract = getContract(chainId, 'vipStaking');

    // 通用的交易處理函式
    const handleWrite = async (
        contract: { address: Address; abi: readonly any[] } | undefined, 
        functionName: string, 
        args: unknown[], 
        description: string
    ) => {
        if (!contract) {
            showToast("合約未就緒或網路不支援", "error");
            return;
        }
        if (args.some(arg => arg === '' || arg === undefined || (typeof arg === 'bigint' && arg < 0))) {
            showToast("請填寫所有必要的欄位", "error");
            return;
        }
        try {
            const hash = await writeContractAsync({
                address: contract.address,
                abi: contract.abi as Abi,
                functionName,
                args,
            });
            addTransaction({ hash, description });
            showToast("交易已送出", "info");
        } catch (e: any) {
            showToast(e.shortMessage || "交易失敗", "error");
        }
    };

    return (
        <section>
            <h2 className="page-title">遊戲管理後台</h2>
            
            <AdminSection title="DungeonCore 管理">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input type="number" placeholder="地下城 ID (1-10)" value={dungeonId} onChange={e => setDungeonId(e.target.value)} className="input-base" />
                    <input type="number" placeholder="所需戰力" value={requiredPower} onChange={e => setRequiredPower(e.target.value)} className="input-base" />
                    <input type="number" placeholder="獎勵 (USD)" value={rewardUSD} onChange={e => setRewardUSD(e.target.value)} className="input-base" />
                    <input type="number" placeholder="基礎成功率 (%)" value={successRate} onChange={e => setSuccessRate(e.target.value)} className="input-base" />
                </div>
                <ActionButton 
                    onClick={() => handleWrite(dungeonCoreContract, 'updateDungeon', [BigInt(dungeonId || '0'), BigInt(requiredPower || '0'), parseEther(rewardUSD || '0'), Number(successRate || '0')], '更新地下城')} 
                    isLoading={isPending} 
                    className="w-full"
                >
                    更新地下城
                </ActionButton>
                
                <div className="flex items-center gap-4 pt-4 mt-4 border-t border-gray-700">
                    <input type="number" placeholder="邀請佣金率 (%)" value={commissionRate} onChange={e => setCommissionRate(e.target.value)} className="input-base flex-grow" />
                    <ActionButton 
                        onClick={() => handleWrite(dungeonCoreContract, 'setCommissionRate', [BigInt(commissionRate || '0')], '設定邀請佣金率')} 
                        isLoading={isPending} 
                        className="w-1/3"
                    >
                        設定佣金
                    </ActionButton>
                </div>
            </AdminSection>

            <AdminSection title="VIP 卡管理">
                 <h4 className="text-lg font-semibold text-gray-300">鑄造特殊 VIP 卡</h4>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input type="text" placeholder="接收者地址" value={vipRecipient} onChange={e => setVipRecipient(e.target.value)} className="input-base" />
                    <input type="number" placeholder="VIP 等級 (成功率加成%)" value={vipLevel} onChange={e => setVipLevel(e.target.value)} className="input-base" />
                </div>
                <ActionButton 
                    onClick={() => handleWrite(vipStakingContract, 'adminMint', [vipRecipient as Address, Number(vipLevel)], '鑄造特殊 VIP 卡')} 
                    isLoading={isPending} 
                    disabled={!isAddress(vipRecipient)} 
                    className="w-full"
                >
                    為指定地址鑄造
                </ActionButton>

                <div className="pt-4 mt-4 border-t border-gray-700">
                    <h4 className="text-lg font-semibold text-gray-300">設定公開鑄造價格</h4>
                    <div className="flex items-center gap-4">
                        <input type="number" placeholder="新價格 (USD)" value={vipMintPrice} onChange={e => setVipMintPrice(e.target.value)} className="input-base flex-grow" />
                        <ActionButton 
                            onClick={() => handleWrite(vipStakingContract, 'setMintPriceUSD', [parseEther(vipMintPrice || '0')], '設定 VIP 卡價格')} 
                            isLoading={isPending} 
                            className="w-1/3"
                        >
                            設定價格
                        </ActionButton>
                    </div>
                </div>
                
                 <div className="pt-4 mt-4 border-t border-gray-700">
                    <h4 className="text-lg font-semibold text-gray-300">提取收益</h4>
                    <ActionButton 
                        onClick={() => handleWrite(vipStakingContract, 'withdrawTokens', [], '提取 VIP 鑄造收益')} 
                        isLoading={isPending} 
                        className="w-full"
                    >
                        提取合約中的 $SoulShard
                    </ActionButton>
                </div>
            </AdminSection>
            
            <AdminSection title="全局控制">
                <div className="flex gap-4">
                    <ActionButton onClick={() => handleWrite(dungeonCoreContract, 'pause', [], '暫停遊戲')} isLoading={isPending} className="w-full bg-yellow-600 hover:bg-yellow-700">暫停</ActionButton>
                    <ActionButton onClick={() => handleWrite(dungeonCoreContract, 'unpause', [], '恢復遊戲')} isLoading={isPending} className="w-full bg-green-600 hover:bg-green-700">恢復</ActionButton>
                </div>
            </AdminSection>
        </section>
    );
};

export default AdminPage;