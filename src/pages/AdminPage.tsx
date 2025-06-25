import React, { useState } from 'react';
import { useAccount, useReadContract, useWriteContract } from 'wagmi';
import { parseEther, type Address } from 'viem';
import { useAppToast } from '../hooks/useAppToast';
import { getContract } from '../config/contracts';
import { ActionButton } from '../components/ui/ActionButton';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

const AdminSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="card-bg p-6 rounded-xl shadow-inner bg-black/5">
        <h3 className="section-title border-b pb-2 mb-4">{title}</h3>
        <div className="space-y-4">{children}</div>
    </div>
);

const InputGroup: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
    <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
        <div className="flex gap-2 items-center">{children}</div>
    </div>
);

const AdminPage: React.FC = () => {
    const { address, chainId } = useAccount();
    const { showToast } = useAppToast();
    const { writeContract, isPending } = useWriteContract({
        mutation: {
            onSuccess: (txHash) => showToast(`管理員操作成功！交易已送出: ${txHash.slice(0,10)}...`, 'success'),
            onError: (err) => showToast(err.message.split('\n')[0], 'error')
        }
    });

    const heroContract = getContract(chainId, 'hero');
    const relicContract = getContract(chainId, 'relic');
    const dungeonCoreContract = getContract(chainId, 'dungeonCore');

    const { data: heroOwner, isLoading: isLoadingOwner } = useReadContract({ 
        ...heroContract, 
        functionName: 'owner',
        query: { enabled: !!heroContract }
    });
    const [mintHeroArgs, setMintHeroArgs] = useState({ to: '', rarity: '1', power: '100' });
    const [mintRelicArgs, setMintRelicArgs] = useState({ to: '', rarity: '1', capacity: '1' });
    const [prices, setPrices] = useState({ hero: '', relic: '', provision: '' });
    const [uris, setUris] = useState({ hero: '', relic: '' });
    const [dungeonSettings, setDungeonSettings] = useState({ id: '1', power: '', reward: '', rate: ''});
    const [multiplier, setMultiplier] = useState('');
    
    if (isLoadingOwner) return <div className="flex justify-center mt-10"><LoadingSpinner /></div>;
    // 【修正】更安全的擁有者檢查，確保 address 和 heroOwner 都存在
    if (!address || !heroOwner || address.toLowerCase() !== heroOwner.toLowerCase()) return <div className="text-center p-8 card-bg">您不是合約擁有者，無法訪問此頁面。</div>;

    const handleAdminMintHero = () => { if(heroContract && mintHeroArgs.to) writeContract({ ...heroContract, functionName: 'adminMint', args: [mintHeroArgs.to as Address, Number(mintHeroArgs.rarity), BigInt(mintHeroArgs.power)] })};
    const handleAdminMintRelic = () => { if(relicContract && mintRelicArgs.to) writeContract({ ...relicContract, functionName: 'adminMint', args: [mintRelicArgs.to as Address, Number(mintRelicArgs.rarity), Number(mintRelicArgs.capacity)] })};
    const handleSetHeroPrice = () => { if(heroContract && prices.hero) writeContract({ ...heroContract, functionName: 'setMintPriceUSD', args: [parseEther(prices.hero)] })};
    const handleSetRelicPrice = () => { if(relicContract && prices.relic) writeContract({ ...relicContract, functionName: 'setMintPriceUSD', args: [parseEther(prices.relic)] })};
    const handleSetProvisionPrice = () => { if(dungeonCoreContract && prices.provision) writeContract({ ...dungeonCoreContract, functionName: 'setProvisionPriceUSD', args: [parseEther(prices.provision)] })};
    const handleSetHeroUri = () => { if(heroContract && uris.hero) writeContract({ ...heroContract, functionName: 'setBaseURI', args: [uris.hero] })};
    const handleSetRelicUri = () => { if(relicContract && uris.relic) writeContract({ ...relicContract, functionName: 'setBaseURI', args: [uris.relic] })};
    const handleUpdateDungeon = () => { if(dungeonCoreContract && dungeonSettings.id && dungeonSettings.power && dungeonSettings.reward && dungeonSettings.rate) writeContract({ ...dungeonCoreContract, functionName: 'updateDungeon', args: [BigInt(dungeonSettings.id), BigInt(dungeonSettings.power), parseEther(dungeonSettings.reward), Number(dungeonSettings.rate)] })};
    const handleSetMultiplier = () => { if(dungeonCoreContract && multiplier) writeContract({ ...dungeonCoreContract, functionName: 'setGlobalRewardMultiplier', args: [BigInt(multiplier)] })};
    const handleWithdrawBNB = () => { if(dungeonCoreContract) writeContract({ ...dungeonCoreContract, functionName: 'withdrawNative' })};
    const handleWithdrawTax = () => { if(dungeonCoreContract) writeContract({ ...dungeonCoreContract, functionName: 'withdrawTaxedTokens' })};

    return (
        <section>
            <h2 className="page-title">DApp 指揮中心</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                <AdminSection title="免費鑄造">
                    <InputGroup label="英雄"><input onChange={e => setMintHeroArgs(p => ({...p, to: e.target.value}))} placeholder="接收方地址" className="w-full p-2 border rounded"/>
                    <input onChange={e => setMintHeroArgs(p => ({...p, rarity: e.target.value}))} placeholder="稀有度 (1-5)" type="number" className="w-full p-2 border rounded"/>
                    <input onChange={e => setMintHeroArgs(p => ({...p, power: e.target.value}))} placeholder="戰力" type="number" className="w-full p-2 border rounded"/>
                    <ActionButton onClick={handleAdminMintHero} isLoading={isPending} className="whitespace-nowrap">鑄造</ActionButton></InputGroup>
                    
                    <InputGroup label="聖物"><input onChange={e => setMintRelicArgs(p => ({...p, to: e.target.value}))} placeholder="接收方地址" className="w-full p-2 border rounded"/>
                    <input onChange={e => setMintRelicArgs(p => ({...p, rarity: e.target.value}))} placeholder="稀有度 (1-5)" type="number" className="w-full p-2 border rounded"/>
                    <input onChange={e => setMintRelicArgs(p => ({...p, capacity: e.target.value}))} placeholder="容量" type="number" className="w-full p-2 border rounded"/>
                    <ActionButton onClick={handleAdminMintRelic} isLoading={isPending} className="whitespace-nowrap">鑄造</ActionButton></InputGroup>
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
                    <InputGroup label="地城 ID (1-10)"><input onChange={e => setDungeonSettings(p => ({...p, id: e.target.value}))} type="number" className="w-full p-2 border rounded"/></InputGroup>
                    <InputGroup label="要求戰力"><input onChange={e => setDungeonSettings(p => ({...p, power: e.target.value}))} type="number" className="w-full p-2 border rounded"/></InputGroup>
                    <InputGroup label="獎勵 (USD)"><input onChange={e => setDungeonSettings(p => ({...p, reward: e.target.value}))} className="w-full p-2 border rounded"/></InputGroup>
                    <InputGroup label="成功率 (%)"><input onChange={e => setDungeonSettings(p => ({...p, rate: e.target.value}))} type="number" className="w-full p-2 border rounded"/></InputGroup>
                    <ActionButton onClick={handleUpdateDungeon} isLoading={isPending} className="w-full">更新地城數據</ActionButton>
                </AdminSection>
                <AdminSection title="NFT 元數據">
                    <InputGroup label="英雄 Base URI"><input onChange={e => setUris(p => ({...p, hero: e.target.value}))} placeholder="例如: ipfs://cid/" className="w-full p-2 border rounded"/><ActionButton onClick={handleSetHeroUri} isLoading={isPending}>設定</ActionButton></InputGroup>
                    <InputGroup label="聖物 Base URI"><input onChange={e => setUris(p => ({...p, relic: e.target.value}))} placeholder="例如: ipfs://cid/" className="w-full p-2 border rounded"/><ActionButton onClick={handleSetRelicUri} isLoading={isPending}>設定</ActionButton></InputGroup>
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