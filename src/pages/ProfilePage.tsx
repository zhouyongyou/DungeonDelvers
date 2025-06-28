import React, { useMemo } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { getContract } from '../config/contracts';
import { EmptyState } from '../components/ui/EmptyState';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

// =================================================================
// 1. 自訂 Hook：處理 Profile NFT 的資料獲取與解析
// =================================================================

/**
 * @dev 一個自訂 Hook，專門用來獲取並解析 Profile NFT 的 tokenURI。
 * 它會回傳 SVG 圖像、NFT 屬性、載入狀態和潛在的錯誤。
 * @param tokenId - 玩家的 Profile NFT ID。
 * @returns {object} 包含 svg, attributes, isLoading, error 的物件。
 */
const useProfileData = (tokenId: bigint | undefined) => {
    const { chainId } = useAccount();
    const playerProfileContract = getContract(chainId, 'playerProfile');

    // 使用 useReadContract 獲取 tokenURI
    const { data: tokenURI, isLoading: isLoadingURI } = useReadContract({
        ...playerProfileContract,
        functionName: 'tokenURI',
        args: [tokenId!], // 使用 '!' 斷言，因為 enabled 屬性會確保 tokenId 在此時已定義
        query: {
            // 【錯誤修正】將 `0n` 改為 `BigInt(0)` 以提高編譯器相容性
            enabled: !!tokenId && tokenId > BigInt(0),
        },
    });

    // 使用 useMemo 來快取解析後的資料，避免不必要的重複計算
    return useMemo(() => {
        // 在處理 tokenURI 之前，先進行嚴格的型別和格式檢查。
        // 確保 tokenURI 不僅存在，而且是一個以 'data:application/json;base64,' 開頭的字串。
        if (isLoadingURI || typeof tokenURI !== 'string' || !tokenURI.startsWith('data:application/json;base64,')) {
            return { isLoading: isLoadingURI, svg: null, attributes: null, error: null };
        }

        try {
            // 解析 Base64 編碼的 JSON
            const jsonString = atob(tokenURI.substring('data:application/json;base64,'.length));
            const json = JSON.parse(jsonString);
            
            // 從 JSON 中提取 SVG 和屬性
            const svgBase64 = json.image.substring('data:image/svg+xml;base64,'.length);
            const svg = atob(svgBase64);
            const attributes = json.attributes;

            return { isLoading: false, svg, attributes, error: null };
        } catch (error) {
            console.error("解析 tokenURI 失敗:", error);
            return { isLoading: false, svg: null, attributes: null, error: '解析個人檔案外觀失敗' };
        }
    }, [tokenURI, isLoadingURI]);
};


// =================================================================
// 2. 經驗條 UI 元件
// =================================================================

interface ExperienceBarProps {
    experience: number;
    level: number;
}

const ExperienceBar: React.FC<ExperienceBarProps> = ({ experience, level }) => {
    // 根據等級計算所需經驗值的公式 (與智能合約保持一致)
    const getExpForLevel = (lvl: number) => lvl > 0 ? Math.pow(lvl - 1, 2) * 100 : 0;
    
    const expForCurrentLevel = getExpForLevel(level);
    const expForNextLevel = getExpForLevel(level + 1);
    
    const expInLevel = experience - expForCurrentLevel;
    const totalExpNeededForLevel = expForNextLevel - expForCurrentLevel;

    // 計算進度百分比，並防止除以零的錯誤
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


// =================================================================
// 3. 頁面主元件
// =================================================================

const ProfilePage: React.FC = () => {
    const { address, chainId } = useAccount();
    const playerProfileContract = getContract(chainId, 'playerProfile');

    // 步驟 1: 獲取玩家的 Profile Token ID
    const { data: rawTokenId, isLoading: isLoadingTokenId } = useReadContract({
        ...playerProfileContract,
        functionName: 'profileTokenOf',
        args: [address!],
        query: { enabled: !!address && !!playerProfileContract }
    });
    
    // 使用 useMemo 將 useReadContract 回傳的 unknown 型別安全地轉換為我們預期的 `bigint | undefined`。
    const tokenId = useMemo(() => (typeof rawTokenId === 'bigint' ? rawTokenId : undefined), [rawTokenId]);

    // 步驟 2: 使用自訂 Hook 獲取並解析 Profile 資料
    const { svg, attributes, isLoading: isLoadingProfile, error } = useProfileData(tokenId);
    
    // 從解析出的屬性中安全地提取等級和經驗值
    const level = Number(attributes?.find((attr: { trait_type: string; }) => attr.trait_type === 'Level')?.value || 0);
    const experience = Number(attributes?.find((attr: { trait_type: string; }) => attr.trait_type === 'Experience')?.value || 0);

    // --- 渲染邏輯 ---

    if (isLoadingTokenId) {
        return <div className="flex justify-center items-center h-64"><LoadingSpinner /></div>;
    }

    // 【錯誤修正】將 `0n` 改為 `BigInt(0)` 以提高編譯器相容性
    if (!tokenId || tokenId === BigInt(0)) {
        return <EmptyState message="您尚未創建個人檔案。完成一次成功的地下城遠征即可自動創建！" />;
    }

    if (error) {
        return <div className="text-center text-red-500 p-8">{error}</div>;
    }
    
    return (
        <section>
            <h2 className="page-title">玩家個人檔案</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center max-w-4xl mx-auto">
                <div className="w-full aspect-square bg-gray-800 rounded-2xl shadow-lg flex items-center justify-center p-4">
                    {isLoadingProfile ? <LoadingSpinner size="h-20 w-20" /> : (
                        // 直接渲染解析後的 SVG 字串
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
                        {/* 確保傳遞給子元件的是 number 型別 */}
                        <ExperienceBar experience={experience} level={level} />
                    </div>
                </div>
            </div>
        </section>
    );
};

export default ProfilePage;
