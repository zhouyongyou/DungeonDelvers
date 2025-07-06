// src/pages/ProfilePage.tsx

import React from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { Buffer } from 'buffer';
import { getContract } from '../config/contracts';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { EmptyState } from '../components/ui/EmptyState';
import { ActionButton } from '../components/ui/ActionButton';
import type { Page } from '../types/page';
import { bsc, bscTestnet } from 'wagmi/chains'; // 導入支援的鏈

// =================================================================
// Section: ProfilePage 主元件
// =================================================================

const ProfilePage: React.FC<{ setActivePage: (page: Page) => void }> = ({ setActivePage }) => {
    const { address, chainId } = useAccount();

    // ★ 核心修正 #1: 在元件頂部加入型別防衛
    if (!chainId || (chainId !== bsc.id && chainId !== bscTestnet.id)) {
        return (
            <section>
                <h2 className="page-title">玩家檔案</h2>
                <div className="card-bg p-10 rounded-xl text-center text-gray-400">
                    <p>請先連接到支援的網路 (BSC 或 BSC 測試網) 以檢視您的檔案。</p>
                </div>
            </section>
        );
    }

    // 現在可以安全地呼叫 getContract
    const playerProfileContract = getContract(chainId, 'playerProfile');

    // 1. 檢查玩家是否已經擁有 Profile NFT
    const { data: tokenId, isLoading: isLoadingTokenId } = useReadContract({
        ...playerProfileContract,
        functionName: 'profileTokenOf',
        args: [address!],
        query: { 
            enabled: !!address && !!playerProfileContract,
            refetchInterval: 10000,
        },
    });

    // 2. 如果擁有，則獲取其 tokenURI
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
                // 增加對 image 欄位的檢查，防止 SVG 解析錯誤
                const svgImage = metadata.image ? Buffer.from(metadata.image.substring('data:image/svg+xml;base64,'.length), 'base64').toString() : '';
                
                return (
                    <div className="card-bg p-6 rounded-2xl shadow-xl flex flex-col items-center">
                        <h3 className="section-title">我的玩家徽章</h3>
                        <div 
                            className="w-full max-w-lg my-4 border-4 border-gray-700 rounded-lg overflow-hidden"
                            dangerouslySetInnerHTML={{ __html: svgImage }} 
                        />
                        <p className="text-sm text-gray-400">這是一個動態的 SBT (靈魂綁定代幣)，它將記錄您在遊戲中的光輝歷程。</p>
                    </div>
                );
            } catch (error) {
                 console.error("解析 Profile SVG 失敗:", error);
                 return <EmptyState message="無法載入您的個人檔案視覺效果。" />;
            }
        }

        // ★ 核心修正 #2: EmptyState 現在可以正確接收 children
        return (
            <EmptyState message="您尚未獲得玩家檔案">
                <p className="text-gray-400 mb-4 max-w-md text-center">
                    您的玩家檔案是一個獨一無二的靈魂綁定代幣 (SBT)，它將在您**首次成功完成地下城遠征**後由系統自動為您鑄造。
                </p>
                <ActionButton onClick={() => setActivePage('dungeon')} className="w-48 h-12">
                    前往地下城
                </ActionButton>
            </EmptyState>
        );
    };

    return (
        <section>
            <h2 className="page-title">玩家檔案</h2>
            {renderContent()}
        </section>
    );
};

export default ProfilePage;
