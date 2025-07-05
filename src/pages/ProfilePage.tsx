import React from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { Buffer } from 'buffer';
import { getContract } from '../config/contracts';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { EmptyState } from '../components/ui/EmptyState';
import { ActionButton } from '../components/ui/ActionButton';
import type { Page } from '../types/page'; // 雖然此頁面未使用，但為保持一致性而保留

// =================================================================
// Section: ProfilePage 主元件
// =================================================================

const ProfilePage: React.FC<{ setActivePage: (page: Page) => void }> = ({ setActivePage }) => {
    const { address, chainId } = useAccount();

    const playerProfileContract = getContract(chainId, 'playerProfile');

    // 1. 檢查玩家是否已經擁有 Profile NFT
    const { data: tokenId, isLoading: isLoadingTokenId } = useReadContract({
        ...playerProfileContract,
        functionName: 'profileTokenOf',
        args: [address!],
        query: { 
            enabled: !!address && !!playerProfileContract,
            refetchInterval: 10000, // 定期刷新以檢查是否已獲得
        },
    });

    // 2. 如果擁有，則獲取其 tokenURI
    const { data: tokenURI, isLoading: isLoadingUri } = useReadContract({
        ...playerProfileContract,
        functionName: 'tokenURI',
        args: [tokenId!],
        query: { enabled: !!tokenId && tokenId > 0n },
    });

    const renderContent = () => {
        if (isLoadingTokenId || (tokenId && tokenId > 0n && isLoadingUri)) {
            return <div className="flex justify-center items-center h-96"><LoadingSpinner /></div>;
        }

        // 如果 tokenId 存在且大於 0，表示玩家已擁有檔案
        if (tokenId && tokenId > 0n && tokenURI) {
            const decodedUri = Buffer.from((tokenURI as string).substring('data:application/json;base64,'.length), 'base64').toString();
            const metadata = JSON.parse(decodedUri);
            const svgImage = Buffer.from(metadata.image.substring('data:image/svg+xml;base64,'.length), 'base64').toString();
            
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
        }

        // 【核心修改】如果玩家沒有檔案，顯示引導訊息，而不是創建按鈕
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
