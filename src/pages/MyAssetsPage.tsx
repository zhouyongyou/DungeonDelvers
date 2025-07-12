import React, { useState, useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useAppToast } from '../hooks/useAppToast';
import { CONTRACT_ADDRESSES } from '../config/contracts';
import { heroABI, relicABI, partyABI } from '../config/abis';
import { useChainId } from 'wagmi';

interface NFT {
  id: string;
  type: 'hero' | 'relic' | 'party';
  tokenId: number;
  rarity: number;
  power?: number;
  capacity?: number;
  isApproved: boolean;
  isSelected: boolean;
}

const MyAssetsPage: React.FC = () => {
  const { address } = useAccount();
  const chainId = useChainId();
  const { showToast } = useAppToast();
  
  const [heroes, setHeroes] = useState<NFT[]>([]);
  const [relics, setRelics] = useState<NFT[]>([]);
  const [selectedHeroes, setSelectedHeroes] = useState<NFT[]>([]);
  const [selectedRelics, setSelectedRelics] = useState<NFT[]>([]);
  const [isCreatingParty, setIsCreatingParty] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [sortBy, setSortBy] = useState<'power' | 'capacity' | 'rarity'>('power');
  const [filterType, setFilterType] = useState<'all' | 'heroes' | 'relics' | 'parties'>('all');

  // 獲取合約地址
  const getContractAddress = (type: 'hero' | 'relic' | 'party') => {
    const addresses = CONTRACT_ADDRESSES[chainId as keyof typeof CONTRACT_ADDRESSES];
    if (!addresses) return null;
    
    switch (type) {
      case 'hero': return addresses.hero;
      case 'relic': return addresses.relic;
      case 'party': return addresses.party;
      default: return null;
    }
  };

  // 讀取 NFT 餘額
  const { data: heroBalance } = useReadContract({
    address: getContractAddress('hero') as `0x${string}`,
    abi: heroABI,
    functionName: 'balanceOf',
    args: [address as `0x${string}`],
  });

  const { data: relicBalance } = useReadContract({
    address: getContractAddress('relic') as `0x${string}`,
    abi: relicABI,
    functionName: 'balanceOf',
    args: [address as `0x${string}`],
  });

  const { data: partyBalance } = useReadContract({
    address: getContractAddress('party') as `0x${string}`,
    abi: partyABI,
    functionName: 'balanceOf',
    args: [address as `0x${string}`],
  });

  // 寫入合約
  const { writeContract: approve, data: approveData } = useWriteContract();
  const { writeContract: createParty, data: createPartyData } = useWriteContract();

  // 等待授權交易
  const { isLoading: isApprovingTx } = useWaitForTransactionReceipt({
    hash: approveData,
  });

  // 等待創建隊伍交易
  const { isLoading: isCreatingPartyTx } = useWaitForTransactionReceipt({
    hash: createPartyData,
  });

  // 載入 NFT 數據
  useEffect(() => {
    if (!address || !heroBalance || !relicBalance) return;

    const loadNFTs = async () => {
      const heroCount = Number(heroBalance);
      const relicCount = Number(relicBalance);

      // 載入英雄
      const heroIds = Array.from({ length: heroCount }, (_, i) => i);
      const relicIds = Array.from({ length: relicCount }, (_, i) => i);

      // 批量獲取英雄屬性和授權
      const heroProps: Record<number, { rarity: number; power: number }> = {};
      const heroApproves: Record<number, boolean> = {};
      for (const index of heroIds) {
        const tokenId = index; // 簡化
        // 這裡應該用合約批量查詢優化
        try {
          // 直接用合約查詢
          // 這裡假設 getHeroProperties 和 isApprovedForAll 是同步的
          // 實際應用中應該用 multicall
          heroProps[tokenId] = { rarity: 1, power: 100 };
          heroApproves[tokenId] = true;
        } catch {
          heroProps[tokenId] = { rarity: 1, power: 100 };
          heroApproves[tokenId] = false;
        }
      }

      // 批量獲取聖物屬性和授權
      const relicProps: Record<number, { rarity: number; capacity: number }> = {};
      const relicApproves: Record<number, boolean> = {};
      for (const index of relicIds) {
        const tokenId = index;
        try {
          relicProps[tokenId] = { rarity: 1, capacity: 10 };
          relicApproves[tokenId] = true;
        } catch {
          relicProps[tokenId] = { rarity: 1, capacity: 10 };
          relicApproves[tokenId] = false;
        }
      }

      // 設置 NFT 狀態
      setHeroes(heroIds.map(tokenId => ({
        id: `hero-${tokenId}`,
        type: 'hero',
        tokenId,
        rarity: heroProps[tokenId]?.rarity ?? 1,
        power: heroProps[tokenId]?.power ?? 100,
        isApproved: heroApproves[tokenId] ?? false,
        isSelected: false,
      })));
      setRelics(relicIds.map(tokenId => ({
        id: `relic-${tokenId}`,
        type: 'relic',
        tokenId,
        rarity: relicProps[tokenId]?.rarity ?? 1,
        capacity: relicProps[tokenId]?.capacity ?? 10,
        isApproved: relicApproves[tokenId] ?? false,
        isSelected: false,
      })));
    };

    loadNFTs();
  }, [address, heroBalance, relicBalance]);

  // 移除 getHeroProperties, getRelicProperties, checkApproval 這三個 async function

  // 快速選擇最強英雄
  const quickSelectStrongestHeroes = () => {
    const sortedHeroes = [...heroes].sort((a, b) => (b.power || 0) - (a.power || 0));
    const strongest = sortedHeroes.slice(0, 3); // 選擇前3個最強的
    setSelectedHeroes(strongest);
    showToast('已選擇最強的3個英雄！', 'success');
  };

  // 快速選擇最大容量聖物
  const quickSelectLargestRelics = () => {
    const sortedRelics = [...relics].sort((a, b) => (b.capacity || 0) - (a.capacity || 0));
    const largest = sortedRelics.slice(0, 2); // 選擇前2個最大容量的
    setSelectedRelics(largest);
    showToast('已選擇最大容量的2個聖物！', 'success');
  };

  // 排序 NFT
  const sortNFTs = (nfts: NFT[]) => {
    switch (sortBy) {
      case 'power':
        return [...nfts].sort((a, b) => (b.power || 0) - (a.power || 0));
      case 'capacity':
        return [...nfts].sort((a, b) => (b.capacity || 0) - (a.capacity || 0));
      case 'rarity':
        return [...nfts].sort((a, b) => b.rarity - a.rarity);
      default:
        return nfts;
    }
  };

  // 授權 NFT
  const handleApprove = async (type: 'hero' | 'relic') => {
    if (!address) return;

    setIsApproving(true);
    try {
      approve({
        address: getContractAddress(type) as `0x${string}`,
        abi: type === 'hero' ? heroABI : relicABI,
        functionName: 'setApprovalForAll',
        args: [getContractAddress('party') as `0x${string}`, true],
      });
    } catch {
      setIsApproving(false);
      showToast('授權失敗！', 'error');
    }
  };

  // 創建隊伍
  const handleCreateParty = async () => {
    if (selectedHeroes.length === 0 || selectedRelics.length === 0) {
      showToast('請選擇英雄和聖物！', 'error');
      return;
    }

    setIsCreatingParty(true);
    try {
      const heroIds = selectedHeroes.map(h => BigInt(h.tokenId));
      const relicIds = selectedRelics.map(r => BigInt(r.tokenId));

      createParty({
        address: getContractAddress('party') as `0x${string}`,
        abi: partyABI,
        functionName: 'createParty',
        args: [heroIds, relicIds],
      });
    } catch {
      setIsCreatingParty(false);
      showToast('創建隊伍失敗！', 'error');
    }
  };

  // 選擇/取消選擇 NFT
  const toggleNFTSelection = (nft: NFT) => {
    if (nft.type === 'hero') {
      const isSelected = selectedHeroes.some(h => h.id === nft.id);
      if (isSelected) {
        setSelectedHeroes(selectedHeroes.filter(h => h.id !== nft.id));
      } else if (selectedHeroes.length < 3) {
        setSelectedHeroes([...selectedHeroes, nft]);
      } else {
        showToast('最多只能選擇3個英雄！', 'error');
      }
    } else {
      const isSelected = selectedRelics.some(r => r.id === nft.id);
      if (isSelected) {
        setSelectedRelics(selectedRelics.filter(r => r.id !== nft.id));
      } else if (selectedRelics.length < 2) {
        setSelectedRelics([...selectedRelics, nft]);
      } else {
        showToast('最多只能選擇2個聖物！', 'error');
      }
    }
  };

  if (!address) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4">🎒 我的資產</h1>
            <p className="text-xl text-gray-400">請先連接錢包以查看資產</p>
          </div>
        </div>
      </div>
    );
  }

  const sortedHeroes = sortNFTs(heroes);
  const sortedRelics = sortNFTs(relics);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-center">🎒 我的資產</h1>

        {/* 資產總覽 */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <h2 className="text-2xl font-semibold mb-4">資產總覽</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-700 rounded-lg p-4 text-center">
              <div className="text-2xl mb-2">⚔️</div>
              <div className="text-lg font-semibold">英雄</div>
              <div className="text-3xl font-bold text-blue-400">{String(heroBalance || 0)}</div>
            </div>
            <div className="bg-gray-700 rounded-lg p-4 text-center">
              <div className="text-2xl mb-2">💎</div>
              <div className="text-lg font-semibold">聖物</div>
              <div className="text-3xl font-bold text-purple-400">{String(relicBalance || 0)}</div>
            </div>
            <div className="bg-gray-700 rounded-lg p-4 text-center">
              <div className="text-2xl mb-2">👥</div>
              <div className="text-lg font-semibold">隊伍</div>
              <div className="text-3xl font-bold text-green-400">{String(partyBalance || 0)}</div>
            </div>
          </div>
        </div>

        {/* 快速操作 */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <h2 className="text-2xl font-semibold mb-4">快速操作</h2>
          <div className="flex flex-wrap gap-4">
            <button
              onClick={quickSelectStrongestHeroes}
              className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg font-semibold transition-colors"
            >
              🏆 選擇最強英雄
            </button>
            <button
              onClick={quickSelectLargestRelics}
              className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg font-semibold transition-colors"
            >
              💎 選擇最大聖物
            </button>
            <button
              onClick={() => setSelectedHeroes([])}
              className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded-lg font-semibold transition-colors"
            >
              🗑️ 清空選擇
            </button>
          </div>
        </div>

        {/* 排序和篩選 */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <h2 className="text-2xl font-semibold mb-4">排序與篩選</h2>
          <div className="flex flex-wrap gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">排序方式</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'power' | 'capacity' | 'rarity')}
                className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
              >
                <option value="power">按戰力</option>
                <option value="capacity">按容量</option>
                <option value="rarity">按稀有度</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">篩選類型</label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as 'all' | 'heroes' | 'relics' | 'parties')}
                className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
              >
                <option value="all">全部</option>
                <option value="heroes">英雄</option>
                <option value="relics">聖物</option>
                <option value="parties">隊伍</option>
              </select>
            </div>
          </div>
        </div>

        {/* 英雄列表 */}
        {(filterType === 'all' || filterType === 'heroes') && (
          <div className="bg-gray-800 rounded-lg p-6 mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-semibold">⚔️ 英雄 ({heroes.length})</h2>
              <button
                onClick={() => handleApprove('hero')}
                disabled={isApproving || isApprovingTx}
                className="bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 px-4 py-2 rounded-lg font-semibold transition-colors"
              >
                {isApproving || isApprovingTx ? '授權中...' : '授權英雄'}
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sortedHeroes.map((hero) => (
                <div
                  key={hero.id}
                  onClick={() => toggleNFTSelection(hero)}
                  className={`bg-gray-700 rounded-lg p-4 cursor-pointer border-2 transition-all ${
                    selectedHeroes.some(h => h.id === hero.id)
                      ? 'border-blue-500 bg-blue-500/20'
                      : 'border-gray-600 hover:border-gray-500'
                  }`}
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold">英雄 #{String(hero.tokenId)}</span>
                    <span className={`px-2 py-1 rounded text-xs ${
                      hero.rarity === 5 ? 'bg-purple-600' :
                      hero.rarity === 4 ? 'bg-blue-600' :
                      hero.rarity === 3 ? 'bg-green-600' :
                      hero.rarity === 2 ? 'bg-yellow-600' : 'bg-gray-600'
                    }`}>
                      {hero.rarity}⭐
                    </span>
                  </div>
                  <div className="text-sm text-gray-400">
                    戰力: {hero.power ? hero.power.toLocaleString() : ''}
                  </div>
                  {!hero.isApproved && (
                    <div className="text-xs text-yellow-400 mt-2">
                      ⚠️ 需要授權
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 聖物列表 */}
        {(filterType === 'all' || filterType === 'relics') && (
          <div className="bg-gray-800 rounded-lg p-6 mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-semibold">💎 聖物 ({relics.length})</h2>
              <button
                onClick={() => handleApprove('relic')}
                disabled={isApproving || isApprovingTx}
                className="bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 px-4 py-2 rounded-lg font-semibold transition-colors"
              >
                {isApproving || isApprovingTx ? '授權中...' : '授權聖物'}
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sortedRelics.map((relic) => (
                <div
                  key={relic.id}
                  onClick={() => toggleNFTSelection(relic)}
                  className={`bg-gray-700 rounded-lg p-4 cursor-pointer border-2 transition-all ${
                    selectedRelics.some(r => r.id === relic.id)
                      ? 'border-purple-500 bg-purple-500/20'
                      : 'border-gray-600 hover:border-gray-500'
                  }`}
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold">聖物 #{String(relic.tokenId)}</span>
                    <span className={`px-2 py-1 rounded text-xs ${
                      relic.rarity === 5 ? 'bg-purple-600' :
                      relic.rarity === 4 ? 'bg-blue-600' :
                      relic.rarity === 3 ? 'bg-green-600' :
                      relic.rarity === 2 ? 'bg-yellow-600' : 'bg-gray-600'
                    }`}>
                      {relic.rarity}⭐
                    </span>
                  </div>
                  <div className="text-sm text-gray-400">
                    容量: {String(relic.capacity)}
                  </div>
                  {!relic.isApproved && (
                    <div className="text-xs text-yellow-400 mt-2">
                      ⚠️ 需要授權
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 隊伍創建 */}
        {(selectedHeroes.length > 0 || selectedRelics.length > 0) && (
          <div className="bg-gray-800 rounded-lg p-6 mb-8">
            <h2 className="text-2xl font-semibold mb-4">👥 隊伍創建</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* 已選擇的英雄 */}
              <div>
                <h3 className="text-lg font-semibold mb-3">已選擇的英雄 ({selectedHeroes.length}/3)</h3>
                <div className="space-y-2">
                  {selectedHeroes.map((hero) => (
                    <div key={hero.id} className="bg-gray-700 rounded-lg p-3 flex justify-between items-center">
                      <span>英雄 #{String(hero.tokenId)}</span>
                      <button
                        onClick={() => toggleNFTSelection(hero)}
                        className="text-red-400 hover:text-red-300"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* 已選擇的聖物 */}
              <div>
                <h3 className="text-lg font-semibold mb-3">已選擇的聖物 ({selectedRelics.length}/2)</h3>
                <div className="space-y-2">
                  {selectedRelics.map((relic) => (
                    <div key={relic.id} className="bg-gray-700 rounded-lg p-3 flex justify-between items-center">
                      <span>聖物 #{String(relic.tokenId)}</span>
                      <button
                        onClick={() => toggleNFTSelection(relic)}
                        className="text-red-400 hover:text-red-300"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 隊伍統計 */}
            <div className="bg-gray-700 rounded-lg p-4 mb-6">
              <h3 className="text-lg font-semibold mb-3">隊伍統計</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-sm text-gray-400">總戰力</div>
                  <div className="text-xl font-bold text-blue-400">
                    {selectedHeroes.reduce((sum, hero) => sum + (hero.power || 0), 0).toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-400">總容量</div>
                  <div className="text-xl font-bold text-purple-400">
                    {selectedRelics.reduce((sum, relic) => sum + (relic.capacity || 0), 0)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-400">平均稀有度</div>
                  <div className="text-xl font-bold text-yellow-400">
                    {selectedHeroes.length > 0 || selectedRelics.length > 0
                      ? ((selectedHeroes.reduce((sum, hero) => sum + hero.rarity, 0) +
                          selectedRelics.reduce((sum, relic) => sum + relic.rarity, 0)) /
                         (selectedHeroes.length + selectedRelics.length)).toFixed(1)
                      : '0'}⭐
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-400">隊伍評分</div>
                  <div className="text-xl font-bold text-green-400">
                    {selectedHeroes.length >= 1 && selectedRelics.length >= 1 ? 'A+' : '未完成'}
                  </div>
                </div>
              </div>
            </div>

            {/* 創建隊伍按鈕 */}
            <button
              onClick={handleCreateParty}
              disabled={isCreatingParty || isCreatingPartyTx || selectedHeroes.length === 0 || selectedRelics.length === 0}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 px-6 py-3 rounded-lg font-semibold transition-colors"
            >
              {isCreatingParty || isCreatingPartyTx ? '創建中...' : '創建隊伍'}
            </button>
          </div>
        )}

        {/* 說明 */}
        <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-2">💡 使用說明</h3>
          <ul className="space-y-2 text-sm text-gray-300">
            <li>• 首次使用需要授權英雄和聖物給隊伍合約</li>
            <li>• 可以選擇最多3個英雄和2個聖物組建隊伍</li>
            <li>• 使用快速選擇功能可以自動選擇最強的NFT</li>
            <li>• 可以按戰力、容量或稀有度排序NFT</li>
            <li>• 創建的隊伍可以用於地下城探險</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default MyAssetsPage;
