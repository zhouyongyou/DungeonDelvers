// src/pages/ProfilePage.tsx (移除 SVG 邏輯版)

import React, { useMemo } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { useQuery } from '@tanstack/react-query';
import { getContract } from '../config/contracts';
import { formatSoul, formatLargeNumber } from '../utils/formatters';
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
      id
      profile {
        id
        name
        successfulExpeditions
        totalRewardsEarned
        inviter
        commissionEarned
        createdAt
        lastUpdatedAt
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
    const { data: graphData, isLoading: isLoadingGraph, isError, error: graphError } = useQuery({
        queryKey: ['playerProfile', targetAddress],
        queryFn: async () => {
            if (!targetAddress || !THE_GRAPH_API_URL) {
                logger.warn('Missing targetAddress or THE_GRAPH_API_URL', { targetAddress, THE_GRAPH_API_URL });
                return null;
            }
            
            try {
                logger.info('Fetching player profile from The Graph', { 
                    url: THE_GRAPH_API_URL,
                    address: targetAddress.toLowerCase() 
                });
                
                const response = await fetch(THE_GRAPH_API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        query: GET_PLAYER_PROFILE_QUERY,
                        variables: { owner: targetAddress.toLowerCase() },
                    }),
                });
                
                if (!response.ok) {
                    logger.error('GraphQL Network response error:', response.status, response.statusText);
                    throw new Error(`GraphQL Network response was not ok: ${response.status}`);
                }
                
                const result = await response.json();
                logger.info('GraphQL response:', result);
                
                if (result.errors) {
                    logger.error('GraphQL query errors:', result.errors);
                    throw new Error(`GraphQL query failed: ${result.errors.map((e: any) => e.message).join(', ')}`);
                }
                
                return result.data?.player || null;
            } catch (error) {
                logger.error('Error fetching player profile:', error);
                throw error;
            }
        },
        enabled: !!targetAddress && chainId === bsc.id,
        retry: 1, // 只重試一次
        retryDelay: 1000, // 1秒後重試
    });

    const tokenId = useMemo(() => {
        // 嘗試從 profile.id 提取 tokenId，如果 profile.id 是 Bytes，則可能需要轉換
        if (graphData?.profile?.id) {
            try {
                // 如果 profile.id 是地址格式，我們需要查找實際的 tokenId
                // 這裡暫時返回 null，因為 schema 沒有直接提供 tokenId
                return null;
            } catch (error) {
                logger.error('Error parsing tokenId:', error);
                return null;
            }
        }
        return null;
    }, [graphData]);

    // 步驟 2: 檢查該地址是否有 Profile (直接使用地址查詢)
    const { data: hasProfileResult, isLoading: isLoadingProfileCheck } = useReadContract({
        address: playerProfileContract?.address as `0x${string}`,
        abi: playerProfileContract?.abi,
        functionName: 'balanceOf',
        args: [targetAddress!],
        query: { 
            enabled: !!targetAddress && !!playerProfileContract,
            staleTime: 1000 * 60 * 5, // 5分鐘
            gcTime: 1000 * 60 * 30, // 30分鐘
            refetchOnWindowFocus: false,
            retry: 2,
        },
    });

    // 如果有 Profile，嘗試獲取 tokenURI（需要知道 tokenId）
    const hasProfile = hasProfileResult && BigInt(hasProfileResult.toString()) > 0n;

    // 步驟 3: 從合約讀取經驗值
    const { data: experienceResult } = useReadContract({
        address: playerProfileContract?.address as `0x${string}`,
        abi: playerProfileContract?.abi,
        functionName: 'getExperience',
        args: [targetAddress!],
        query: { 
            enabled: !!targetAddress && !!playerProfileContract && hasProfile,
            staleTime: 1000 * 60, // 1分鐘
            gcTime: 1000 * 60 * 10, // 10分鐘
            refetchOnWindowFocus: false,
        },
    });

    // 步驟 4: 從合約讀取等級
    const { data: levelResult } = useReadContract({
        address: playerProfileContract?.address as `0x${string}`,
        abi: playerProfileContract?.abi,
        functionName: 'getLevel',
        args: [targetAddress!],
        query: { 
            enabled: !!targetAddress && !!playerProfileContract && hasProfile,
            staleTime: 1000 * 60, // 1分鐘
            gcTime: 1000 * 60 * 10, // 10分鐘
            refetchOnWindowFocus: false,
        },
    });

    const experience = experienceResult ? BigInt(experienceResult.toString()) : 0n;
    const level = levelResult ? Number(levelResult.toString()) : 1;

    // 調試日誌
    logger.info('PlayerProfile Debug:', {
        targetAddress,
        hasProfile,
        hasGraphProfile: !!graphData?.profile,
        experienceResult,
        experience: experience.toString(),
        levelResult,
        level,
        contractAddress: playerProfileContract?.address,
        graphError: isError,
        graphData,
    });

    return {
        tokenId,
        tokenURI: null, // 暫時設為 null，因為沒有 tokenId 無法獲取 tokenURI
        isLoading: isLoadingGraph || isLoadingProfileCheck,
        isError,
        hasProfile: hasProfile || !!graphData?.profile,
        profileData: graphData?.profile,
        experience,
        level,
    };
};

// =================================================================
// Section: 經驗值計算輔助函數
// =================================================================

// 根據合約公式計算等級所需的經驗值
const getExpRequiredForLevel = (level: number): number => {
    if (level <= 1) return 0;
    return (level - 1) * (level - 1) * 100;
};

// 計算當前經驗值在當前等級的進度
const getExpForNextLevel = (currentExp: bigint, currentLevel: number): number => {
    const currentLevelExp = getExpRequiredForLevel(currentLevel);
    return Number(currentExp) - currentLevelExp;
};

// 計算升級進度百分比
const calculateExpProgress = (currentExp: bigint, currentLevel: number): number => {
    const currentLevelExp = getExpRequiredForLevel(currentLevel);
    const nextLevelExp = getExpRequiredForLevel(currentLevel + 1);
    const expInCurrentLevel = Number(currentExp) - currentLevelExp;
    const expNeededForNextLevel = nextLevelExp - currentLevelExp;
    
    if (expNeededForNextLevel === 0) return 100;
    return Math.min(100, Math.max(0, Math.floor((expInCurrentLevel / expNeededForNextLevel) * 100)));
};

// =================================================================
// Section: 主頁面元件
// =================================================================

const ProfilePage: React.FC<{ setActivePage: (page: Page) => void }> = ({ setActivePage }) => {
    const { address: connectedAddress, chainId } = useAccount();
    const targetAddress = useTargetAddress();
    const isMyProfile = targetAddress?.toLowerCase() === connectedAddress?.toLowerCase();

    const { tokenURI, isLoading, isError, hasProfile, profileData, experience, level } = usePlayerProfile(targetAddress);

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
            logger.info('ProfilePage error details:', { 
                isError, 
                targetAddress, 
                isMyProfile, 
                hasProfile, 
                experience: experience.toString(), 
                level,
                graphError: graphError?.message,
                THE_GRAPH_API_URL
            });
            
            // 如果透過 RPC 查到有 Profile（balance > 0）或有經驗值，但 GraphQL 失敗，顯示基本資訊
            if (hasProfile || experience > 0n) {
                return (
                    <div className="card-bg p-6 rounded-2xl shadow-xl flex flex-col items-center">
                        <h3 className="section-title">{isMyProfile ? '我的玩家徽章' : '玩家徽章'}</h3>
                        <p className="font-mono text-xs break-all bg-black/20 p-2 rounded text-gray-400 mb-4">{targetAddress}</p>
                        
                        <div className="w-full max-w-lg mb-4 p-4 bg-gray-800/50 rounded-lg">
                            <div className="text-center mb-3">
                                <h4 className="text-xl font-bold text-white mb-1">
                                    玩家檔案
                                </h4>
                                
                                <div className="flex items-center justify-center gap-4 my-2">
                                    <div className="bg-gradient-to-r from-yellow-500 to-orange-500 text-black px-3 py-1 rounded-full font-bold">
                                        Lv. {level}
                                    </div>
                                    <div className="text-sm text-gray-300">
                                        經驗值: {experience.toString()}
                                    </div>
                                </div>
                                
                                <div className="w-full mt-2 mb-3">
                                    <div className="text-xs text-gray-400 mb-1">
                                        升級進度: {calculateExpProgress(experience, level)}%
                                    </div>
                                    <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
                                        <div 
                                            className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
                                            style={{ width: `${calculateExpProgress(experience, level)}%` }}
                                        />
                                    </div>
                                </div>
                                
                                <p className="text-sm text-yellow-500 mt-4">
                                    ⚠️ 正在同步子圖資料，部分統計資訊可能暫時無法顯示
                                </p>
                            </div>
                        </div>
                        
                        <div className="w-full max-w-lg my-4 border-4 border-gray-700 rounded-lg overflow-hidden bg-gray-800 flex items-center justify-center aspect-square">
                            <div className="text-center">
                                <div className="text-6xl mb-4">👤</div>
                                <div className="text-xl font-bold text-white">玩家檔案</div>
                                <div className="text-sm text-gray-400">SBT Profile</div>
                            </div>
                        </div>
                        <p className="text-sm text-gray-400">這是一個動態的 SBT (靈魂綁定代幣)，它記錄了該玩家在遊戲中的光輝歷程。</p>
                    </div>
                );
            }
            
            // 如果是自己的檔案且出錯，很可能是沒有檔案，顯示提示
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
            // 如果是別人的檔案，顯示通用錯誤
            return <EmptyState message="讀取玩家檔案時發生錯誤，該玩家可能尚未創建個人檔案。" />;
        }

        if (hasProfile || profileData || experience > 0n) {
            try {
                // 使用靜態圖片和實際的 profile 資料
                const profileImage = '/assets/images/collections/profile-logo.png';
                
                return (
                    <div className="card-bg p-6 rounded-2xl shadow-xl flex flex-col items-center">
                        <h3 className="section-title">{isMyProfile ? '我的玩家徽章' : '玩家徽章'}</h3>
                        <p className="font-mono text-xs break-all bg-black/20 p-2 rounded text-gray-400 mb-4">{targetAddress}</p>
                        
                        {/* 玩家資料顯示 */}
                        <div className="w-full max-w-lg mb-4 p-4 bg-gray-800/50 rounded-lg">
                            <div className="text-center mb-3">
                                <h4 className="text-xl font-bold text-white mb-1">
                                    {profileData?.name || '未命名玩家'}
                                </h4>
                                
                                {/* 等級和經驗值顯示 */}
                                <div className="flex items-center justify-center gap-4 my-2">
                                    <div className="bg-gradient-to-r from-yellow-500 to-orange-500 text-black px-3 py-1 rounded-full font-bold">
                                        Lv. {level}
                                    </div>
                                    <div className="text-sm text-gray-300">
                                        經驗值: {experience.toString()}
                                    </div>
                                </div>
                                
                                {/* 經驗條 */}
                                <div className="w-full mt-2 mb-3">
                                    <div className="text-xs text-gray-400 mb-1">
                                        升級進度: {calculateExpProgress(experience, level)}%
                                    </div>
                                    <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
                                        <div 
                                            className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
                                            style={{ width: `${calculateExpProgress(experience, level)}%` }}
                                        />
                                    </div>
                                    <div className="text-xs text-gray-500 mt-1">
                                        {getExpForNextLevel(experience, level)} / {getExpRequiredForLevel(level + 1)} EXP
                                    </div>
                                </div>
                                
                                {profileData && (
                                    <p className="text-sm text-gray-400">
                                        成功遠征次數: {profileData.successfulExpeditions || 0}
                                    </p>
                                )}
                            </div>
                            
                            {profileData && (
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div className="bg-gray-700/50 p-2 rounded relative">
                                        <div className="flex items-center gap-1">
                                            <p className="text-gray-400">總獎勵</p>
                                            <div className="group relative">
                                                <span className="text-gray-500 hover:text-gray-300 cursor-help text-xs">ⓘ</span>
                                                <div className="absolute bottom-full left-0 mb-1 w-48 p-2 bg-gray-900 border border-gray-700 rounded text-xs text-gray-300 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10">
                                                    <p className="font-semibold text-white mb-1">包含：</p>
                                                    <p>• 遠征獎勵</p>
                                                    <p>• 任務獎勵</p>
                                                    <p>• 活動獎勵</p>
                                                    <p>• 空投獎勵</p>
                                                    <p className="mt-1 text-yellow-400">不含推薦佣金</p>
                                                </div>
                                            </div>
                                        </div>
                                        <p className="text-white font-mono">
                                            {profileData.totalRewardsEarned ? 
                                                formatLargeNumber(BigInt(profileData.totalRewardsEarned)) : 
                                                '0'
                                            } SOUL
                                        </p>
                                    </div>
                                    <div className="bg-gray-700/50 p-2 rounded">
                                        <p className="text-gray-400">佣金收入</p>
                                        <p className="text-white font-mono">
                                            {profileData.commissionEarned ? 
                                                formatLargeNumber(BigInt(profileData.commissionEarned)) : 
                                                '0'
                                            } SOUL
                                        </p>
                                    </div>
                                </div>
                            )}
                            
                            {!profileData && (
                                <p className="text-sm text-yellow-500 mt-2">
                                    ⚠️ 子圖資料同步中，部分統計資訊暫時無法顯示
                                </p>
                            )}
                        </div>
                        
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
                                                <div class="text-xl font-bold text-white">${profileData?.name || '玩家檔案'}</div>
                                                <div class="text-sm text-gray-400">SBT Profile</div>
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
