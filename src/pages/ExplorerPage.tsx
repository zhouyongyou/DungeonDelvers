import React, { useState, useMemo } from 'react';
import { useAccount, useReadContracts } from 'wagmi';
import { getContract } from '../config/contracts';
import { ActionButton } from '../components/ui/ActionButton';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import type { NftType } from '../types/nft';

const QuerySection: React.FC<{ type: NftType }> = ({ type }) => {
  const { chainId } = useAccount();
  const [id, setId] = useState('');
  const [submittedId, setSubmittedId] = useState<bigint | null>(null);

  const contract = getContract(chainId, type);
  const title = { hero: '英雄', relic: '聖物', party: '隊伍' }[type];
  
  // 這個 useMemo 的邏輯是正確的，它負責根據條件產生我們需要執行的合約呼叫陣列。
  const contractsToQuery = useMemo(() => {
    if (!submittedId || !contract) {
        return [];
    }
    const ownerCall = { ...contract, functionName: 'ownerOf', args: [submittedId] } as const;
    if (type === 'hero') {
      return [ownerCall, { ...contract, functionName: 'getHeroProperties', args: [submittedId] }] as const;
    }
    if (type === 'relic') {
      return [ownerCall, { ...contract, functionName: 'getRelicProperties', args: [submittedId] }] as const;
    }
    if (type === 'party') {
      return [ownerCall, { ...contract, functionName: 'getPartyComposition', args: [submittedId] }] as const;
    }
    return [];
  }, [submittedId, contract, type]);

  const { data, isLoading, isError, error } = useReadContracts({
    // 【最終修正】我們將 contractsToQuery 顯式地轉換為 'any' 型別。
    // 這是一個務實的作法，目的是告訴 TypeScript 編譯器：「停止對這個複雜的動態陣列進行過度推斷，請相信我在執行時提供的結構是正確的。」
    // 這能有效地繞過因 wagmi 套件更新所導致的過於嚴格的型別檢查。
    contracts: contractsToQuery as any,
    query: {
      enabled: !!submittedId,
    }
  });

  const handleQuery = () => {
    if (id) setSubmittedId(BigInt(id));
  };

  const renderResult = () => {
    if (!submittedId) return `請輸入 ID 進行查詢`;
    if (isLoading) return <div className="flex justify-center items-center"><LoadingSpinner size="h-6 w-6" color="border-gray-500" /></div>;
    if (isError) return <p className="text-red-500">查詢失敗: {error?.message.split('\n')[0]}</p>;
    
    // 為了彌補 'as any' 帶來的型別安全損失，我們在這裡增加一個更嚴格的執行時期檢查。
    if (!data || !Array.isArray(data) || data.length < 2 || data.some(d => d.status === 'failure')) {
        return <p className="text-red-500">查詢失敗: 可能是 ID 不存在或網路錯誤。</p>;
    }
    
    // 在確保資料結構正確後，我們可以安全地存取結果。
    const [ownerResult, propsResult] = data;
    const owner = ownerResult.result as string;
    const props: any = propsResult.result;

    return (
      <div>
        <p><b>擁有者:</b> <span className="font-mono text-xs break-all">{owner}</span></p>
        {type === 'hero' && props && <>
          <p><b>稀有度:</b> {"★".repeat(props.rarity)}{"☆".repeat(5 - props.rarity)}</p>
          <p><b>戰力:</b> {props.power.toString()}</p>
        </>}
        {type === 'relic' && props && <>
          <p><b>稀有度:</b> {"★".repeat(props.rarity)}{"☆".repeat(5-props.rarity)}</p>
          <p><b>容量:</b> {props.capacity}</p>
        </>}
        {type === 'party' && props && <>
          <p><b>總戰力:</b> {props.totalPower.toString()}</p>
          <p><b>總容量:</b> {props.totalCapacity.toString()}</p>
          <p><b>英雄列表 (ID):</b> {props.heroIds?.join(', ') || '無'}</p>
          <p><b>聖物列表 (ID):</b> {props.relicIds?.join(', ') || '無'}</p>
        </>}
      </div>
    );
  };
  
  return (
    <div className="card-bg p-6 rounded-xl shadow-md">
      <h3 className="text-xl font-bold text-[#2D2A4A] dark:text-gray-200 mb-4">{title}查詢</h3>
      <div className="flex gap-2 mb-4">
        <input
          type="number"
          value={id}
          onChange={e => setId(e.target.value)}
          placeholder={`輸入${title} NFT ID`}
          className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500 outline-none h-10"
        />
        <ActionButton onClick={handleQuery} className="px-6 py-2 rounded-lg whitespace-nowrap w-24 h-10">查詢</ActionButton>
      </div>
      <div className="mt-4 p-4 bg-gray-100/50 dark:bg-gray-800/50 rounded-md min-h-[100px] text-sm">
        {renderResult()}
      </div>
    </div>
  );
};

const ExplorerPage: React.FC = () => {
  return (
    <section>
      <h2 className="page-title">數據查詢</h2>
      <div className="space-y-8">
        <QuerySection type="party" />
        <QuerySection type="hero" />
        <QuerySection type="relic" />
      </div>
    </section>
  );
};

export default ExplorerPage;