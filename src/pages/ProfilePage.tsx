// src/pages/ProfilePage.tsx (移除 SVG 邏輯版)

import React, { useMemo } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { useQuery } from '@tanstack/react-query';
import { getContract } from '../config/contracts';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { EmptyState } from '../components/ui/EmptyState';
import { ActionButton } from '../components/ui/ActionButton';
import type { Page } from '../types/page';
import { bsc } from 'wagmi/chains';
import { isAddress, type Address } from 'viem';
import { logger } from '../utils/logger';

// =================================================================
// Section: GraphQL 查詢與數據獲取 Hooks
// =================================================================

const THE_GRAPH_API_URL = import.meta.env.VITE_THE_GRAPH_STUDIO_API_URL;

// 查詢玩家的個人檔案核心數據
const GET_PLAYER_PROFILE_QUERY = `
  query GetPlayerProfile($owner: ID!) {
    player(id: $owner) {
      profile {
        tokenId
        experience
      }
    }
  }
`;

// 從 URL 獲取要顯示的地址
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

// ★ 核心改造：新的 Hook，用於獲取玩家檔案數據
const usePlayerProfile = (targetAddress: Address | undefined) => {
    const { chainId } = useAccount();
    const playerProfileContract = getContract(chainId === bsc.id ? chainId : bsc.id, 'playerProfile');

    // 步驟 1: 從 The Graph 快速獲取 tokenId 和 experience
    const { data: graphData, isLoading: isLoadingGraph, isError } = useQuery({
        queryKey: ['playerProfile', targetAddress],
        queryFn: async () => {
            if (!targetAddress || !THE_GRAPH_API_URL) return null;
            const response = await fetch(THE_GRAPH_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: GET_PLAYER_PROFILE_QUERY,
                    variables: { owner: targetAddress.toLowerCase() },
                }),
            });
            if (!response.ok) throw new Error('GraphQL Network response was not ok');
            const { data } = await response.json();
            return data.player?.profile;
        },
        enabled: !!targetAddress && chainId === bsc.id,
    });

    const tokenId = useMemo(() => graphData?.tokenId ? BigInt(graphData.tokenId) : null, [graphData]);

    // 步驟 2: 使用從 The Graph 獲取的 tokenId 來讀取 tokenURI
    const { data: tokenURI, isLoading: isLoadingUri } = useReadContract({
        address: playerProfileContract?.address as `0x${string}`,
        abi: playerProfileContract?.abi,
        functionName: 'tokenURI',
        args: [tokenId!],
        query: { 
            enabled: !!tokenId && !!playerProfileContract,
            staleTime: 1000 * 60 * 30, // 30分鐘 - 個人檔案 tokenURI 相對穩定
            gcTime: 1000 * 60 * 60 * 2, // 2小時
            refetchOnWindowFocus: false,
            retry: 2,
        },
    });

    return {
        tokenId,
        tokenURI,
        isLoading: isLoadingGraph || (!!tokenId && isLoadingUri),
        isError,
        hasProfile: !!graphData,
    };
};

// =================================================================
// Section: 主頁面元件
// =================================================================

const ProfilePage: React.FC<{ setActivePage: (page: Page) => void }> = ({ setActivePage }) => {
    const { address: connectedAddress, chainId } = useAccount();
    const targetAddress = useTargetAddress();
    const isMyProfile = targetAddress?.toLowerCase() === connectedAddress?.toLowerCase();

    const { tokenURI, isLoading, isError, hasProfile } = usePlayerProfile(targetAddress);

    if (!chainId || chainId !== bsc.id) {
        return (
            <section>
                <h2 className="page-title">玩家檔案</h2>
                <div className="card-bg p-10 rounded-xl text-center text-gray-400">
                    <p>請先連接到支援的網路 (BSC) 以檢視檔案。</p>
                </div>
            </section>
        );
    }

    const renderContent = () => {
        if (isLoading) {
            return <div className="flex justify-center items-center h-96"><LoadingSpinner /></div>;
        }

        if (isError) {
            return <EmptyState message="讀取玩家檔案時發生錯誤，請稍後再試。" />;
        }

        if (hasProfile && tokenURI) {
            try {
                // 移除 SVG 解析邏輯，直接使用靜態圖片
                const profileImage = '/assets/images/collections/profile-logo.png';
                
                return (
                    <div className="card-bg p-6 rounded-2xl shadow-xl flex flex-col items-center">
                        <h3 className="section-title">{isMyProfile ? '我的玩家徽章' : '玩家徽章'}</h3>
                        <p className="font-mono text-xs break-all bg-black/20 p-2 rounded text-gray-400 mb-4">{targetAddress}</p>
                        <div className="w-full max-w-lg my-4 border-4 border-gray-700 rounded-lg overflow-hidden">
                            <img 
                                src={profileImage} 
                                alt="玩家檔案" 
                                className="w-full h-auto"
                                onError={(e) => {
                                    // 如果圖片載入失敗，顯示預設內容
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = 'none';
                                    target.parentElement!.innerHTML = `
                                        <div class="w-full aspect-square bg-gray-800 flex items-center justify-center">
                                            <div class="text-center">
                                                <div class="text-6xl mb-4">👤</div>
                                                <div class="text-xl font-bold text-white">玩家檔案</div>
                                                <div class="text-sm text-gray-400">Profile #{tokenId?.toString() || 'N/A'}</div>
                                            </div>
                                        </div>
                                    `;
                                }}
                            />
                        </div>
                        <p className="text-sm text-gray-400">這是一個動態的 SBT (靈魂綁定代幣)，它記錄了該玩家在遊戲中的光輝歷程。</p>
                    </div>
                );
            } catch (error) {
                 logger.error("解析 Profile 失敗:", error);
                 return <EmptyState message="無法載入此玩家的個人檔案視覺效果。" />;
            }
        }

        if (isMyProfile) {
            return (
                <EmptyState message="您尚未獲得玩家檔案">
                    <p className="text-gray-400 mb-4 max-w-md text-center">您的玩家檔案是一個獨一無二的靈魂綁定代幣 (SBT)，它將在您**首次成功完成地下城遠征**後由系統自動為您鑄造。</p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <ActionButton onClick={() => setActivePage('dungeon')} className="w-48 h-12">前往地下城</ActionButton>
                        <ActionButton onClick={() => setActivePage('mint')} className="w-48 h-12 bg-teal-600 hover:bg-teal-500">前往鑄造</ActionButton>
                    </div>
                </EmptyState>
            );
        }

        return <EmptyState message="該玩家尚未創建個人檔案。" />;
    };

    return (
        <section>
            <h2 className="page-title">{isMyProfile ? '我的個人檔案' : '玩家檔案查詢'}</h2>
            {renderContent()}
        </section>
    );
};

export default ProfilePage;
