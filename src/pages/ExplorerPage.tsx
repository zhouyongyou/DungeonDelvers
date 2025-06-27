import React, { useState, useMemo } from 'react';
import { useAccount, useReadContracts } from 'wagmi';
import { getContract } from '../config/contracts';
import { ActionButton } from '../components/ui/ActionButton';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import type { NftType } from '../types/nft';

// 【修正 C-1】定義一個更明確的型別來幫助 TypeScript
// 這個型別描述了 useReadContracts 中 contracts 陣列元素的樣子
type ContractQuery = {
  address: `0x${string}`;
  abi: readonly any[];
  functionName: string;
  args?: any[];
}

const QuerySection: React.FC<{ type: NftType }> = ({ type }) => {
  const { chainId } = useAccount();
  const [id, setId] = useState('');
  const [submittedId, setSubmittedId] = useState<bigint | null>(null);

  const contract = getContract(chainId, type);
  const title = { hero: '英雄', relic: '聖物', party: '隊伍' }[type];
  
  // 【修正 C-2】讓 useMemo 的回傳值符合我們上面定義的型別
  const contractsToQuery = useMemo((): ContractQuery[] => {
    if (!submittedId || !contract) {
        return [];
    }
    const { address, abi } = contract;
    const ownerCall = { address, abi, functionName: 'ownerOf', args: [submittedId] };

    if (type === 'hero') {
      return [ownerCall, { address, abi, functionName: 'getHeroProperties', args: [submittedId] }];
    }
    if (type === 'relic') {
      return [ownerCall, { address, abi, functionName: 'getRelicProperties', args: [submittedId] }];
    }
    if (type === 'party') {
      return [ownerCall, { address, abi, functionName: 'getPartyComposition', args: [submittedId] }];
    }
    return [];
  }, [submittedId, contract, type]);

  const { data, isLoading, isError, error } = useReadContracts({
    // 【修正 C-3】現在 contractsToQuery 的型別是明確的，不再需要 as any
    contracts: contractsToQuery,
    query: {
      enabled: !!submittedId && contractsToQuery.length > 0,
    }
  });

  const handleQuery = () => {
    if (id) setSubmittedId(BigInt(id));
  };

  const renderResult = () => {
    if (!submittedId) return `請輸入 ID 進行查詢`;
    if (isLoading) return <div className="flex justify-center items-center"><LoadingSpinner size="h-6 w-6" color="border-gray-500" /></div>;
    if (isError) return <p className="text-red-500">查詢失敗: {error?.message.split('\n')[0]}</p>;
    
    if (!data || !Array.isArray(data) || data.length < 2 || data.some(d => d.status === 'failure')) {
        return <p className="text-red-500">查詢失敗: 可能是 ID 不存在或網路錯誤。</p>;
    }
    
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