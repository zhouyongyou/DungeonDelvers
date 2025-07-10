// src/components/ui/NftCard.tsx

import React, { memo, useState, useMemo, useCallback } from 'react';
import { useReadContract } from 'wagmi';
import { Buffer } from 'buffer';
import { getContract } from '../../config/contracts';
import { bsc } from 'wagmi/chains';
// 導入網路監控 Hook（注意：如果模組找不到，請確保已創建對應文件）
// import { useNetworkMonitoring } from '../../hooks/useNetworkMonitoring';
import type { AnyNft, NftType, HeroNft, RelicNft, PartyNft, VipNft } from '../../types/nft';

interface NftCardProps {
  nft: AnyNft;
  onSelect?: (id: bigint, type: NftType) => void;
  isSelected?: boolean;
}

// 輔助元件，用於產生星星評級，確保視覺一致性
const StarRating: React.FC<{ rating: number }> = memo(({ rating }) => (
  <div className="flex justify-center items-center text-yellow-400 my-1">
    {Array.from({ length: 5 }, (_, i) => (
      <span key={i} className={i < rating ? 'text-yellow-400' : 'text-gray-600'}>
        ★
      </span>
    ))}
  </div>
));

// VIP卡專用的圖片顯示組件 - 增強版本
const VipImage: React.FC<{ nft: VipNft; fallbackImage: string }> = memo(({ nft, fallbackImage }) => {
  const vipStakingContract = getContract(bsc.id, 'vipStaking');
  const [hasError, setHasError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [loadingState, setLoadingState] = useState<'loading' | 'success' | 'error' | 'retrying'>('loading');
  const maxRetries = 2;
  
  const { data: tokenURI, isLoading, error, refetch } = useReadContract({
    ...vipStakingContract,
    functionName: 'tokenURI',
    args: [nft.id],
    query: { 
      enabled: !!vipStakingContract && !hasError && retryCount <= maxRetries,
      staleTime: 1000 * 60 * 5, // 5分鐘緩存
      retry: (failureCount, error) => {
        if (failureCount < maxRetries) {
          console.log(`VIP NFT ${nft.id} 載入失敗，正在重試 (${failureCount + 1}/${maxRetries})...`);
          setRetryCount(failureCount + 1);
          setLoadingState('retrying');
          return true;
        }
        return false;
      },
      onSuccess: () => {
        setLoadingState('success');
        setRetryCount(0);
      },
      onError: (err) => {
        console.error(`VIP NFT ${nft.id} 載入失敗:`, err);
        setLoadingState('error');
      }
    },
  });

  const svgImage = useMemo(() => {
    if (!tokenURI) return null;
    try {
      const uriString = typeof tokenURI === 'string' ? tokenURI : '';
      if (!uriString.startsWith('data:application/json;base64,')) {
        // 如果是直接的 URL，檢查是否為有效的 SVG 數據 URI
        if (uriString.startsWith('data:image/svg+xml')) {
          return uriString;
        }
        // 否則嘗試作為普通 URL 處理
        return uriString;
      }
      const decodedUri = Buffer.from(uriString.substring('data:application/json;base64,'.length), 'base64').toString();
      const metadata = JSON.parse(decodedUri);
      
      // VIP等級信息已通過metadata.attributes提供，不需要額外狀態管理
      
      return metadata.image;
    } catch (e) {
      console.error(`解析 VIP 卡 ${nft.id} SVG 失敗:`, e);
      setHasError(true);
      setLoadingState('error');
      return null;
    }
  }, [tokenURI, nft.id]);

  // 重試函數
  const handleRetry = useCallback(() => {
    if (retryCount < maxRetries) {
      setHasError(false);
      setLoadingState('retrying');
      setTimeout(() => {
        refetch();
      }, 1000);
    }
  }, [retryCount, maxRetries, refetch]);

  // 載入狀態顯示
  if (isLoading || loadingState === 'loading') {
    return (
      <div className="w-full h-full bg-gray-700 rounded-lg flex flex-col items-center justify-center p-2">
        <div className="animate-spin w-6 h-6 border-2 border-yellow-400 border-t-transparent rounded-full mb-1"></div>
        <span className="text-xs text-gray-400">載入中...</span>
      </div>
    );
  }

  // 重試狀態顯示
  if (loadingState === 'retrying') {
    return (
      <div className="w-full h-full bg-gray-700 rounded-lg flex flex-col items-center justify-center p-2">
        <div className="animate-pulse w-6 h-6 bg-yellow-400 rounded-full mb-1"></div>
        <span className="text-xs text-yellow-400">重試中 ({retryCount}/{maxRetries})</span>
      </div>
    );
  }

  // 錯誤狀態顯示 - 更友好的錯誤界面
  if (hasError || error || loadingState === 'error') {
    return (
      <div className="w-full h-full bg-gray-700 rounded-lg flex flex-col items-center justify-center p-2">
        <div className="text-red-400 text-sm mb-1">⚠️</div>
        <span className="text-xs text-red-400 text-center mb-1">載入失敗</span>
        {retryCount < maxRetries && (
          <button 
            onClick={handleRetry}
            className="text-xs text-blue-400 hover:text-blue-300 underline px-1 py-0.5 rounded transition-colors"
            disabled={loadingState === 'retrying'}
          >
            重試
          </button>
        )}
        {retryCount >= maxRetries && (
          <span className="text-xs text-gray-500">使用預設圖片</span>
        )}
      </div>
    );
  }

  // 沒有 SVG 圖片時的回退處理
  if (!svgImage) {
    return (
      <img 
        src={nft.image?.replace('ipfs://', 'https://ipfs.io/ipfs/') || fallbackImage} 
        onError={(e) => { 
          console.warn(`VIP NFT ${nft.id} 回退圖片載入失敗，使用預設圖片`);
          e.currentTarget.src = fallbackImage; 
        }} 
        onLoad={() => console.log(`VIP NFT ${nft.id} 使用回退圖片載入成功`)}
        alt={nft.name || `VIP #${nft.id.toString()}`} 
        className="w-full h-full object-cover bg-gray-700 transition-transform duration-300 hover:scale-110" 
        loading="lazy"
      />
    );
  }

  // 正常顯示 SVG
  return (
    <img 
      src={svgImage} 
      onError={(e) => {
        console.error(`VIP NFT ${nft.id} SVG 載入失敗，嘗試回退`);
        setHasError(true);
        setLoadingState('error');
      }}
      onLoad={() => {
        console.log(`VIP NFT ${nft.id} SVG 載入成功`);
        setLoadingState('success');
      }}
      alt={nft.name || `VIP #${nft.id.toString()}`} 
      className="w-full h-full object-cover bg-gray-700 transition-transform duration-300 hover:scale-110" 
      loading="lazy"
    />
  );
});

// NFT 卡片的主元件
const NftCardComponent: React.FC<NftCardProps> = ({ nft, onSelect, isSelected }) => {
  const { id, name, image, type } = nft;
  const fallbackImage = `https://placehold.co/200x200/1F1D36/C0A573?text=${type}+%23${id}`;
  const imageUrl = image?.replace('ipfs://', 'https://ipfs.io/ipfs/');

  // 根據不同的 NFT 種類，渲染對應的屬性
  const renderAttributes = () => {
    switch (nft.type) {
      case 'hero': {  // ✅ 添加大括號
        const hero = nft as HeroNft;
        return (
          <>
            <StarRating rating={hero.rarity} />
            <p className="text-lg font-bold text-indigo-400">{hero.power.toString()} MP</p>
          </>
        );
      }
      case 'relic': {  // ✅ 添加大括號
        const relic = nft as RelicNft;
        return (
          <>
            <StarRating rating={relic.rarity} />
            <p className="text-lg font-bold text-teal-400">容量: {relic.capacity}</p>
          </>
        );
      }
      case 'party': {  // ✅ 添加大括號
        const party = nft as PartyNft;
        return (
          <>
            <StarRating rating={party.partyRarity} />
            <div className="text-xs text-gray-400 flex justify-center items-center gap-2">
                <span>英雄: {party.heroIds.length}</span>
                <span>/</span>
                <span>聖物: {party.relicIds.length}</span>
            </div>
            <p className="text-lg font-bold mt-1 text-green-400">{party.totalPower.toString()} MP</p>
          </>
        );
      }
      case 'vip': {  // ✅ 添加大括號並改善VIP顯示
        const vip = nft as VipNft;
        // 嘗試從VIP NFT的屬性中獲取等級信息
        const levelAttr = vip.attributes?.find((attr: any) => attr.trait_type === 'Level');
        const vipLevel = levelAttr?.value || '載入中...';
        
        return (
            <>
                <StarRating rating={5} /> 
                <p className="text-sm font-bold text-yellow-300">VIP 會員卡</p>
                <p className="text-xs text-gray-400">等級 {vipLevel}</p>
            </>
        );
      }
      default:
        return null;
    }
  };

  return (
    <div 
        className={`card-bg p-3 rounded-xl text-center border-2 transition-all duration-300 ease-in-out flex flex-col overflow-hidden hover:shadow-2xl hover:-translate-y-1 active:scale-95 ${isSelected ? 'ring-4 ring-indigo-500 ring-offset-2 ring-offset-gray-800 border-indigo-500' : 'border-transparent'}`}
    >
      <div className={`flex-grow ${onSelect ? 'cursor-pointer' : ''}`} onClick={() => onSelect && onSelect(id, type)}>
        <div className={`w-full mb-2 overflow-hidden rounded-lg aspect-square`}>
            {type === 'vip' ? (
              <VipImage nft={nft as VipNft} fallbackImage={fallbackImage} />
            ) : (
              <img 
                  src={imageUrl || fallbackImage} 
                  onError={(e) => { e.currentTarget.src = fallbackImage; }} 
                  alt={name || `${type} #${id.toString()}`} 
                  className="w-full h-full object-cover bg-gray-700 transition-transform duration-300 hover:scale-110" 
                  loading="lazy"
              />
            )}
        </div>
        <p className="font-bold text-sm truncate text-gray-200">{name || `${type} #${id.toString()}`}</p>
        <div className="min-h-[48px]">
            {renderAttributes()}
        </div>
      </div>
    </div>
  );
};

// 使用 React.memo 進行性能優化，只有在 props 改變時才會重新渲染
export const NftCard = memo(NftCardComponent);
