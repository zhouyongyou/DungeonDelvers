import React, { useState } from 'react';
import { useAccount } from 'wagmi';
import { useWriteContract } from 'wagmi';
import { getContract } from '../config/contracts';
import { ActionButton } from '../components/ui/ActionButton';
import { useAppToast } from '../hooks/useAppToast';
import { useTransactionStore } from '../stores/useTransactionStore';
import { type Address, isAddress, parseEther, type Abi } from 'viem';

// 可折疊的區塊元件
const AdminSection: React.FC<{ title: string; children: React.ReactNode; defaultOpen?: boolean }> = ({ title, children, defaultOpen = false }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    return (
        <div className="card-bg rounded-xl shadow-lg mb-6">
            <button
                className="w-full text-left p-4 bg-black/10 dark:bg-white/5 hover:bg-black/20 dark:hover:bg-white/10 rounded-t-xl flex justify-between items-center transition-colors"
                onClick={() => setIsOpen(!isOpen)}
            >
                <h3 className="section-title mb-0">{title}</h3>
                <span className="text-2xl font-light">{isOpen ? '−' : '+'}</span>
            </button>
            {isOpen && <div className="p-6 space-y-4 border-t border-black/10 dark:border-white/10">{children}</div>}
        </div>
    );
};

// AdminPage 主元件
const AdminPage: React.FC = () => {
    const { chainId } = useAccount();
    const { showToast } = useAppToast();
    const { addTransaction } = useTransactionStore();
    const { writeContractAsync, isPending } = useWriteContract();

    // 統一樣式
    const inputStyle = "w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500 outline-none h-10 bg-white/80 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 dark:placeholder-gray-400";

    // 狀態管理
    const [dungeonId, setDungeonId] = useState('1');
    const [requiredPower, setRequiredPower] = useState('');
    const [rewardUSD, setRewardUSD] = useState('');
    const [successRate, setSuccessRate] = useState('');
    const [commissionRate, setCommissionRate] = useState('');
    
    const [vipRecipient, setVipRecipient] = useState('');
    const [vipLevel, setVipLevel] = useState('10');
    const [vipMintPrice, setVipMintPrice] = useState('');

    const [heroBaseURI, setHeroBaseURI] = useState('');
    const [relicBaseURI, setRelicBaseURI] = useState('');
    const [airdropAddress, setAirdropAddress] = useState('');
    const [airdropAmount, setAirdropAmount] = useState('1');


    const dungeonCoreContract = getContract(chainId, 'dungeonCore');
    const vipStakingContract = getContract(chainId, 'vipStaking');
    const heroContract = getContract(chainId, 'hero');
    const relicContract = getContract(chainId, 'relic');

    /**
     * @dev 通用的交易處理函式
     * 【錯誤修正】將 contract 參數的型別從 `... | undefined` 修改為 `... | null`，
     * 以匹配 getContract 函式的回傳型別，解決 TypeScript 型別不相容的錯誤。
     */
    const handleWrite = async (
        contract: { address: Address; abi: readonly any[] } | null, 
        functionName: string, 
        args: unknown[], 
        description: string,
        value?: bigint
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
                value
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
            
            <AdminSection title="核心經濟管理 (DungeonCore)" defaultOpen={true}>
                <h4 className="text-lg font-semibold text-gray-300">更新地下城參數</h4>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input type="number" placeholder="地下城 ID (1-10)" value={dungeonId} onChange={e => setDungeonId(e.target.value)} className={inputStyle} />
                    <input type="number" placeholder="所需戰力" value={requiredPower} onChange={e => setRequiredPower(e.target.value)} className={inputStyle} />
                    <input type="number" placeholder="獎勵 (USD)" value={rewardUSD} onChange={e => setRewardUSD(e.target.value)} className={inputStyle} />
                    <input type="number" placeholder="基礎成功率 (%)" value={successRate} onChange={e => setSuccessRate(e.target.value)} className={inputStyle} />
                </div>
                <ActionButton onClick={() => handleWrite(dungeonCoreContract, 'updateDungeon', [BigInt(dungeonId || '0'), BigInt(requiredPower || '0'), parseEther(rewardUSD || '0'), Number(successRate || '0')], '更新地下城')} isLoading={isPending} className="w-full">更新地下城</ActionButton>
                
                <div className="flex items-center gap-4 pt-4 mt-4 border-t border-gray-700">
                    <input type="number" placeholder="邀請佣金率 (%)" value={commissionRate} onChange={e => setCommissionRate(e.target.value)} className={`${inputStyle} flex-grow`} />
                    <ActionButton onClick={() => handleWrite(dungeonCoreContract, 'setCommissionRate', [BigInt(commissionRate || '0')], '設定邀請佣金率')} isLoading={isPending} className="w-1/3">設定佣金</ActionButton>
                </div>
            </AdminSection>

            <AdminSection title="英雄 NFT 管理 (Hero)">
                <h4 className="text-lg font-semibold text-gray-300">設定 Base URI</h4>
                <div className="flex items-center gap-4">
                     <input type="text" placeholder="新的 Base URI (例如: ipfs://.../)" value={heroBaseURI} onChange={e => setHeroBaseURI(e.target.value)} className={`${inputStyle} flex-grow`} />
                     <ActionButton onClick={() => handleWrite(heroContract, 'setBaseURI', [heroBaseURI], '設定英雄 Base URI')} isLoading={isPending} className="w-1/3">設定 URI</ActionButton>
                </div>
                <h4 className="text-lg font-semibold text-gray-300 mt-4">空投/批量鑄造英雄</h4>
                <p className="text-xs text-gray-400 -mt-2 mb-2">註：此功能預設空投最低稀有度(1星)的英雄。</p>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input type="text" placeholder="接收者地址" value={airdropAddress} onChange={e => setAirdropAddress(e.target.value)} className={inputStyle} />
                    <input type="number" placeholder="數量" value={airdropAmount} onChange={e => setAirdropAmount(e.target.value)} className={inputStyle} />
                </div>
                <ActionButton 
                  onClick={() => {
                    const counts: bigint[] = [BigInt(airdropAmount || '0'), BigInt(0), BigInt(0), BigInt(0), BigInt(0)];
                    handleWrite(heroContract, 'adminBatchMint', [airdropAddress as Address, counts], `空投 ${airdropAmount} 個英雄`);
                  }} 
                  isLoading={isPending} disabled={!isAddress(airdropAddress)} className="w-full">執行空投</ActionButton>
            </AdminSection>

            <AdminSection title="聖物 NFT 管理 (Relic)">
                 <h4 className="text-lg font-semibold text-gray-300">設定 Base URI</h4>
                <div className="flex items-center gap-4">
                     <input type="text" placeholder="新的 Base URI (例如: ipfs://.../)" value={relicBaseURI} onChange={e => setRelicBaseURI(e.target.value)} className={`${inputStyle} flex-grow`} />
                     <ActionButton onClick={() => handleWrite(relicContract, 'setBaseURI', [relicBaseURI], '設定聖物 Base URI')} isLoading={isPending} className="w-1/3">設定 URI</ActionButton>
                </div>
                <h4 className="text-lg font-semibold text-gray-300 mt-4">空投/批量鑄造聖物</h4>
                <p className="text-xs text-gray-400 -mt-2 mb-2">註：此功能預設空投最低稀有度(1星)的聖物。</p>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input type="text" placeholder="接收者地址" value={airdropAddress} onChange={e => setAirdropAddress(e.target.value)} className={inputStyle} />
                    <input type="number" placeholder="數量" value={airdropAmount} onChange={e => setAirdropAmount(e.target.value)} className={inputStyle} />
                </div>
                <ActionButton 
                  onClick={() => {
                    const counts: bigint[] = [BigInt(airdropAmount || '0'), BigInt(0), BigInt(0), BigInt(0), BigInt(0)];
                    handleWrite(relicContract, 'adminBatchMint', [airdropAddress as Address, counts], `空投 ${airdropAmount} 個聖物`);
                  }} 
                  isLoading={isPending} disabled={!isAddress(airdropAddress)} className="w-full">執行空投</ActionButton>
            </AdminSection>
            
            <AdminSection title="VIP 卡管理 (VIPStaking)">
                 <h4 className="text-lg font-semibold text-gray-300">鑄造特殊 VIP 卡</h4>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input type="text" placeholder="接收者地址" value={vipRecipient} onChange={e => setVipRecipient(e.target.value)} className={inputStyle} />
                    <input type="number" placeholder="VIP 等級 (成功率加成%)" value={vipLevel} onChange={e => setVipLevel(e.target.value)} className={inputStyle} />
                </div>
                <ActionButton onClick={() => handleWrite(vipStakingContract, 'adminMint', [vipRecipient as Address, Number(vipLevel)], '鑄造特殊 VIP 卡')} isLoading={isPending} disabled={!isAddress(vipRecipient)} className="w-full">為指定地址鑄造</ActionButton>

                <div className="pt-4 mt-4 border-t border-gray-700">
                    <h4 className="text-lg font-semibold text-gray-300">設定公開鑄造價格</h4>
                    <div className="flex items-center gap-4">
                        <input type="number" placeholder="新價格 (USD)" value={vipMintPrice} onChange={e => setVipMintPrice(e.target.value)} className={`${inputStyle} flex-grow`} />
                        <ActionButton onClick={() => handleWrite(vipStakingContract, 'setMintPriceUSD', [parseEther(vipMintPrice || '0')], '設定 VIP 卡價格')} isLoading={isPending} className="w-1/3">設定價格</ActionButton>
                    </div>
                </div>
                
                 <div className="pt-4 mt-4 border-t border-gray-700">
                    <h4 className="text-lg font-semibold text-gray-300">提取收益</h4>
                    <ActionButton onClick={() => handleWrite(vipStakingContract, 'withdrawTokens', [], '提取 VIP 鑄造收益')} isLoading={isPending} className="w-full">提取合約中的 $SoulShard</ActionButton>
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
