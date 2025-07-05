import React from 'react';
import { useAccount, useReadContract, useWriteContract } from 'wagmi';
import { Buffer } from 'buffer';
import { getContract } from '../config/contracts';
import { ActionButton } from '../components/ui/ActionButton';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { EmptyState } from '../components/ui/EmptyState';
import { useAppToast } from '../hooks/useAppToast';
import { useTransactionStore } from '../stores/useTransactionStore';
import { Icons } from '../components/ui/icons';

// =================================================================
// Section: ProfilePage 主元件
// =================================================================

const ProfilePage: React.FC = () => {
    const { address, chainId } = useAccount();
    const { showToast } = useAppToast();
    const { addTransaction } = useTransactionStore();

    const playerProfileContract = getContract(chainId, 'playerProfile');
    const { writeContractAsync, isPending: isCreating } = useWriteContract();

    // 1. 檢查玩家是否已經擁有 Profile NFT
    const { data: tokenId, isLoading: isLoadingTokenId, refetch } = useReadContract({
        ...playerProfileContract,
        functionName: 'profileTokenOf',
        args: [address!],
        query: { enabled: !!address && !!playerProfileContract },
    });

    // 2. 如果擁有，則獲取其 tokenURI
    const { data: tokenURI, isLoading: isLoadingUri } = useReadContract({
        ...playerProfileContract,
        functionName: 'tokenURI',
        args: [tokenId!],
        query: { enabled: !!tokenId && tokenId > 0n },
    });

    const handleCreateProfile = async () => {
        if (!playerProfileContract) return;
        try {
            const hash = await writeContractAsync({
                ...playerProfileContract,
                functionName: 'createProfile',
                args: [],
            });
            addTransaction({ hash, description: '創建玩家檔案' });
            // 成功後刷新數據
            setTimeout(() => refetch(), 2000);
        } catch (e: any) {
            if (!e.message.includes('User rejected the request')) {
                showToast(e.shortMessage || "創建失敗", "error");
            }
        }
    };

    const renderContent = () => {
        if (isLoadingTokenId || isLoadingUri) {
            return <div className="flex justify-center items-center h-96"><LoadingSpinner /></div>;
        }

        // 如果 tokenId 存在且大於 0，表示玩家已擁有檔案
        if (tokenId && tokenId > 0n && tokenURI) {
            const decodedUri = Buffer.from(tokenURI.substring('data:application/json;base64,'.length), 'base64').toString();
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

        // 否則，提示玩家創建檔案
        return (
            <EmptyState message="您尚未鑄造您的玩家檔案。">
                <p className="text-gray-400 mb-4 max-w-md text-center">玩家檔案是一個獨一無二的靈魂綁定代幣(SBT)，它將會是您在 Dungeon Delvers 世界中的身份象徵。鑄造是免費的！</p>
                <ActionButton onClick={handleCreateProfile} isLoading={isCreating} className="w-48 h-12">
                    <Icons.Mint className="w-5 h-5 mr-2" />
                    免費鑄造
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
