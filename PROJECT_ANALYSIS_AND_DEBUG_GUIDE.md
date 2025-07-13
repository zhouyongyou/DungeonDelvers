# DungeonDelvers 項目完整分析與調試指南

## 📊 **項目概述**

DungeonDelvers 是一個複雜的 Web3 RPG 遊戲項目，基於 BSC (Binance Smart Chain) 構建，包含以下核心組件：

### **技術棧架構**
- **前端**: React 18 + Vite + TypeScript + Tailwind CSS
- **Web3 集成**: Wagmi 2.5.7 + Viem 2.7.9 
- **狀態管理**: Zustand 4.4.7 + @tanstack/react-query 5.8.4
- **區塊鏈查詢**: Apollo Client 3.8.8 + The Graph
- **智能合約**: 12個 Solidity 合約部署在 BSC
- **後端服務**: Metadata 服務器 (Render.com)
- **子圖索引**: The Graph Studio

### **智能合約生態系統**
```
核心合約 (4個):
├── DungeonCore: 0x4CbAC0E4AEC9Ef3B11C93805483c23224ed1f118
├── Oracle: 0xc5bBFfFf552167D1328432AA856B752e9c4b4838
├── PlayerVault: 0x6187DBCcb58088E414437A6b8d58a42cD2BD1ec4
└── DungeonStorage: 0x976d8C71DbbAaBF1898B9fD8d28dC6Db7B17cD66

NFT合約 (3個):
├── Hero: 0x2a046140668cBb8F598ff3852B08852A8EB23b6a
├── Relic: 0x95F005e2e0d38381576DA36c5CA4619a87da550E
└── Party: 0x11FB68409222B53b04626d382d7e691e640A1DcD

遊戲合約 (3個):
├── DungeonMaster: 0xd14A5eFFc45D0131af3eb876992fC6eD9683f5B0
├── AltarOfAscension: 0x83a7fB85E0892A67041FcFc4c1F0F1111e5aB3DA
└── PlayerProfile: 0x43a9BE911f1074788A00cE8e6E00732c7364c1F4

代幣合約 (2個):
├── SoulShard: 0xc88dAD283Ac209D77Bfe452807d378615AB8B94a
└── VIPStaking: 0xefdfF583944A2c6318d1597AD1E41159fCd8F6dB
```

### **服務端點配置**
```
子圖 API: https://api.studio.thegraph.com/query/115633/dungeon-delvers/1.2.9
後端服務: https://dungeon-delvers-metadata-server.onrender.com
前端生產: https://dungeondelvers.xyz
開發環境: http://localhost:5173
```

---

## 🔍 **當前主要問題分析**

### **1. VIP 等級和稅率減免顯示問題**

**問題描述**: VIP 頁面顯示等級為 0，稅率減免不顯示或顯示為 0

**根本原因分析**:
- VIP 合約地址在前端和後端配置中可能不一致
- `useVipStatus` hook 中的 RPC 調用失敗
- 子圖同步延遲，VIP 數據未及時更新
- `getVipLevel` 和 `getVipTaxReduction` 函數調用錯誤

**技術細節**:
```typescript
// 當前 useVipStatus.ts 中的問題
const { data: vipData, isLoading: isLoadingVipData } = useReadContracts({
    contracts: [
        { ...vipStakingContract, functionName: 'getVipLevel', args: [address!] },
        { ...vipStakingContract, functionName: 'getVipTaxReduction', args: [address!] },
    ],
    query: { enabled: !!address && !!vipStakingContract }
});
```

**影響範圍**: VIP 功能完全失效，用戶無法查看和使用 VIP 特權

---

### **2. 升星祭壇圖片顯示問題**

**問題描述**: 所有 NFT 都顯示為一星英雄圖片，無論實際類型和稀有度

**根本原因分析**:
- `fetchMetadata` 函數返回空的 image 字段
- CDN 配置指向錯誤的 API 端點
- 圖片 URL 構建邏輯錯誤
- 後端 metadata 服務器連接問題

**技術細節**:
```typescript
// src/api/nfts.ts 中的圖片 URL 生成問題
export function getImageUrl(nftType: string, tokenId: string | number, rarity?: number): string {
    // 當前邏輯可能返回錯誤的路徑
    let imagePath = '';
    switch (nftType) {
        case 'hero': {
            const heroRarity = rarity || 1;
            imagePath = `images/hero/hero-${heroRarity}.png`; // 可能路徑不正確
            break;
        }
        // ...
    }
    return `${configs[0].baseUrl}/${imagePath}`;
}
```

**影響範圍**: 用戶體驗嚴重受損，無法正確識別 NFT 類型和稀有度

---

### **3. 配置不一致問題**

**問題描述**: 多個配置文件中的地址和端點不匹配

**發現的不一致**:
- `shared-config.json` vs `src/config/contracts.ts` 中的合約地址
- `src/config/cdn.ts` 中的 development 配置仍指向 localhost:3001
- 環境變量和硬編碼地址混用

**技術細節**:
```json
// shared-config.json 中的配置
{
  "contracts": {
    "vipStaking": "0xefdfF583944A2c6318d1597AD1E41159fCd8F6dB"
  },
  "services": {
    "metadataServer": {
      "development": "https://dungeon-delvers-metadata-server.onrender.com"
    }
  }
}
```

```typescript
// src/config/cdn.ts 中需要修正的配置
development: [
    {
        baseUrl: 'https://dungeon-delvers-metadata-server.onrender.com', // ✅ 正確
        timeout: 3000,
        priority: 1
    },
    {
        baseUrl: window.location.origin, // ⚠️ 可能指向 localhost:5173
        timeout: 1000,
        priority: 2
    }
]
```

---

## 🔧 **詳細調試與修復步驟**

### **階段一: 環境和配置修復**

#### **步驟 1.1: 驗證後端服務狀態**
```bash
# 檢查後端健康狀態
curl -s https://dungeon-delvers-metadata-server.onrender.com/health | jq .

# 預期回應:
# {
#   "status": "healthy",
#   "timestamp": "2024-XX-XX",
#   "services": {
#     "database": "connected",
#     "contracts": "synced"
#   }
# }
```

#### **步驟 1.2: 驗證子圖同步狀態**
```bash
# 檢查子圖最新區塊
curl -X POST https://api.studio.thegraph.com/query/115633/dungeon-delvers/1.2.9 \
  -H "Content-Type: application/json" \
  -d '{
    "query": "{ _meta { block { number } } }"
  }' | jq .

# 對比當前 BSC 區塊高度
curl -X POST https://bsc-dataseed1.binance.org/ \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "eth_blockNumber",
    "params": [],
    "id": 1
  }' | jq .
```

#### **步驟 1.3: 統一配置文件**
```typescript
// 1. 更新 src/config/cdn.ts
const cdnConfig: CDNConfig = {
  development: [
    {
      baseUrl: 'https://dungeon-delvers-metadata-server.onrender.com', // 統一使用線上服務
      timeout: 3000,
      priority: 1
    }
    // 移除 localhost 引用
  ]
};

// 2. 驗證 src/config/contracts.ts 中的地址
const CONTRACT_ADDRESSES = {
  TOKENS: {
    VIP_STAKING: "0xefdfF583944A2c6318d1597AD1E41159fCd8F6dB" // 確保與 shared-config.json 一致
  }
};
```

---

### **階段二: VIP 功能修復**

#### **步驟 2.1: 修復 useVipStatus Hook**
```typescript
// src/hooks/useVipStatus.ts 改進
export const useVipStatus = () => {
    const { address, chainId } = useAccount();
    
    // 確保合約地址正確
    const vipStakingContract = useMemo(() => {
        if (chainId !== bsc.id) return null;
        const contract = getContract(chainId, 'vipStaking');
        console.log('VIP合約地址:', contract?.address); // 調試用
        return contract;
    }, [chainId]);

    // 改進的數據讀取邏輯
    const { data: vipData, isLoading, error, refetch } = useReadContracts({
        contracts: [
            { ...vipStakingContract, functionName: 'userStakes', args: [address!] },
            { ...vipStakingContract, functionName: 'getVipLevel', args: [address!] },
            { ...vipStakingContract, functionName: 'getVipTaxReduction', args: [address!] },
        ],
        query: { 
            enabled: !!address && !!vipStakingContract && chainId === bsc.id,
            retry: 3,
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        }
    });

    // 錯誤處理和調試
    useEffect(() => {
        if (error) {
            console.error('VIP數據讀取錯誤:', error);
        }
        if (vipData) {
            console.log('VIP數據:', vipData);
        }
    }, [error, vipData]);

    return {
        isLoading,
        error,
        vipLevel: vipData?.[1]?.result ?? 0,
        taxReduction: vipData?.[2]?.result ?? 0n,
        stakedAmount: (vipData?.[0]?.result as readonly [bigint, bigint])?.[0] ?? 0n,
        refetch,
        // ... 其他返回值
    };
};
```

#### **步驟 2.2: 添加 VIP 功能測試**
```typescript
// 新增測試工具函數
export const testVipContract = async (address: string) => {
    const client = createPublicClient({
        chain: bsc,
        transport: http('https://bsc-dataseed1.binance.org/')
    });
    
    const vipContract = getContract(bsc.id, 'vipStaking');
    if (!vipContract) throw new Error('VIP合約未找到');
    
    try {
        // 測試各個函數調用
        const [userStakes, vipLevel, taxReduction] = await Promise.all([
            client.readContract({
                ...vipContract,
                functionName: 'userStakes',
                args: [address as Address]
            }),
            client.readContract({
                ...vipContract,
                functionName: 'getVipLevel', 
                args: [address as Address]
            }),
            client.readContract({
                ...vipContract,
                functionName: 'getVipTaxReduction',
                args: [address as Address]
            })
        ]);
        
        console.log('VIP測試結果:', {
            userStakes,
            vipLevel,
            taxReduction,
            contractAddress: vipContract.address
        });
        
        return { userStakes, vipLevel, taxReduction };
    } catch (error) {
        console.error('VIP合約調用失敗:', error);
        throw error;
    }
};
```

---

### **階段三: 升星祭壇圖片修復**

#### **步驟 3.1: 修復元數據獲取邏輯**
```typescript
// src/api/nfts.ts 改進
export async function fetchMetadata(
    uri: string, 
    tokenId: string, 
    contractAddress: string
): Promise<Omit<BaseNft, 'id' | 'contractAddress' | 'type'>> {
    
    // 識別 NFT 類型
    const nftType = identifyNftType(contractAddress);
    console.log(`獲取 ${nftType} #${tokenId} 元數據`);
    
    try {
        // 1. 優先嘗試後端 API
        const metadata = await fetchFromBackendAPI(nftType, tokenId);
        console.log(`${nftType} #${tokenId} 後端API成功`);
        return metadata;
    } catch (backendError) {
        console.log(`後端API失敗，嘗試其他方案:`, backendError);
        
        try {
            // 2. 嘗試本地/CDN資源
            const metadata = await fetchFromLocalResources(nftType, tokenId);
            console.log(`${nftType} #${tokenId} 本地資源成功`);
            return metadata;
        } catch (localError) {
            console.log(`本地資源失敗:`, localError);
            
            // 3. 使用增強的 fallback
            return generateEnhancedFallback(nftType, tokenId, contractAddress);
        }
    }
}

// 新增：智能 NFT 類型識別
function identifyNftType(contractAddress: string): NftType {
    const address = contractAddress.toLowerCase();
    const contracts = getContract(bsc.id, 'hero')?.address.toLowerCase();
    
    if (address === getContract(bsc.id, 'hero')?.address.toLowerCase()) return 'hero';
    if (address === getContract(bsc.id, 'relic')?.address.toLowerCase()) return 'relic';
    if (address === getContract(bsc.id, 'party')?.address.toLowerCase()) return 'party';
    if (address === getContract(bsc.id, 'vipStaking')?.address.toLowerCase()) return 'vip';
    
    return 'hero'; // 默認類型
}

// 新增：後端 API 獲取
async function fetchFromBackendAPI(nftType: NftType, tokenId: string) {
    const baseUrl = 'https://dungeon-delvers-metadata-server.onrender.com';
    let endpoint = '';
    
    switch (nftType) {
        case 'hero':
        case 'relic':
            endpoint = `/api/${nftType}/${tokenId}`;
            break;
        case 'party':
            endpoint = `/api/party/party`;
            break;
        case 'vip':
            endpoint = `/api/vip/vip`;
            break;
    }
    
    const response = await fetch(`${baseUrl}${endpoint}`, {
        headers: {
            'Accept': 'application/json',
            'Cache-Control': 'max-age=300'
        },
        timeout: 5000
    });
    
    if (!response.ok) {
        throw new Error(`API 響應錯誤: ${response.status}`);
    }
    
    return await response.json();
}

// 改進：增強的 fallback 元數據生成
function generateEnhancedFallback(nftType: NftType, tokenId: string, contractAddress: string) {
    // 從合約地址推斷可能的稀有度（如果有模式的話）
    const estimatedRarity = estimateRarityFromTokenId(tokenId);
    
    const baseData = {
        name: `${getNftTypeDisplayName(nftType)} #${tokenId}`,
        description: `這是一個 ${getNftTypeDisplayName(nftType)}，正在載入詳細資訊...`,
        attributes: generateDefaultAttributes(nftType, estimatedRarity),
        source: 'fallback' as const
    };
    
    // 使用改進的圖片 URL 生成
    const imageUrl = generateImageUrl(nftType, estimatedRarity);
    
    return {
        ...baseData,
        image: imageUrl
    };
}

// 新增：智能圖片 URL 生成
function generateImageUrl(nftType: NftType, rarity: number = 1): string {
    const baseUrl = 'https://dungeon-delvers-metadata-server.onrender.com';
    
    switch (nftType) {
        case 'hero':
            return `${baseUrl}/images/hero/hero-${rarity}.png`;
        case 'relic':
            return `${baseUrl}/images/relic/relic-${rarity}.png`;
        case 'party':
            return `${baseUrl}/images/party/party.png`;
        case 'vip':
            return `${baseUrl}/images/vip/vip.png`;
        default:
            return `${baseUrl}/images/placeholder.png`;
    }
}
```

#### **步驟 3.2: 修復 AltarPage 圖片顯示**
```typescript
// src/pages/AltarPage.tsx 改進
const useAltarMaterials = (nftType: NftType, rarity: number) => {
    const { address, chainId } = useAccount();

    return useQuery({
        queryKey: ['altarMaterials', address, chainId, nftType, rarity],
        queryFn: async (): Promise<AnyNft[]> => {
            if (!address || !THE_GRAPH_API_URL) return [];
            
            try {
                const result = await fetchFromGraph(GET_FILTERED_NFTS_QUERY, { 
                    owner: address.toLowerCase(), 
                    rarity 
                });
                
                const assets = nftType === 'hero' ? result.heros : result.relics;
                if (!assets || !Array.isArray(assets)) return [];

                const contractAddress = getContract(bsc.id, nftType === 'hero' ? 'hero' : 'relic')?.address;
                if (!contractAddress) return [];

                return assets.map((asset: any) => {
                    const baseNft = {
                        id: BigInt(asset.tokenId),
                        name: `${nftType === 'hero' ? '英雄' : '聖物'} #${asset.tokenId}`,
                        description: `${rarity}星 ${nftType === 'hero' ? '英雄' : '聖物'}`,
                        contractAddress: contractAddress,
                        tokenId: BigInt(asset.tokenId),
                        source: 'subgraph' as const,
                        // 🔥 關鍵修復：確保圖片URL正確生成
                        image: generateImageUrl(nftType, Number(asset.rarity) || rarity),
                        attributes: [
                            { trait_type: 'Rarity', value: asset.rarity || rarity },
                            ...(nftType === 'hero' 
                                ? [{ trait_type: 'Power', value: asset.power || 0 }]
                                : [{ trait_type: 'Capacity', value: asset.capacity || 0 }]
                            )
                        ]
                    };

                    if (nftType === 'hero') {
                        return {
                            ...baseNft,
                            type: 'hero' as const,
                            power: Number(asset.power) || 0,
                            rarity: Number(asset.rarity) || rarity
                        } as HeroNft;
                    } else {
                        return {
                            ...baseNft,
                            type: 'relic' as const,
                            capacity: Number(asset.capacity) || 0,
                            rarity: Number(asset.rarity) || rarity
                        } as RelicNft;
                    }
                });
            } catch (error) {
                console.error(`獲取 ${nftType} 材料失敗:`, error);
                return [];
            }
        },
        enabled: !!address && chainId === bsc.id && rarity > 0,
        staleTime: 1000 * 30,
        retry: 2,
    });
};
```

---

### **階段四: 性能優化與監控**

#### **步驟 4.1: 實施緩存策略**
```typescript
// 新增：智能緩存管理
class NFTCacheManager {
    private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
    
    set(key: string, data: any, ttl: number = 300000) { // 5分鐘默認TTL
        this.cache.set(key, {
            data,
            timestamp: Date.now(),
            ttl
        });
    }
    
    get(key: string) {
        const item = this.cache.get(key);
        if (!item) return null;
        
        if (Date.now() - item.timestamp > item.ttl) {
            this.cache.delete(key);
            return null;
        }
        
        return item.data;
    }
    
    clear() {
        this.cache.clear();
    }
}

export const nftCache = new NFTCacheManager();
```

#### **步驟 4.2: 添加錯誤監控**
```typescript
// src/utils/errorReporting.ts
export class ErrorReporter {
    static reportError(error: Error, context: string, metadata?: any) {
        console.error(`[${context}] 錯誤:`, error);
        
        // 發送到錯誤監控服務（如 Sentry）
        if (window.location.hostname !== 'localhost') {
            // 生產環境錯誤報告
            fetch('/api/errors', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    error: error.message,
                    stack: error.stack,
                    context,
                    metadata,
                    timestamp: new Date().toISOString(),
                    url: window.location.href,
                    userAgent: navigator.userAgent
                })
            }).catch(console.error);
        }
    }
    
    static reportPerformance(action: string, duration: number, metadata?: any) {
        console.log(`[性能] ${action}: ${duration}ms`, metadata);
        
        // 記錄性能數據
        if (duration > 5000) { // 超過5秒的操作
            this.reportError(
                new Error(`慢操作檢測: ${action}`),
                'performance',
                { duration, ...metadata }
            );
        }
    }
}
```

---

### **階段五: 測試與驗證**

#### **步驟 5.1: 自動化測試腳本**
```bash
#!/bin/bash
# scripts/test-functionality.sh

echo "🧪 開始功能測試..."

# 1. 測試後端健康狀態
echo "1. 測試後端健康狀態..."
curl -f https://dungeon-delvers-metadata-server.onrender.com/health || echo "❌ 後端健康檢查失敗"

# 2. 測試子圖連接
echo "2. 測試子圖連接..."
curl -X POST https://api.studio.thegraph.com/query/115633/dungeon-delvers/1.2.9 \
  -H "Content-Type: application/json" \
  -d '{"query":"{ _meta { block { number } } }"}' || echo "❌ 子圖連接失敗"

# 3. 測試 NFT 元數據端點
echo "3. 測試 NFT 元數據端點..."
curl -f https://dungeon-delvers-metadata-server.onrender.com/api/hero/1 || echo "❌ Hero 元數據失敗"
curl -f https://dungeon-delvers-metadata-server.onrender.com/api/relic/1 || echo "❌ Relic 元數據失敗"

# 4. 測試圖片資源
echo "4. 測試圖片資源..."
curl -f https://dungeon-delvers-metadata-server.onrender.com/images/hero/hero-1.png || echo "❌ Hero 圖片失敗"
curl -f https://dungeon-delvers-metadata-server.onrender.com/images/relic/relic-1.png || echo "❌ Relic 圖片失敗"

echo "✅ 功能測試完成"
```

#### **步驟 5.2: 前端集成測試**
```typescript
// src/tests/integration.test.ts
describe('DungeonDelvers 集成測試', () => {
    test('VIP 狀態獲取', async () => {
        const testAddress = '0x742d35Cc6635C0532925a3b8D29C7dc5B9f4ed87';
        
        const result = await testVipContract(testAddress);
        
        expect(result).toBeDefined();
        expect(result.vipLevel).toBeGreaterThanOrEqual(0);
        expect(result.taxReduction).toBeGreaterThanOrEqual(0n);
    });
    
    test('NFT 元數據獲取', async () => {
        const heroContract = getContract(bsc.id, 'hero');
        const metadata = await fetchMetadata(
            'https://dungeon-delvers-metadata-server.onrender.com/api/hero/1',
            '1',
            heroContract!.address
        );
        
        expect(metadata.name).toBeDefined();
        expect(metadata.image).toBeDefined();
        expect(metadata.attributes).toBeInstanceOf(Array);
    });
    
    test('升星祭壇材料載入', async () => {
        // 測試升星祭壇的材料獲取邏輯
        const materials = await fetchAltarMaterials('hero', 1, testAddress);
        
        expect(Array.isArray(materials)).toBe(true);
        materials.forEach(material => {
            expect(material.type).toBe('hero');
            expect(material.rarity).toBe(1);
            expect(material.image).toMatch(/hero-1\.png$/);
        });
    });
});
```

---

## 🚀 **部署檢查清單**

### **部署前檢查**
- [ ] 所有配置文件中的合約地址一致
- [ ] 後端API端點統一指向生產服務器
- [ ] 環境變量正確設置
- [ ] 子圖數據同步正常
- [ ] 圖片資源可正常訪問
- [ ] VIP 功能正常工作
- [ ] 升星祭壇 NFT 顯示正確
- [ ] 錯誤處理和 fallback 機制完善

### **性能指標**
- [ ] 首次載入時間 < 3秒
- [ ] NFT 圖片載入時間 < 2秒
- [ ] VIP 狀態查詢時間 < 1秒
- [ ] 子圖查詢響應時間 < 2秒

### **用戶體驗檢查**
- [ ] 所有 NFT 圖片正確顯示
- [ ] VIP 等級和特權正確顯示
- [ ] 升星祭壇選擇界面流暢
- [ ] 錯誤消息友好且有用
- [ ] 載入狀態清晰明確

---

## 🔮 **持續監控與維護**

### **監控指標**
1. **技術指標**
   - RPC 調用成功率 > 95%
   - 子圖同步延遲 < 10 區塊
   - API 響應時間 < 2秒
   - 圖片載入成功率 > 98%

2. **業務指標**
   - VIP 功能使用率
   - 升星祭壇成功率
   - 用戶錯誤報告數量
   - 功能使用分佈

### **定期維護任務**
1. **每周**
   - 檢查後端服務健康狀態
   - 驗證子圖數據同步
   - 審查錯誤日誌

2. **每月**
   - 性能基準測試
   - 安全審計
   - 依賴項更新

3. **每季度**
   - 全面功能測試
   - 用戶體驗評估
   - 架構優化評估

---

## 📋 **總結**

DungeonDelvers 項目是一個技術複雜度高的 Web3 應用，當前主要問題集中在：

1. **配置不一致**: 需要統一所有配置文件中的地址和端點
2. **VIP 功能失效**: 合約調用和數據同步問題
3. **圖片顯示錯誤**: 元數據獲取和 URL 生成邏輯問題

通過系統性的診斷和修復，可以解決這些問題並提升整體用戶體驗。建議優先修復 VIP 功能和圖片顯示問題，因為這些直接影響用戶的核心體驗。

修復完成後，需要建立完善的監控和測試機制，確保問題不再復現，並為未來的功能擴展打下堅實基礎。