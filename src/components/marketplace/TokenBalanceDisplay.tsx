// src/components/marketplace/TokenBalanceDisplay.tsx
// 代幣餘額顯示組件

import React from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { formatUnits, type Address } from 'viem';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { SUPPORTED_STABLECOINS } from '../../config/marketplace';
import type { StablecoinSymbol } from '../../hooks/useMarketplaceV2Contract';
import erc20Abi from '../../abis/ERC20.json';

interface TokenBalanceDisplayProps {
    tokens?: StablecoinSymbol[];
    showAllTokens?: boolean;
    className?: string;
    variant?: 'default' | 'compact' | 'detailed';
}

export const TokenBalanceDisplay: React.FC<TokenBalanceDisplayProps> = ({
    tokens,
    showAllTokens = false,
    className = '',
    variant = 'default'
}) => {
    const { address, isConnected } = useAccount();
    
    // 決定要顯示哪些代幣
    const tokensToShow = React.useMemo(() => {
        if (tokens && tokens.length > 0) {
            return tokens;
        }
        if (showAllTokens) {
            return Object.keys(SUPPORTED_STABLECOINS) as StablecoinSymbol[];
        }
        // 默認顯示主要代幣
        return ['USDT', 'BUSD', 'USD1'] as StablecoinSymbol[];
    }, [tokens, showAllTokens]);
    
    if (!isConnected || !address) {
        return (
            <div className={`p-3 bg-gray-800 rounded-lg ${className}`}>
                <p className="text-gray-400 text-sm text-center">請連接錢包查看餘額</p>
            </div>
        );
    }
    
    return (
        <div className={`${className}`}>
            {variant === 'compact' ? (
                <CompactBalanceView address={address} tokens={tokensToShow} />
            ) : variant === 'detailed' ? (
                <DetailedBalanceView address={address} tokens={tokensToShow} />
            ) : (
                <DefaultBalanceView address={address} tokens={tokensToShow} />
            )}
        </div>
    );
};

// 默認視圖
const DefaultBalanceView: React.FC<{ address: Address; tokens: StablecoinSymbol[] }> = ({
    address,
    tokens
}) => {
    return (
        <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-300 mb-3">代幣餘額</h3>
            {tokens.map(symbol => (
                <TokenBalanceItem key={symbol} address={address} symbol={symbol} />
            ))}
        </div>
    );
};

// 緊湊視圖
const CompactBalanceView: React.FC<{ address: Address; tokens: StablecoinSymbol[] }> = ({
    address,
    tokens
}) => {
    return (
        <div className="flex gap-4">
            {tokens.map(symbol => (
                <CompactTokenBalance key={symbol} address={address} symbol={symbol} />
            ))}
        </div>
    );
};

// 詳細視圖
const DetailedBalanceView: React.FC<{ address: Address; tokens: StablecoinSymbol[] }> = ({
    address,
    tokens
}) => {
    return (
        <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-white font-medium mb-4 flex items-center gap-2">
                <span>💰</span>
                錢包餘額
            </h3>
            <div className="space-y-3">
                {tokens.map(symbol => (
                    <DetailedTokenBalance key={symbol} address={address} symbol={symbol} />
                ))}
            </div>
        </div>
    );
};

// 單個代幣餘額項目（默認）
const TokenBalanceItem: React.FC<{ address: Address; symbol: StablecoinSymbol }> = ({
    address,
    symbol
}) => {
    const tokenInfo = SUPPORTED_STABLECOINS[symbol];
    
    const { data: balance, isLoading, error } = useReadContract({
        address: tokenInfo.address as Address,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [address],
    });
    
    if (isLoading) {
        return (
            <div className="flex items-center justify-between p-2 bg-gray-700 rounded">
                <div className="flex items-center gap-2">
                    <span className="text-lg">{tokenInfo.icon}</span>
                    <span className="text-white text-sm">{tokenInfo.symbol}</span>
                </div>
                <LoadingSpinner size="sm" />
            </div>
        );
    }
    
    if (error) {
        return (
            <div className="flex items-center justify-between p-2 bg-gray-700 rounded">
                <div className="flex items-center gap-2">
                    <span className="text-lg">{tokenInfo.icon}</span>
                    <span className="text-white text-sm">{tokenInfo.symbol}</span>
                </div>
                <span className="text-red-400 text-sm">載入失敗</span>
            </div>
        );
    }
    
    const formattedBalance = balance ? formatUnits(balance as bigint, tokenInfo.decimals) : '0';
    const displayBalance = parseFloat(formattedBalance).toFixed(2);
    
    return (
        <div className="flex items-center justify-between p-2 bg-gray-700 rounded">
            <div className="flex items-center gap-2">
                <span className="text-lg">{tokenInfo.icon}</span>
                <span className="text-white text-sm">{tokenInfo.symbol}</span>
            </div>
            <span className="text-white text-sm font-medium">{displayBalance}</span>
        </div>
    );
};

// 緊湊版代幣餘額
const CompactTokenBalance: React.FC<{ address: Address; symbol: StablecoinSymbol }> = ({
    address,
    symbol
}) => {
    const tokenInfo = SUPPORTED_STABLECOINS[symbol];
    
    const { data: balance, isLoading } = useReadContract({
        address: tokenInfo.address as Address,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [address],
    });
    
    if (isLoading) {
        return (
            <div className="flex items-center gap-1">
                <span className="text-sm">{tokenInfo.icon}</span>
                <LoadingSpinner size="xs" />
            </div>
        );
    }
    
    const formattedBalance = balance ? formatUnits(balance as bigint, tokenInfo.decimals) : '0';
    const displayBalance = parseFloat(formattedBalance) > 999 
        ? `${(parseFloat(formattedBalance) / 1000).toFixed(1)}k`
        : parseFloat(formattedBalance).toFixed(1);
    
    return (
        <div className="flex items-center gap-1 text-sm">
            <span>{tokenInfo.icon}</span>
            <span className="text-white font-medium">{displayBalance}</span>
        </div>
    );
};

// 詳細版代幣餘額
const DetailedTokenBalance: React.FC<{ address: Address; symbol: StablecoinSymbol }> = ({
    address,
    symbol
}) => {
    const tokenInfo = SUPPORTED_STABLECOINS[symbol];
    
    const { data: balance, isLoading, error } = useReadContract({
        address: tokenInfo.address as Address,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [address],
    });
    
    if (isLoading) {
        return (
            <div className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                <div className="flex items-center gap-3">
                    <span className="text-2xl">{tokenInfo.icon}</span>
                    <div>
                        <div className="text-white font-medium">{tokenInfo.symbol}</div>
                        <div className="text-xs text-gray-400">{tokenInfo.name}</div>
                    </div>
                </div>
                <LoadingSpinner size="sm" />
            </div>
        );
    }
    
    if (error) {
        return (
            <div className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                <div className="flex items-center gap-3">
                    <span className="text-2xl">{tokenInfo.icon}</span>
                    <div>
                        <div className="text-white font-medium">{tokenInfo.symbol}</div>
                        <div className="text-xs text-gray-400">{tokenInfo.name}</div>
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-red-400 text-sm">載入失敗</div>
                </div>
            </div>
        );
    }
    
    const formattedBalance = balance ? formatUnits(balance as bigint, tokenInfo.decimals) : '0';
    const numericBalance = parseFloat(formattedBalance);
    const displayBalance = numericBalance.toFixed(2);
    const isLowBalance = numericBalance < 10; // 小於 10 顯示為低餘額
    
    return (
        <div className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
            <div className="flex items-center gap-3">
                <span className="text-2xl">{tokenInfo.icon}</span>
                <div>
                    <div className="text-white font-medium">{tokenInfo.symbol}</div>
                    <div className="text-xs text-gray-400">{tokenInfo.name}</div>
                </div>
            </div>
            <div className="text-right">
                <div className={`text-lg font-bold ${isLowBalance ? 'text-yellow-400' : 'text-white'}`}>
                    {displayBalance}
                </div>
                <div className="text-xs text-gray-400">餘額</div>
            </div>
        </div>
    );
};

// 導出 Hook 用於單個代幣餘額查詢
export const useTokenBalance = (tokenSymbol: StablecoinSymbol, userAddress?: Address) => {
    const { address } = useAccount();
    const targetAddress = userAddress || address;
    const tokenInfo = SUPPORTED_STABLECOINS[tokenSymbol];
    
    const { data: balance, isLoading, error, refetch } = useReadContract({
        address: tokenInfo.address as Address,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: targetAddress ? [targetAddress] : undefined,
        enabled: !!targetAddress,
    });
    
    const formattedBalance = React.useMemo(() => {
        if (!balance) return '0';
        return formatUnits(balance as bigint, tokenInfo.decimals);
    }, [balance, tokenInfo.decimals]);
    
    const numericBalance = React.useMemo(() => {
        return parseFloat(formattedBalance);
    }, [formattedBalance]);
    
    return {
        balance: balance as bigint | undefined,
        formattedBalance,
        numericBalance,
        isLoading,
        error,
        refetch
    };
};