import React, { useMemo } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { getContract } from '../config/contracts'; // 假設合約設定在此處
import { EmptyState } from '../components/ui/EmptyState';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

// 自訂 Hook，用於解析 tokenURI 中的 SVG 和屬性
const useProfileData = (tokenId: bigint | undefined) => {
    const { chainId } = useAccount();
    const playerProfileContract = getContract(chainId, 'playerProfile');

    const { data: tokenURI, isLoading: isLoadingURI } = useReadContract({
        ...playerProfileContract,
        functionName: 'tokenURI',
        args: [tokenId!],
        query: {
            enabled: !!tokenId && tokenId > 0,
        },
    });

    return useMemo(() => {
        if (!tokenURI) {
            return { isLoading: isLoadingURI, svg: null, attributes: null };
        }
        try {
            // 解析 Base64 編碼的 JSON
            const jsonString = atob(tokenURI.substring('data:application/json;base64,'.length));
            const json = JSON.parse(jsonString);
            
            // 從 JSON 中提取 SVG 和屬性
            const svgBase64 = json.image.substring('data:image/svg+xml;base64,'.length);
            const svg = atob(svgBase64);
            const attributes = json.attributes;

            return { isLoading: false, svg, attributes };
        } catch (error) {
            console.error("解析 tokenURI 失敗:", error);
            return { isLoading: false, svg: null, attributes: null, error: '解析 URI 失敗' };
        }
    }, [tokenURI, isLoadingURI]);
};

// 經驗條元件
const ExperienceBar: React.FC<{ experience: number, level: number }> = ({ experience, level }) => {
    const getExpForLevel = (lvl: number) => lvl > 0 ? (lvl - 1) ** 2 * 100 : 0;
    
    const expForCurrentLevel = getExpForLevel(level);
    const expForNextLevel = getExpForLevel(level + 1);
    
    const expInLevel = experience - expForCurrentLevel;
    const totalExpNeededForLevel = expForNextLevel - expForCurrentLevel;
    const progressPercentage = totalExpNeededForLevel > 0 ? (expInLevel / totalExpNeededForLevel) * 100 : 0;

    return (
        <div className="w-full">
            <div className="flex justify-between text-sm mb-1 text-gray-400">
                <span>等級 {level}</span>
                <span>{expInLevel.toLocaleString()} / {totalExpNeededForLevel.toLocaleString()} EXP</span>
                <span>等級 {level + 1}</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-4 shadow-inner">
                <div 
                    className="bg-gradient-to-r from-purple-500 to-indigo-500 h-4 rounded-full transition-all duration-500"
                    style={{ width: `${progressPercentage}%` }}
                ></div>
            </div>
        </div>
    );
};


const ProfilePage: React.FC = () => {
    const { address, chainId } = useAccount();
    const playerProfileContract = getContract(chainId, 'playerProfile');

    // 1. 獲取玩家的 Profile Token ID
    const { data: tokenId, isLoading: isLoadingTokenId } = useReadContract({
        ...playerProfileContract,
        functionName: 'profileTokenOf',
        args: [address!],
        query: { enabled: !!address && !!playerProfileContract }
    });
    
    // 2. 獲取 Token URI 並解析出 SVG 和屬性
    const { svg, attributes, isLoading: isLoadingProfile, error } = useProfileData(tokenId);
    
    // 從屬性中提取等級和經驗值
    const level = attributes?.find((attr: { trait_type: string; }) => attr.trait_type === 'Level')?.value || 0;
    const experience = attributes?.find((attr: { trait_type: string; }) => attr.trait_type === 'Experience')?.value || 0;

    // 渲染邏輯
    if (isLoadingTokenId) {
        return <div className="flex justify-center items-center h-64"><LoadingSpinner /></div>;
    }

    if (!tokenId || tokenId === 0n) {
        return <EmptyState message="您尚未創建個人檔案。完成一次地下城遠征即可自動創建！" />;
    }

    if (error) {
        return <div className="text-center text-red-500 p-8">讀取個人檔案時發生錯誤。</div>;
    }
    
    return (
        <section>
            <h2 className="page-title">玩家個人檔案</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center max-w-4xl mx-auto">
                <div className="w-full aspect-square bg-gray-800 rounded-2xl shadow-lg flex items-center justify-center p-4">
                    {isLoadingProfile ? <LoadingSpinner size="h-20 w-20" /> : (
                        svg && <div dangerouslySetInnerHTML={{ __html: svg }} className="w-full h-full" />
                    )}
                </div>

                <div className="space-y-6 card-bg p-8 rounded-2xl">
                    <div>
                        <p className="text-gray-400 text-sm">玩家</p>
                        <p className="font-mono text-lg break-all">{address}</p>
                    </div>
                    <div>
                        <p className="text-gray-400 text-sm">等級</p>
                        <p className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-500">{level}</p>
                    </div>
                     <div>
                        <p className="text-gray-400 text-sm mb-2">經驗值進度</p>
                        <ExperienceBar experience={experience} level={level} />
                    </div>
                </div>
            </div>
        </section>
    );
};

export default ProfilePage;
