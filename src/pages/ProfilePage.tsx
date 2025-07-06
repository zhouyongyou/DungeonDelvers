// src/pages/ProfilePage.tsx (引導優化版)

import React, { useMemo } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { Buffer } from 'buffer';
import { getContract } from '../config/contracts';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { EmptyState } from '../components/ui/EmptyState';
import { ActionButton } from '../components/ui/ActionButton';
import type { Page } from '../types/page';
import { bsc, bscTestnet } from 'wagmi/chains';
import { isAddress, type Address } from 'viem';

// ★ 新增：一個自定義 Hook，用於從 URL 獲取要顯示的地址
const useTargetAddress = () => {
    const { address: connectedAddress } = useAccount();
    
    const queryParams = new URLSearchParams(window.location.hash.split('?')[1] || '');
    const queryAddress = queryParams.get('address');

    return useMemo(() => {
        if (queryAddress && isAddress(queryAddress)) {
            return queryAddress as Address;
        }
        return connectedAddress;
    }, [queryAddress, connectedAddress]);
};


// =================================================================
// Section: ProfilePage 主元件
// =================================================================

const ProfilePage: React.FC<{ setActivePage: (page: Page) => void }> = ({ setActivePage }) => {
    const { address: connectedAddress, chainId } = useAccount();
    
    // ★ 修改：使用自定義 Hook 獲取目標地址
    const targetAddress = useTargetAddress();
    const isMyProfile = targetAddress?.toLowerCase() === connectedAddress?.toLowerCase();

    if (!chainId || (chainId !== bsc.id && chainId !== bscTestnet.id)) {
        return (
            <section>
                <h2 className="page-title">玩家檔案</h2>
                <div className="card-bg p-10 rounded-xl text-center text-gray-400">
                    <p>請先連接到支援的網路 (BSC 或 BSC 測試網) 以檢視檔案。</p>
                </div>
            </section>
        );
    }

    const playerProfileContract = getContract(chainId, 'playerProfile');

    const { data: tokenId, isLoading: isLoadingTokenId } = useReadContract({
        ...playerProfileContract,
        functionName: 'profileTokenOf',
        args: [targetAddress!], // ★ 修改：使用目標地址查詢
        query: { 
            enabled: !!targetAddress && !!playerProfileContract,
            refetchInterval: 10000,
        },
    });

    const { data: tokenURI, isLoading: isLoadingUri } = useReadContract({
        ...playerProfileContract,
        functionName: 'tokenURI',
        args: [tokenId!],
        query: { enabled: !!tokenId && tokenId > 0n && !!playerProfileContract },
    });

    const renderContent = () => {
        if (isLoadingTokenId || (tokenId && tokenId > 0n && isLoadingUri)) {
            return <div className="flex justify-center items-center h-96"><LoadingSpinner /></div>;
        }

        if (tokenId && tokenId > 0n && tokenURI) {
            try {
                const decodedUri = Buffer.from((tokenURI as string).substring('data:application/json;base64,'.length), 'base64').toString();
                const metadata = JSON.parse(decodedUri);
                const svgImage = metadata.image ? Buffer.from(metadata.image.substring('data:image/svg+xml;base64,'.length), 'base64').toString() : '';
                
                return (
                    <div className="card-bg p-6 rounded-2xl shadow-xl flex flex-col items-center">
                        {/* ★ 修改：動態顯示標題 */}
                        <h3 className="section-title">{isMyProfile ? '我的玩家徽章' : '玩家徽章'}</h3>
                        <p className="font-mono text-xs break-all bg-black/20 p-2 rounded text-gray-400 mb-4">{targetAddress}</p>
                        <div 
                            className="w-full max-w-lg my-4 border-4 border-gray-700 rounded-lg overflow-hidden"
                            dangerouslySetInnerHTML={{ __html: svgImage }} 
                        />
                        <p className="text-sm text-gray-400">這是一個動態的 SBT (靈魂綁定代幣)，它記錄了該玩家在遊戲中的光輝歷程。</p>
                    </div>
                );
            } catch (error) {
                 console.error("解析 Profile SVG 失敗:", error);
                 return <EmptyState message="無法載入此玩家的個人檔案視覺效果。" />;
            }
        }

        if (isMyProfile) {
            return (
                <EmptyState message="您尚未獲得玩家檔案">
                    <p className="text-gray-400 mb-4 max-w-md text-center">
                        您的玩家檔案是一個獨一無二的靈魂綁定代幣 (SBT)，它將在您**首次成功完成地下城遠征**後由系統自動為您鑄造。
                    </p>
                    {/* ★ 新增：引導按鈕 */}
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <ActionButton onClick={() => setActivePage('dungeon')} className="w-48 h-12">
                            前往地下城
                        </ActionButton>
                        <ActionButton onClick={() => setActivePage('mint')} className="w-48 h-12 bg-teal-600 hover:bg-teal-500">
                            前往鑄造
                        </ActionButton>
                    </div>
                </EmptyState>
            );
        }

        return <EmptyState message="該玩家尚未創建個人檔案。" />;
    };

    return (
        <section>
            {/* ★ 修改：動態顯示頁面大標題 */}
            <h2 className="page-title">{isMyProfile ? '我的個人檔案' : '玩家檔案查詢'}</h2>
            {renderContent()}
        </section>
    );
};

export default ProfilePage;
