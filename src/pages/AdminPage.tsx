import React, { useState } from 'react';
import { useAccount } from 'wagmi';
import { useWriteContract } from 'wagmi';
import { getContract } from '../config/contracts';
import { ActionButton } from '../components/ui/ActionButton';
import { useAppToast } from '../hooks/useAppToast';
import { useTransactionStore } from '../stores/useTransactionStore';
import { type Address, isAddress, parseEther, type Abi } from 'viem';

// 可折疊的區塊元件
const AdminSection: React.FC<{ title: string; children: React.ReactNode; defaultOpen?: boolean; isDangerous?: boolean }> = ({ title, children, defaultOpen = false, isDangerous = false }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    const headerColor = isDangerous 
        ? "bg-red-900/50 hover:bg-red-900/70 text-red-300" 
        : "bg-black/10 dark:bg-white/5 hover:bg-black/20 dark:hover:bg-white/10";
    
    return (
        <div className={`card-bg rounded-xl shadow-lg mb-6 border ${isDangerous ? 'border-red-500/30' : 'border-transparent'}`}>
            <button
                className={`w-full text-left p-4 rounded-t-xl flex justify-between items-center transition-colors ${headerColor}`}
                onClick={() => setIsOpen(!isOpen)}
            >
                <h3 className={`section-title mb-0 ${isDangerous ? 'text-red-200' : ''}`}>{title}</h3>
                <span className={`text-2xl font-light ${isDangerous ? 'text-red-300' : ''}`}>{isOpen ? '−' : '+'}</span>
            </button>
            {isOpen && <div className="p-6 space-y-4 border-t border-black/10 dark:border-white/10">{children}</div>}
        </div>
    );
};

// 版稅設定的專用元件
const RoyaltySettings: React.FC<{ contractName: 'hero' | 'relic' | 'party' | 'vipStaking' }> = ({ contractName }) => {
    const { chainId } = useAccount();
    const { addTransaction } = useTransactionStore();
    const { showToast } = useAppToast();
    const { writeContractAsync, isPending } = useWriteContract();

    const [receiver, setReceiver] = useState('');
    const [fee, setFee] = useState('500');

    const contract = getContract(chainId, contractName);
    const title = {
        hero: '英雄 (Hero)',
        relic: '聖物 (Relic)',
        party: '隊伍 (Party)',
        vipStaking: 'VIP 卡'
    }[contractName];

    const handleSetRoyalty = async () => {
        if (!contract) return showToast("合約未就緒", "error");
        if (!isAddress(receiver) || !fee) return showToast("請輸入有效的地址和費率", "error");

        try {
            const hash = await writeContractAsync({
                address: contract.address,
                abi: contract.abi as Abi,
                functionName: 'setDefaultRoyalty',
                args: [receiver as Address, BigInt(fee)]
            });
            addTransaction({ hash, description: `更新 ${title} 版稅設定` });
        } catch (e: any) {
            showToast(e.shortMessage || "交易失敗", "error");
        }
    };

    return (
        <div className="pt-4 mt-4 border-t border-gray-700">
            <h4 className="text-lg font-semibold text-gray-300">{title} 版稅設定</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                <input type="text" placeholder="新的收款地址" value={receiver} onChange={e => setReceiver(e.target.value)} className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500 outline-none h-10 bg-white/80 dark:bg-gray-700 dark:border-gray-600" />
                <input type="number" placeholder="新的費率 (基點, 500=5%)" value={fee} onChange={e => setFee(e.target.value)} className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500 outline-none h-10 bg-white/80 dark:bg-gray-700 dark:border-gray-600" />
            </div>
            <ActionButton onClick={handleSetRoyalty} isLoading={isPending} disabled={!isAddress(receiver)} className="w-full mt-2">更新 {title} 版稅</ActionButton>
        </div>
    );
};

// 【新增】所有權轉移的專用元件
const OwnershipTransfer: React.FC<{ contractName: 'dungeonCore' | 'hero' | 'relic' | 'party' | 'vipStaking' }> = ({ contractName }) => {
    const { chainId } = useAccount();
    const { addTransaction } = useTransactionStore();
    const { showToast } = useAppToast();
    const { writeContractAsync, isPending } = useWriteContract();

    const [newOwner, setNewOwner] = useState('');
    const contract = getContract(chainId, contractName);
    const title = contractName.charAt(0).toUpperCase() + contractName.slice(1);

    const handleTransfer = async () => {
        if (!contract) return showToast("合約未就緒", "error");
        if (!isAddress(newOwner)) return showToast("請輸入有效的新擁有者地址", "error");

        try {
            const hash = await writeContractAsync({
                address: contract.address,
                abi: contract.abi as Abi,
                functionName: 'transferOwnership',
                args: [newOwner as Address]
            });
            addTransaction({ hash, description: `轉移 ${title} 合約所有權` });
        } catch (e: any) {
            showToast(e.shortMessage || "交易失敗", "error");
        }
    };

    return (
        <div className="pt-4 mt-4 border-t border-gray-600">
            <h4 className="text-base font-semibold text-red-300">轉移 {title} 合約</h4>
            <div className="flex items-center gap-4 mt-2">
                <input type="text" placeholder="新擁有者地址" value={newOwner} onChange={e => setNewOwner(e.target.value)} className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-red-500 outline-none h-10 bg-gray-900 border-gray-600" />
                <ActionButton onClick={handleTransfer} isLoading={isPending} disabled={!isAddress(newOwner)} className="w-1/3 bg-red-800 hover:bg-red-700">確認轉移</ActionButton>
            </div>
        </div>
    );
};


// AdminPage 主元件
const AdminPage: React.FC = () => {
    const { chainId } = useAccount();
    const { showToast } = useAppToast();
    const { addTransaction } = useTransactionStore();
    const { writeContractAsync, isPending } = useWriteContract();

    const inputStyle = "w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500 outline-none h-10 bg-white/80 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 dark:placeholder-gray-400";
    
    // ... 其他狀態管理 ...
    const [dungeonId, setDungeonId] = useState('1');
    const [requiredPower, setRequiredPower] = useState('');
    const [rewardUSD, setRewardUSD] = useState('');
    const [successRate, setSuccessRate] = useState('');
    const [commissionRate, setCommissionRate] = useState('');
    const [heroBaseURI, setHeroBaseURI] = useState('');
    const [relicBaseURI, setRelicBaseURI] = useState('');
    const [airdropAddress, setAirdropAddress] = useState('');
    const [airdropAmount, setAirdropAmount] = useState('1');
    const [vipRecipient, setVipRecipient] = useState('');
    const [vipLevel, setVipLevel] = useState('5');
    const [vipMintPrice, setVipMintPrice] = useState('');
    const [taxMaxRate, setTaxMaxRate] = useState('30');
    const [taxDecreaseRate, setTaxDecreaseRate] = useState('10');
    const [taxPeriod, setTaxPeriod] = useState('86400');
    const [stakeLockPeriod, setStakeLockPeriod] = useState('604800');

    // 合約實例
    const dungeonCoreContract = getContract(chainId, 'dungeonCore');
    const vipStakingContract = getContract(chainId, 'vipStaking');
    const heroContract = getContract(chainId, 'hero');
    const relicContract = getContract(chainId, 'relic');

    const handleWrite = async (contract: { address: Address; abi: readonly any[] } | null, functionName: string, args: unknown[], description: string, value?: bigint) => {
        if (!contract) return showToast("合約未就緒或網路不支援", "error");
        if (args.some(arg => arg === '' || arg === undefined || (typeof arg === 'bigint' && arg < 0))) return showToast("請填寫所有必要的欄位", "error");
        try {
            const hash = await writeContractAsync({ address: contract.address, abi: contract.abi as Abi, functionName, args, value });
            addTransaction({ hash, description });
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
                
                <div className="pt-4 mt-4 border-t border-gray-700">
                    <h4 className="text-lg font-semibold text-gray-300">提現稅率參數</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <input type="number" placeholder="最高稅率 (%)" value={taxMaxRate} onChange={e => setTaxMaxRate(e.target.value)} className={inputStyle} />
                        <input type="number" placeholder="每日降低率 (%)" value={taxDecreaseRate} onChange={e => setTaxDecreaseRate(e.target.value)} className={inputStyle} />
                        <input type="number" placeholder="週期 (秒, 86400=24h)" value={taxPeriod} onChange={e => setTaxPeriod(e.target.value)} className={inputStyle} />
                    </div>
                    <ActionButton onClick={() => handleWrite(dungeonCoreContract, 'setTaxParameters', [BigInt(taxMaxRate), BigInt(taxDecreaseRate), BigInt(taxPeriod)], '更新提現稅率')} isLoading={isPending} className="w-full mt-2">設定提現稅率</ActionButton>
                </div>
            </AdminSection>

            <AdminSection title="NFT 合約管理 (Hero & Relic)">
                <h4 className="text-lg font-semibold text-gray-300">設定 Base URI</h4>
                <div className="flex items-center gap-4 mb-4">
                     <input type="text" placeholder="英雄 Base URI" value={heroBaseURI} onChange={e => setHeroBaseURI(e.target.value)} className={`${inputStyle} flex-grow`} />
                     <ActionButton onClick={() => handleWrite(heroContract, 'setBaseURI', [heroBaseURI], '設定英雄 Base URI')} isLoading={isPending} className="w-1/3">設定英雄 URI</ActionButton>
                </div>
                 <div className="flex items-center gap-4">
                     <input type="text" placeholder="聖物 Base URI" value={relicBaseURI} onChange={e => setRelicBaseURI(e.target.value)} className={`${inputStyle} flex-grow`} />
                     <ActionButton onClick={() => handleWrite(relicContract, 'setBaseURI', [relicBaseURI], '設定聖物 Base URI')} isLoading={isPending} className="w-1/3">設定聖物 URI</ActionButton>
                </div>

                <h4 className="text-lg font-semibold text-gray-300 mt-4 pt-4 border-t border-gray-700">空投 NFT</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input type="text" placeholder="接收者地址" value={airdropAddress} onChange={e => setAirdropAddress(e.target.value)} className={inputStyle} />
                    <input type="number" placeholder="數量" value={airdropAmount} onChange={e => setAirdropAmount(e.target.value)} className={inputStyle} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                    <ActionButton 
                      onClick={() => handleWrite(heroContract, 'adminBatchMint', [airdropAddress as Address, [BigInt(airdropAmount || '0'),0,0,0,0]], `空投 ${airdropAmount} 個英雄`)} 
                      isLoading={isPending} disabled={!isAddress(airdropAddress)} className="w-full">空投英雄</ActionButton>
                    <ActionButton 
                      onClick={() => handleWrite(relicContract, 'adminBatchMint', [airdropAddress as Address, [BigInt(airdropAmount || '0'),0,0,0,0]], `空投 ${airdropAmount} 個聖物`)} 
                      isLoading={isPending} disabled={!isAddress(airdropAddress)} className="w-full">空投聖物</ActionButton>
                </div>
            </AdminSection>

            <AdminSection title="VIP 卡管理 (VIPStaking)">
                <h4 className="text-lg font-semibold text-gray-300">手動鑄造 VIP 卡</h4>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input type="text" placeholder="接收者地址" value={vipRecipient} onChange={e => setVipRecipient(e.target.value)} className={inputStyle} />
                    <input type="number" placeholder="VIP 等級 (加成%)" value={vipLevel} onChange={e => setVipLevel(e.target.value)} className={inputStyle} />
                </div>
                <ActionButton onClick={() => handleWrite(vipStakingContract, 'adminMint', [vipRecipient as Address, Number(vipLevel)], '鑄造特殊 VIP 卡')} isLoading={isPending} disabled={!isAddress(vipRecipient)} className="w-full mt-2">為指定地址鑄造</ActionButton>

                <div className="pt-4 mt-4 border-t border-gray-700">
                    <h4 className="text-lg font-semibold text-gray-300">質押鎖倉時間</h4>
                     <div className="flex items-center gap-4">
                         <input type="number" placeholder="新的鎖倉時間 (秒)" value={stakeLockPeriod} onChange={e => setStakeLockPeriod(e.target.value)} className={`${inputStyle} flex-grow`} />
                         <ActionButton onClick={() => handleWrite(vipStakingContract, 'setStakeLockPeriod', [BigInt(stakeLockPeriod)], '更新 VIP 鎖倉時間')} isLoading={isPending} className="w-1/3">設定鎖倉</ActionButton>
                    </div>
                </div>
                
                <div className="pt-4 mt-4 border-t border-gray-700">
                    <h4 className="text-lg font-semibold text-gray-300">公開鑄造價格</h4>
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
            
            <AdminSection title="二級市場版稅管理">
                <RoyaltySettings contractName="hero" />
                <RoyaltySettings contractName="relic" />
                <RoyaltySettings contractName="party" />
                <RoyaltySettings contractName="vipStaking" />
            </AdminSection>
            
            <AdminSection title="全局控制">
                <div className="flex gap-4">
                    <ActionButton onClick={() => handleWrite(dungeonCoreContract, 'pause', [], '暫停遊戲')} isLoading={isPending} className="w-full bg-yellow-600 hover:bg-yellow-700">全局暫停</ActionButton>
                    <ActionButton onClick={() => handleWrite(dungeonCoreContract, 'unpause', [], '恢復遊戲')} isLoading={isPending} className="w-full bg-green-600 hover:bg-green-700">恢復遊戲</ActionButton>
                </div>
            </AdminSection>

            {/* --- 【新增】危險區域：所有權轉移 --- */}
            <AdminSection title="危險區域：合約所有權管理" defaultOpen={false} isDangerous={true}>
                <p className="text-sm text-red-400">警告：轉移所有權是一個不可逆的操作，舊的擁有者將失去所有管理權限。請務必謹慎操作，並確認新擁有者地址無誤。</p>
                <OwnershipTransfer contractName="dungeonCore" />
                <OwnershipTransfer contractName="hero" />
                <OwnershipTransfer contractName="relic" />
                <OwnershipTransfer contractName="party" />
                <OwnershipTransfer contractName="vipStaking" />
            </AdminSection>
        </section>
    );
};

export default AdminPage;
