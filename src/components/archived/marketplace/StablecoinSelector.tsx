// src/components/marketplace/StablecoinSelector.tsx
// 穩定幣選擇器組件

import React from 'react';
import { SUPPORTED_STABLECOINS } from '../../config/marketplace';
import type { StablecoinSymbol } from '../../hooks/useMarketplaceV2Contract';
import { useReadContract } from 'wagmi';
import { formatUnits } from 'viem';
import erc20Abi from '../../abis/ERC20.json';

interface StablecoinSelectorProps {
  selectedTokens: StablecoinSymbol[];
  onToggle: (token: StablecoinSymbol) => void;
  mode: 'single' | 'multiple'; // single: 購買時選擇, multiple: 掛單時多選
  address?: `0x${string}`;
  disabled?: boolean;
}

export const StablecoinSelector: React.FC<StablecoinSelectorProps> = ({
  selectedTokens,
  onToggle,
  mode,
  address,
  disabled = false
}) => {
  return (
    <div className="space-y-3">
      <div className="text-sm font-medium text-gray-300">
        {mode === 'single' ? '選擇支付幣種' : '接受的支付幣種'}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {Object.entries(SUPPORTED_STABLECOINS).map(([symbol, info]) => (
          <StablecoinOption
            key={symbol}
            symbol={symbol as StablecoinSymbol}
            info={info}
            selected={selectedTokens.includes(symbol as StablecoinSymbol)}
            onToggle={onToggle}
            mode={mode}
            address={address}
            disabled={disabled}
          />
        ))}
      </div>
      
      {mode === 'multiple' && selectedTokens.length === 0 && (
        <p className="text-xs text-red-400">請至少選擇一種接受的支付幣種</p>
      )}
    </div>
  );
};

interface StablecoinOptionProps {
  symbol: StablecoinSymbol;
  info: typeof SUPPORTED_STABLECOINS[StablecoinSymbol];
  selected: boolean;
  onToggle: (token: StablecoinSymbol) => void;
  mode: 'single' | 'multiple';
  address?: `0x${string}`;
  disabled?: boolean;
}

const StablecoinOption: React.FC<StablecoinOptionProps> = ({
  symbol,
  info,
  selected,
  onToggle,
  mode,
  address,
  disabled
}) => {
  // 讀取餘額
  const { data: balance } = useReadContract({
    address: info.address as Address,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    enabled: !!address
  });

  const handleClick = () => {
    if (!disabled) {
      onToggle(symbol);
    }
  };

  const isSelected = mode === 'single' ? selected : selected;
  const showBalance = address && balance !== undefined;

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={`
        flex items-center justify-between p-3 rounded-lg border transition-all
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-[#C0A573]'}
        ${isSelected 
          ? 'bg-gray-700 border-[#C0A573] ring-1 ring-[#C0A573]/50' 
          : 'bg-gray-800 border-gray-700'
        }
      `}
    >
      <div className="flex items-center gap-3">
        {mode === 'multiple' ? (
          // 多選時顯示 checkbox
          <div className={`
            w-5 h-5 rounded border-2 flex items-center justify-center
            ${isSelected ? 'bg-[#C0A573] border-[#C0A573]' : 'border-gray-500'}
          `}>
            {isSelected && (
              <svg className="w-3 h-3 text-gray-900" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
          </div>
        ) : (
          // 單選時顯示 radio
          <div className={`
            w-5 h-5 rounded-full border-2 flex items-center justify-center
            ${isSelected ? 'border-[#C0A573]' : 'border-gray-500'}
          `}>
            {isSelected && (
              <div className="w-2.5 h-2.5 rounded-full bg-[#C0A573]" />
            )}
          </div>
        )}
        
        <span className="text-2xl">{info.icon}</span>
        
        <div className="text-left">
          <div className="font-medium text-white">{info.symbol}</div>
          <div className="text-xs text-gray-400">{info.name}</div>
        </div>
      </div>
      
      {showBalance && (
        <div className="text-right">
          <div className="text-sm text-white">
            {formatUnits(balance as bigint, info.decimals)}
          </div>
          <div className="text-xs text-gray-400">餘額</div>
        </div>
      )}
    </button>
  );
};