import React, { useState, type ReactNode } from 'react';
import { useAccount, useReadContract, useWriteContract } from 'wagmi';
import { parseEther, type Address } from 'viem';
import { useAppToast } from '../hooks/useAppToast';
import { getContract } from '../config/contracts';
import { ActionButton } from '../components/ui/ActionButton';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

// 輔助元件：管理區塊的容器
const AdminSection: React.FC<{ title: string; children: ReactNode }> = ({ title, children }) => (
    <div className="card-bg p-6 rounded-xl shadow-inner bg-black/5 dark:bg-white/5">
        <h3 className="section-title border-b pb-2 mb-4 dark:border-gray-700">{title}</h3>
        <div className="space-y-4">{children}</div>
    </div>
);

// 輔助元件：輸入框與標籤的組合
const InputGroup: React.FC<{ label: string; children: ReactNode; colSpan?: string }> = ({ label, children, colSpan = 'col-span-1' }) => (
    <div className={colSpan}>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
        <div className="flex gap-2 items-center">{children}</div>
    </div>
);

const AdminPage: React.FC = () => {
    // --- Hooks ---
    const { address, chainId } = useAccount();
    const { showToast } = useAppToast();
    const { writeContract, isPending } = useWriteContract({
        mutation: {
            onSuccess: (txHash) => showToast(`管理員操作成功！交易已送出: ${txHash.slice(0,10)}...`, 'success'),
            onError: (err) => showToast(err.message.split('\n')[0], 'error')
        }
    });

    // --- 合約實例 ---
    const heroContract = getContract(chainId, 'hero');
    const relicContract = getContract(chainId, 'relic');
    const dungeonCoreContract = getContract(chainId, 'dungeonCore');
    const partyContract = getContract(chainId, 'party');

    const [mintHeroArgs, setMintHeroArgs] = useState({ to: '', rarity: '1', power: '100' });
    const [mintRelicArgs, setMintRelicArgs] = useState({ to: '', rarity: '1', capacity: '1' });
    const [batchMintState, setBatchMintState] = useState({
        hero: { to: '', counts: Array(5).fill('0') },
        relic: { to: '', counts: Array(5).fill('0') }
    });
    const [prices, setPrices] = useState({ hero: '', relic: '', provision: '' });
    const [uris, setUris] = useState({ hero: '', relic: '', party: '' });
    const [addresses, setAddresses] = useState({ dungeonCore: '' });
    const [fees, setFees] = useState({ exploration: '' });
    const [dungeonSettings, setDungeonSettings] = useState({ id: '1', power: '', reward: '', rate: ''});
    const [multiplier, setMultiplier] = useState('');
    const [pauseTarget, setPauseTarget] = useState<'hero' | 'relic' | 'party' | 'dungeonCore' | ''>('');

    // --- 權限檢查 ---
    const { data: heroOwner, isLoading: isLoadingOwner } = useReadContract({ 
        ...heroContract, 
        functionName: 'owner',
        query: { enabled: !!heroContract }
    });

    // --- 事件處理函式 ---
    const handleBatchStateChange = (type: 'hero' | 'relic', field: 'to' | 'counts', value: string, index?: number) => {
        setBatchMintState(prev => {
            const newState = { ...prev };
            if (field === 'to') newState[type].to = value;
            else if (field === 'counts' && index !== undefined) {
                const newCounts = [...newState[type].counts];
                newCounts[index] = value;
                newState[type].counts = newCounts;
            }
            return newState;
        });
    };
    
    // --- 合約呼叫 ---
    const handlePause = (contractName: 'hero' | 'relic' | 'party' | 'dungeonCore') => {
        const contract = getContract(chainId, contractName);
        if (contract) writeContract({ ...(contract as any), functionName: 'pause' });
    };

    const handleUnpause = (contractName: 'hero' | 'relic' | 'party' | 'dungeonCore') => {
        const contract = getContract(chainId, contractName);
        if (contract) writeContract({ ...(contract as any), functionName: 'unpause' });
    };

    const handleAdminMintHero = () => { if(heroContract && mintHeroArgs.to) writeContract({ ...heroContract, functionName: 'adminMint', args: [mintHeroArgs.to as Address, Number(mintHeroArgs.rarity), BigInt(mintHeroArgs.power)] })};
    const handleAdminMintRelic = () => { if(relicContract && mintRelicArgs.to) writeContract({ ...relicContract, functionName: 'adminMint', args: [mintRelicArgs.to as Address, Number(mintRelicArgs.rarity), Number(mintRelicArgs.capacity)] })};
    const handleAdminBatchMintHero = () => { if(heroContract && batchMintState.hero.to) { const counts = batchMintState.hero.counts.map(c => BigInt(c || '0')) as [bigint, bigint, bigint, bigint, bigint]; writeContract({ ...heroContract, functionName: 'adminBatchMint', args: [batchMintState.hero.to as Address, counts] }); } };
    const handleAdminBatchMintRelic = () => { if(relicContract && batchMintState.relic.to) { const counts = batchMintState.relic.counts.map(c => BigInt(c || '0')) as [bigint, bigint, bigint, bigint, bigint]; writeContract({ ...relicContract, functionName: 'adminBatchMint', args: [batchMintState.relic.to as Address, counts] }); } };
    
    const handleSetHeroPrice = () => { if(heroContract && prices.hero) writeContract({ ...heroContract, functionName: 'setMintPriceUSD', args: [parseEther(prices.hero)] })};
    const handleSetRelicPrice = () => { if(relicContract && prices.relic) writeContract({ ...relicContract, functionName: 'setMintPriceUSD', args: [parseEther(prices.relic)] })};
    const handleSetProvisionPrice = () => { if(dungeonCoreContract && prices.provision) writeContract({ ...dungeonCoreContract, functionName: 'setProvisionPriceUSD', args: [parseEther(prices.provision)] })};
    const handleSetHeroUri = () => { if(heroContract && uris.hero) writeContract({ ...heroContract, functionName: 'setBaseURI', args: [uris.hero] })};
    const handleSetRelicUri = () => { if(relicContract && uris.relic) writeContract({ ...relicContract, functionName: 'setBaseURI', args: [uris.relic] })};
    const handleSetPartyUri = () => { if(partyContract && uris.party) writeContract({ ...partyContract, functionName: 'setBaseURI', args: [uris.party] })};
    const handleSetDungeonCoreAddress = () => { if(partyContract && addresses.dungeonCore) writeContract({ ...partyContract, functionName: 'setDungeonCoreAddress', args: [addresses.dungeonCore as Address] })};
    const handleSetExplorationFee = () => { if(dungeonCoreContract && fees.exploration) writeContract({ ...dungeonCoreContract, functionName: 'setExplorationFee', args: [parseEther(fees.exploration)] })};
    const handleUpdateDungeon = () => { if(dungeonCoreContract && dungeonSettings.id && dungeonSettings.power && dungeonSettings.reward && dungeonSettings.rate) writeContract({ ...dungeonCoreContract, functionName: 'updateDungeon', args: [BigInt(dungeonSettings.id), BigInt(dungeonSettings.power), parseEther(dungeonSettings.reward), Number(dungeonSettings.rate)] })};
    const handleSetMultiplier = () => { if(dungeonCoreContract && multiplier) writeContract({ ...dungeonCoreContract, functionName: 'setGlobalRewardMultiplier', args: [BigInt(multiplier)] })};
    const handleWithdrawBNB = () => { if(dungeonCoreContract) writeContract({ ...dungeonCoreContract, functionName: 'withdrawNativeFunding' })};
    const handleWithdrawTax = () => { if(dungeonCoreContract) writeContract({ ...dungeonCoreContract, functionName: 'withdrawTaxedTokens' })};

    // --- 渲染邏輯 ---
    if (isLoadingOwner) return <div className="flex justify-center mt-10"><LoadingSpinner /></div>;
    if (!address || typeof heroOwner !== 'string' || address.toLowerCase() !== heroOwner.toLowerCase()) {
        return <div className="text-center p-8 card-bg rounded-xl">您不是合約擁有者，無法訪問此頁面。</div>;
    }

    return (
        <section>
            <h2 className="page-title">DApp 指揮中心</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                
                <AdminSection title="合約緊急控制">
                    <InputGroup label="選擇要操作的合約">
                        <select value={pauseTarget} onChange={e => setPauseTarget(e.target.value as any)} className="w-full p-2 border rounded">
                            <option value="">-- 請選擇 --</option>
                            <option value="hero">英雄合約</option>
                            <option value="relic">聖物合約</option>
                            <option value="party">隊伍合約</option>
                            <option value="dungeonCore">核心合約</option>
                        </select>
                    </InputGroup>
                    <div className="grid grid-cols-2 gap-2">
                        <ActionButton onClick={() => handlePause(pauseTarget as any)} disabled={!pauseTarget || isPending} isLoading={isPending}>暫停</ActionButton>
                        <ActionButton onClick={() => handleUnpause(pauseTarget as any)} disabled={!pauseTarget || isPending} isLoading={isPending}>解除暫停</ActionButton>
                    </div>
                </AdminSection>
                
                <AdminSection title="核心地址與費用設定">
                    <InputGroup label="DungeonCore 地址 (在 Party 中設定)">
                        <input onChange={e => setAddresses(p => ({...p, dungeonCore: e.target.value}))} placeholder="0x..." className="w-full p-2 border rounded"/>
                        <ActionButton onClick={handleSetDungeonCoreAddress} isLoading={isPending}>設定</ActionButton>
                    </InputGroup>
                    <InputGroup label="遠征 BNB 費用 (ether)">
                        <input onChange={e => setFees(p => ({...p, exploration: e.target.value}))} placeholder="例如: 0.0015" className="w-full p-2 border rounded"/>
                        <ActionButton onClick={handleSetExplorationFee} isLoading={isPending}>設定</ActionButton>
                    </InputGroup>
                </AdminSection>

                <AdminSection title="NFT 元數據 (Base URI)">
                    <InputGroup label="英雄"><input onChange={e => setUris(p => ({...p, hero: e.target.value}))} placeholder="ipfs://cid_hero/" className="w-full p-2 border rounded"/><ActionButton onClick={handleSetHeroUri} isLoading={isPending}>設定</ActionButton></InputGroup>
                    <InputGroup label="聖物"><input onChange={e => setUris(p => ({...p, relic: e.target.value}))} placeholder="ipfs://cid_relic/" className="w-full p-2 border rounded"/><ActionButton onClick={handleSetRelicUri} isLoading={isPending}>設定</ActionButton></InputGroup>
                    <InputGroup label="隊伍"><input onChange={e => setUris(p => ({...p, party: e.target.value}))} placeholder="ipfs://cid_party/" className="w-full p-2 border rounded"/><ActionButton onClick={handleSetPartyUri} isLoading={isPending}>設定</ActionButton></InputGroup>
                </AdminSection>

                <AdminSection title="管理員批量鑄造">
                    <div className="space-y-3">
                        <label className="font-bold block">英雄</label>
                        <input onChange={e => handleBatchStateChange('hero', 'to', e.target.value)} value={batchMintState.hero.to} placeholder="接收方地址" className="w-full p-2 border rounded"/>
                        <div className="grid grid-cols-5 gap-2">
                            {Array(5).fill(0).map((_, i) => (
                                <input key={i} onChange={e => handleBatchStateChange('hero', 'counts', e.target.value, i)} value={batchMintState.hero.counts[i]} placeholder={`${i+1}星`} type="number" className="w-full p-2 border rounded text-center"/>
                            ))}
                        </div>
                        <ActionButton onClick={handleAdminBatchMintHero} isLoading={isPending} className="w-full">批量鑄造英雄</ActionButton>
                    </div>
                     <hr className="border-gray-300 dark:border-gray-600"/>
                     <div className="space-y-3">
                        <label className="font-bold block">聖物</label>
                        <input onChange={e => handleBatchStateChange('relic', 'to', e.target.value)} value={batchMintState.relic.to} placeholder="接收方地址" className="w-full p-2 border rounded"/>
                        <div className="grid grid-cols-5 gap-2">
                            {Array(5).fill(0).map((_, i) => (
                                <input key={i} onChange={e => handleBatchStateChange('relic', 'counts', e.target.value, i)} value={batchMintState.relic.counts[i]} placeholder={`${i+1}星`} type="number" className="w-full p-2 border rounded text-center"/>
                            ))}
                        </div>
                        <ActionButton onClick={handleAdminBatchMintRelic} isLoading={isPending} className="w-full">批量鑄造聖物</ActionButton>
                    </div>
                </AdminSection>
                <AdminSection title="免費單個鑄造 (測試用)">
                    <InputGroup label="英雄">
                        <input onChange={e => setMintHeroArgs(p => ({...p, to: e.target.value}))} placeholder="接收方地址" className="w-full p-2 border rounded"/>
                    </InputGroup>
                    <div className="grid grid-cols-2 gap-2">
                         <InputGroup label="稀有度 (1-5)"><input onChange={e => setMintHeroArgs(p => ({...p, rarity: e.target.value}))} placeholder="1" type="number" className="w-full p-2 border rounded"/></InputGroup>
                         <InputGroup label="戰力"><input onChange={e => setMintHeroArgs(p => ({...p, power: e.target.value}))} placeholder="100" type="number" className="w-full p-2 border rounded"/></InputGroup>
                    </div>
                    <ActionButton onClick={handleAdminMintHero} isLoading={isPending} className="whitespace-nowrap w-full">鑄造英雄</ActionButton>
                    <hr className="border-gray-300 dark:border-gray-600"/>
                    <InputGroup label="聖物">
                        <input onChange={e => setMintRelicArgs(p => ({...p, to: e.target.value}))} placeholder="接收方地址" className="w-full p-2 border rounded"/>
                    </InputGroup>
                     <div className="grid grid-cols-2 gap-2">
                         <InputGroup label="稀有度 (1-5)"><input onChange={e => setMintRelicArgs(p => ({...p, rarity: e.target.value}))} placeholder="1" type="number" className="w-full p-2 border rounded"/></InputGroup>
                         <InputGroup label="容量"><input onChange={e => setMintRelicArgs(p => ({...p, capacity: e.target.value}))} placeholder="1" type="number" className="w-full p-2 border rounded"/></InputGroup>
                    </div>
                    <ActionButton onClick={handleAdminMintRelic} isLoading={isPending} className="whitespace-nowrap w-full">鑄造聖物</ActionButton>
                </AdminSection>

                 <AdminSection title="經濟模型 (USD 計價)">
                    <InputGroup label="英雄鑄造價格"><input onChange={e => setPrices(p => ({...p, hero: e.target.value}))} placeholder="例如: 2" className="w-full p-2 border rounded"/><ActionButton onClick={handleSetHeroPrice} isLoading={isPending}>設定</ActionButton></InputGroup>
                    <InputGroup label="聖物鑄造價格"><input onChange={e => setPrices(p => ({...p, relic: e.target.value}))} placeholder="例如: 2" className="w-full p-2 border rounded"/><ActionButton onClick={handleSetRelicPrice} isLoading={isPending}>設定</ActionButton></InputGroup>
                    <InputGroup label="遠征儲備價格"><input onChange={e => setPrices(p => ({...p, provision: e.target.value}))} placeholder="例如: 5" className="w-full p-2 border rounded"/><ActionButton onClick={handleSetProvisionPrice} isLoading={isPending}>設定</ActionButton></InputGroup>
                </AdminSection>
                
                <AdminSection title="遊戲規則">
                    <InputGroup label="全局獎勵倍率 (1000=100%)"><input onChange={e => setMultiplier(e.target.value)} placeholder="例如: 1200 (代表120%)" className="w-full p-2 border rounded"/><ActionButton onClick={handleSetMultiplier} isLoading={isPending}>設定</ActionButton></InputGroup>
                </AdminSection>

                <AdminSection title="地城數據編輯">
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                        <InputGroup label="地城 ID (1-10)" colSpan="col-span-2"><input onChange={e => setDungeonSettings(p => ({...p, id: e.target.value}))} type="number" className="w-full p-2 border rounded"/></InputGroup>
                        <InputGroup label="要求戰力"><input onChange={e => setDungeonSettings(p => ({...p, power: e.target.value}))} type="number" className="w-full p-2 border rounded"/></InputGroup>
                        <InputGroup label="成功率 (%)"><input onChange={e => setDungeonSettings(p => ({...p, rate: e.target.value}))} type="number" className="w-full p-2 border rounded"/></InputGroup>
                        <InputGroup label="獎勵 (USD)" colSpan="col-span-2"><input onChange={e => setDungeonSettings(p => ({...p, reward: e.target.value}))} className="w-full p-2 border rounded"/></InputGroup>
                    </div>
                    <ActionButton onClick={handleUpdateDungeon} isLoading={isPending} className="w-full">更新地城數據</ActionButton>
                </AdminSection>
                
                <AdminSection title="金庫管理">
                    <ActionButton onClick={handleWithdrawBNB} isLoading={isPending} className="w-full">提出所有 BNB 費用</ActionButton>
                    <ActionButton onClick={handleWithdrawTax} isLoading={isPending} className="w-full">提出所有稅收 $SoulShard</ActionButton>
                </AdminSection>
            </div>
        </section>
    );
};

export default AdminPage;
