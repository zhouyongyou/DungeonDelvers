# Console Statement Management Report

Generated on: 2025-07-13T11:27:48.035Z

## Summary

- Total console statements found: 110
- Files affected: 16
- Statements to remove: 69
- Statements to convert: 41
- Statements to keep: 0

## By Type

- console.log: 69
- console.error: 19
- console.warn: 22

## By File

- src/api/nfts.ts: 32 statements
- src/utils/vipTesting.ts: 28 statements
- src/utils/marketDataIntegrator.ts: 9 statements
- src/hooks/useVipStatus.ts: 9 statements
- src/pages/AltarPage.tsx: 7 statements
- src/config/cdn.ts: 7 statements
- src/hooks/useContractEvents.optimized.ts: 4 statements
- src/hooks/useNetworkMonitoring.ts: 3 statements
- src/pages/VipPage.tsx: 2 statements
- src/components/ui/NftLoadingState.tsx: 2 statements
- src/components/layout/Footer.tsx: 2 statements
- src/utils/rarityConverter.ts: 1 statements
- src/pages/ProfilePage.tsx: 1 statements
- src/config/env.ts: 1 statements
- src/components/ui/ErrorBoundary.tsx: 1 statements
- src/components/common/ErrorBoundary.tsx: 1 statements

## Detailed Changes

### src/utils/vipTesting.ts

- Line 20: **REMOVE** `console.log`
  - Original: `console.log('🧪 開始VIP合約測試...');`
- Line 21: **REMOVE** `console.log`
  - Original: `console.log('測試地址:', address);`
- Line 28: **REMOVE** `console.log`
  - Original: `console.log('VIP合約地址:', vipContract.address);`
- Line 32: **REMOVE** `console.log`
  - Original: `console.log('\n1. 測試合約可訪問性...');`
- Line 35: **REMOVE** `console.log`
  - Original: `console.log('\n2. 測試 userStakes 函數...');`
- Line 41: **REMOVE** `console.log`
  - Original: `console.log('userStakes 結果:', userStakes);`
- Line 44: **REMOVE** `console.log`
  - Original: `console.log('\n3. 測試 getVipLevel 函數...');`
- Line 50: **REMOVE** `console.log`
  - Original: `console.log('getVipLevel 結果:', vipLevel);`
- Line 53: **REMOVE** `console.log`
  - Original: `console.log('\n4. 測試 getVipTaxReduction 函數...');`
- Line 59: **REMOVE** `console.log`
  - Original: `console.log('getVipTaxReduction 結果:', taxReduction);`
- Line 62: **REMOVE** `console.log`
  - Original: `console.log('\n5. 測試 unstakeQueue 函數...');`
- Line 68: **REMOVE** `console.log`
  - Original: `console.log('unstakeQueue 結果:', unstakeQueue);`
- Line 80: **REMOVE** `console.log`
  - Original: `console.log('\n✅ VIP測試完成，結果:');`
- Line 92: **CONVERT** `console.error`
  - Original: `console.error('❌ VIP合約調用失敗:', error);`
  - Replacement: `logger.error('❌ VIP合約調用失敗:', error);`
- Line 101: **REMOVE** `console.log`
  - Original: `console.log('\n🪙 測試 SoulShard 合約...');`
- Line 108: **REMOVE** `console.log`
  - Original: `console.log('SoulShard合約地址:', soulShardContract.address);`
- Line 117: **REMOVE** `console.log`
  - Original: `console.log('SoulShard 餘額:', balance);`
- Line 121: **CONVERT** `console.error`
  - Original: `console.error('❌ SoulShard合約調用失敗:', error);`
  - Replacement: `logger.error('❌ SoulShard合約調用失敗:', error);`
- Line 130: **REMOVE** `console.log`
  - Original: `console.log('🩺 開始VIP狀態診斷...');`
- Line 131: **REMOVE** `console.log`
  - Original: `console.log('='.repeat(50));`
- Line 141: **REMOVE** `console.log`
  - Original: `console.log('\n📊 診斷分析:');`
- Line 144: **REMOVE** `console.log`
  - Original: `console.log('❌ 問題: VIP等級為0或未定義');`
- Line 146: **REMOVE** `console.log`
  - Original: `console.log('💡 原因: 用戶未質押任何SoulShard代幣');`
- Line 148: **REMOVE** `console.log`
  - Original: `console.log('⚠️  原因: 有質押但VIP等級計算有問題');`
- Line 151: **REMOVE** `console.log`
  - Original: `console.log('✅ VIP等級正常:', vipResult.vipLevel);`
- Line 155: **REMOVE** `console.log`
  - Original: `console.log('❌ 問題: 稅率減免為0或未定義');`
- Line 157: **REMOVE** `console.log`
  - Original: `console.log('✅ 稅率減免正常:', `${Number(vipResult.taxReduction) / 100}%`);`
- Line 171: **CONVERT** `console.error`
  - Original: `console.error('❌ VIP診斷失敗:', error);`
  - Replacement: `logger.error('❌ VIP診斷失敗:', error);`

### src/utils/rarityConverter.ts

- Line 48: **CONVERT** `console.warn`
  - Original: `console.warn(`未知的稀有度值: ${input}，使用默認值 Common`);`
  - Replacement: `logger.warn(`未知的稀有度值: ${input}，使用默認值 Common`);`

### src/utils/marketDataIntegrator.ts

- Line 81: **CONVERT** `console.warn`
  - Original: `console.warn(`無法從OKX獲取 ${type} #${tokenId}:`, error);`
  - Replacement: `logger.warn(`無法從OKX獲取 ${type} #${tokenId}:`, error);`
- Line 123: **CONVERT** `console.warn`
  - Original: `console.warn(`無法從Element獲取 ${type} #${tokenId}:`, error);`
  - Replacement: `logger.warn(`無法從Element獲取 ${type} #${tokenId}:`, error);`
- Line 163: **CONVERT** `console.warn`
  - Original: `console.warn(`無法從OpenSea獲取 ${type} #${tokenId}:`, error);`
  - Replacement: `logger.warn(`無法從OpenSea獲取 ${type} #${tokenId}:`, error);`
- Line 195: **CONVERT** `console.warn`
  - Original: `console.warn(`無法從metadata server獲取 ${type} #${tokenId}:`, error);`
  - Replacement: `logger.warn(`無法從metadata server獲取 ${type} #${tokenId}:`, error);`
- Line 236: **CONVERT** `console.warn`
  - Original: `console.warn(`無法從metadata server獲取隊伍 #${tokenId}:`, error);`
  - Replacement: `logger.warn(`無法從metadata server獲取隊伍 #${tokenId}:`, error);`
- Line 256: **REMOVE** `console.log`
  - Original: `console.log(`✅ 從 ${source.name} 獲取到 ${type} #${tokenId} 資料`);`
- Line 260: **CONVERT** `console.warn`
  - Original: `console.warn(`❌ 從 ${source.name} 獲取 ${type} #${tokenId} 失敗:`, error);`
  - Replacement: `logger.warn(`❌ 從 ${source.name} 獲取 ${type} #${tokenId} 失敗:`, error);`
- Line 286: **REMOVE** `console.log`
  - Original: `console.log(`快取刷新成功: ${type} #${tokenId}`, result);`
- Line 289: **CONVERT** `console.warn`
  - Original: `console.warn(`快取刷新失敗 ${type} #${tokenId}:`, error);`
  - Replacement: `logger.warn(`快取刷新失敗 ${type} #${tokenId}:`, error);`

### src/pages/VipPage.tsx

- Line 112: **CONVERT** `console.error`
  - Original: `console.error('等待交易收據時發生錯誤:', error);`
  - Replacement: `logger.error('等待交易收據時發生錯誤:', error);`
- Line 172: **CONVERT** `console.error`
  - Original: `console.error('解析質押金額失敗:', error);`
  - Replacement: `logger.error('解析質押金額失敗:', error);`

### src/pages/ProfilePage.tsx

- Line 157: **CONVERT** `console.error`
  - Original: `console.error("解析 Profile 失敗:", error);`
  - Replacement: `logger.error("解析 Profile 失敗:", error);`

### src/pages/AltarPage.tsx

- Line 57: **REMOVE** `console.log`
  - Original: `console.log('GraphQL查詢結果:', result);`
- Line 61: **CONVERT** `console.warn`
  - Original: `console.warn('GraphQL查詢返回空結果 - 可能是子圖正在同步新合約');`
  - Replacement: `logger.warn('GraphQL查詢返回空結果 - 可能是子圖正在同步新合約');`
- Line 68: **CONVERT** `console.warn`
  - Original: `console.warn(`${nftType} 資產數組為空或不是數組:`, assets, '- 可能是子圖數據尚未同步');`
  - Replacement: `logger.warn(`${nftType} 資產數組為空或不是數組:`, assets, '- 可能是子圖數據尚未同步');`
- Line 74: **CONVERT** `console.error`
  - Original: `console.error(`找不到 ${nftType} 合約地址`);`
  - Replacement: `logger.error(`找不到 ${nftType} 合約地址`);`
- Line 83: **CONVERT** `console.warn`
  - Original: `console.warn(`NFT #${asset.tokenId} 稀有度不匹配: 期望 ${rarity}，實際 ${assetRarity}`);`
  - Replacement: `logger.warn(`NFT #${asset.tokenId} 稀有度不匹配: 期望 ${rarity}，實際 ${assetRarity}`);`
- Line 118: **CONVERT** `console.error`
  - Original: `console.error(`獲取 ${nftType} 材料失敗:`, error);`
  - Replacement: `logger.error(`獲取 ${nftType} 材料失敗:`, error);`
- Line 260: **REMOVE** `console.log`
  - Original: `console.log('升星調試信息:', {`

### src/hooks/useVipStatus.ts

- Line 21: **REMOVE** `console.log`
  - Original: `console.log('🔍 VIP合約地址:', contract?.address);`
- Line 66: **REMOVE** `console.log`
  - Original: `console.log('🔍 VIP合約數據 - 等級:', level, '稅率減免:', `${Number(reduction) / 10000}%`);`
- Line 80: **REMOVE** `console.log`
  - Original: `console.log('🔍 VIP Fallback計算 - 質押金額:', amountInEther.toLocaleString(), 'Soul Shard, 估算USD:', estimatedUSD.toFixed(2));`
- Line 93: **REMOVE** `console.log`
  - Original: `console.log('🔍 VIP Fallback結果 - 等級:', level, '稅率減免:', `${reduction / 10000}%`, '(', reduction, 'BP)');`
- Line 115: **CONVERT** `console.error`
  - Original: `console.error('🚨 VIP數據讀取錯誤:', vipDataError);`
  - Replacement: `logger.error('🚨 VIP數據讀取錯誤:', vipDataError);`
- Line 118: **REMOVE** `console.log`
  - Original: `console.log('📊 VIP數據更新:', {`
- Line 134: **REMOVE** `console.log`
  - Original: `console.log('🔄 刷新VIP狀態...');`
- Line 147: **REMOVE** `console.log`
  - Original: `console.log('✅ VIP狀態刷新完成');`
- Line 149: **CONVERT** `console.error`
  - Original: `console.error('❌ 刷新VIP狀態時發生錯誤:', error);`
  - Replacement: `logger.error('❌ 刷新VIP狀態時發生錯誤:', error);`

### src/hooks/useNetworkMonitoring.ts

- Line 64: **REMOVE** `console.log`
  - Original: `console.log('網路狀態更新:', {`
- Line 76: **REMOVE** `console.log`
  - Original: `console.log('🟢 網路連接已恢復');`
- Line 81: **REMOVE** `console.log`
  - Original: `console.log('🔴 網路連接已斷開');`

### src/hooks/useContractEvents.optimized.ts

- Line 121: **CONVERT** `console.warn`
  - Original: `console.warn(`Failed to decode log for event ${eventName}:`, error);`
  - Replacement: `logger.warn(`Failed to decode log for event ${eventName}:`, error);`
- Line 128: **CONVERT** `console.warn`
  - Original: `console.warn(`Slow event processing: ${eventName} took ${processingTime.toFixed(2)}ms to process ${processedLogs} logs`);`
  - Replacement: `logger.warn(`Slow event processing: ${eventName} took ${processingTime.toFixed(2)}ms to process ${processedLogs} logs`);`
- Line 165: **CONVERT** `console.error`
  - Original: `console.error('Failed to invalidate queries:', error);`
  - Replacement: `logger.error('Failed to invalidate queries:', error);`
- Line 211: **REMOVE** `console.log`
  - Original: `console.log(`Event polling: ${userActivity} mode (${pollingInterval}ms interval)`);`

### src/config/env.ts

- Line 28: **CONVERT** `console.warn`
  - Original: `console.warn('VITE_THE_GRAPH_STUDIO_API_URL is not set, using fallback URL');`
  - Replacement: `logger.warn('VITE_THE_GRAPH_STUDIO_API_URL is not set, using fallback URL');`

### src/config/cdn.ts

- Line 156: **REMOVE** `console.log`
  - Original: `console.log(`🔄 嘗試載入資源: ${url} (優先級 ${config.priority})`);`
- Line 175: **REMOVE** `console.log`
  - Original: `console.log(`✅ 資源載入成功: ${url}`);`
- Line 184: **REMOVE** `console.log`
  - Original: `console.log(`❌ 資源載入失敗: ${config.baseUrl} -`, error);`
- Line 191: **REMOVE** `console.log`
  - Original: `console.log(`🔄 嘗試備用 URL: ${fallbackUrl}`);`
- Line 200: **REMOVE** `console.log`
  - Original: `console.log(`✅ 備用 URL 成功: ${fallbackUrl}`);`
- Line 207: **REMOVE** `console.log`
  - Original: `console.log(`❌ 備用 URL 也失敗:`, fallbackError);`
- Line 239: **REMOVE** `console.log`
  - Original: `console.log(`🚀 預載入 ${criticalImages.length} 個關鍵資源`);`

### src/api/nfts.ts

- Line 113: **REMOVE** `console.log`
  - Original: `console.log(`獲取 ${nftType} #${tokenId} 元數據 (嘗試 ${retryCount + 1}/${maxRetries + 1})`);`
- Line 118: **REMOVE** `console.log`
  - Original: `console.log(`${nftType} #${tokenId} 使用緩存數據`);`
- Line 135: **REMOVE** `console.log`
  - Original: `console.log(`${nftType} #${tokenId} 嘗試本地 API`);`
- Line 138: **REMOVE** `console.log`
  - Original: `console.log(`${nftType} #${tokenId} 本地 API 載入成功 (${loadTime}ms)`);`
- Line 144: **REMOVE** `console.log`
  - Original: `console.log(`${nftType} #${tokenId} 本地 API 失敗，嘗試其他方案:`, localError);`
- Line 149: **REMOVE** `console.log`
  - Original: `console.log(`${nftType} #${tokenId} 嘗試 CDN`);`
- Line 152: **REMOVE** `console.log`
  - Original: `console.log(`${nftType} #${tokenId} CDN 載入成功 (${loadTime}ms)`);`
- Line 157: **REMOVE** `console.log`
  - Original: `console.log(`${nftType} #${tokenId} CDN 失敗，嘗試原始方案:`, cdnError);`
- Line 162: **REMOVE** `console.log`
  - Original: `console.log(`${nftType} #${tokenId} 解析 base64 編碼的元數據`);`
- Line 166: **REMOVE** `console.log`
  - Original: `console.log(`${nftType} #${tokenId} 從 IPFS 載入元數據（備援）`);`
- Line 181: **REMOVE** `console.log`
  - Original: `console.log(`${nftType} #${tokenId} 從 HTTP 載入元數據: ${uri}`);`
- Line 186: **REMOVE** `console.log`
  - Original: `console.log(`${nftType} #${tokenId} 元數據載入成功 (${loadTime}ms)`);`
- Line 194: **CONVERT** `console.warn`
  - Original: `console.warn(`${nftType} #${tokenId} 解析元數據時出錯 (嘗試 ${retryCount + 1}/${maxRetries + 1}, ${loadTime}ms):`, error);`
  - Replacement: `logger.warn(`${nftType} #${tokenId} 解析元數據時出錯 (嘗試 ${retryCount + 1}/${maxRetries + 1}, ${loadTime}ms):`, error);`
- Line 199: **REMOVE** `console.log`
  - Original: `console.log(`${nftType} #${tokenId} 將在 ${retryDelay}ms 後重試...`);`
- Line 207: **REMOVE** `console.log`
  - Original: `console.log(`${nftType} #${tokenId} 使用 fallback 數據`);`
- Line 285: **REMOVE** `console.log`
  - Original: `console.log(`🔄 IPFS 備援載入: 嘗試 ${gateways.length} 個網關 (${timeout}ms 超時)`);`
- Line 303: **REMOVE** `console.log`
  - Original: `console.log(`✅ IPFS 網關 ${index + 1} 成功 (${loadTime}ms)`);`
- Line 307: **REMOVE** `console.log`
  - Original: `console.log(`❌ IPFS 網關 ${index + 1} 失敗 (${loadTime}ms):`, error.message);`
- Line 317: **REMOVE** `console.log`
  - Original: `console.log(`🎉 IPFS 載入成功 (${totalTime}ms)`);`
- Line 325: **CONVERT** `console.warn`
  - Original: `console.warn(`⏰ IPFS 載入超時 (${timeout}ms)`);`
  - Replacement: `logger.warn(`⏰ IPFS 載入超時 (${timeout}ms)`);`
- Line 329: **CONVERT** `console.warn`
  - Original: `console.warn(`🚫 IPFS 載入失敗 (${totalTime}ms):`, error);`
  - Replacement: `logger.warn(`🚫 IPFS 載入失敗 (${totalTime}ms):`, error);`
- Line 446: **REMOVE** `console.log`
  - Original: `console.log(`CDN ${url} 失敗:`, error);`
- Line 527: **CONVERT** `console.warn`
  - Original: `console.warn(`在 chainId: ${chainId} 上找不到 '${contractKeyMap[type]}' 的合約設定`);`
  - Replacement: `logger.warn(`在 chainId: ${chainId} 上找不到 '${contractKeyMap[type]}' 的合約設定`);`
- Line 564: **CONVERT** `console.warn`
  - Original: `console.warn(`無法獲取 ${type} #${asset.tokenId} 的 tokenURI，使用稀有度 ${assetRarity} 的 fallback`);`
  - Replacement: `logger.warn(`無法獲取 ${type} #${asset.tokenId} 的 tokenURI，使用稀有度 ${assetRarity} 的 fallback`);`
- Line 632: **CONVERT** `console.error`
  - Original: `console.error(`不支援的鏈 ID: ${chainId}`);`
  - Replacement: `logger.error(`不支援的鏈 ID: ${chainId}`);`
- Line 637: **CONVERT** `console.error`
  - Original: `console.error('The Graph API URL 未配置');`
  - Replacement: `logger.error('The Graph API URL 未配置');`
- Line 664: **CONVERT** `console.error`
  - Original: `console.error('GraphQL 錯誤:', errors);`
  - Replacement: `logger.error('GraphQL 錯誤:', errors);`
- Line 670: **REMOVE** `console.log`
  - Original: `console.log('未找到玩家資產數據，可能是新用戶');`
- Line 700: **REMOVE** `console.log`
  - Original: `console.log(`隊伍數據不完整，重試 ${retryCount + 1}/${maxRetries}`);`
- Line 704: **CONVERT** `console.warn`
  - Original: `console.warn(`解析隊伍數據失敗，重試 ${retryCount + 1}/${maxRetries}:`, error);`
  - Replacement: `logger.warn(`解析隊伍數據失敗，重試 ${retryCount + 1}/${maxRetries}:`, error);`
- Line 723: **CONVERT** `console.error`
  - Original: `console.error("GraphQL 請求超時");`
  - Replacement: `logger.error("GraphQL 請求超時");`
- Line 725: **CONVERT** `console.error`
  - Original: `console.error("獲取 NFT 數據時發生錯誤: ", error);`
  - Replacement: `logger.error("獲取 NFT 數據時發生錯誤: ", error);`

### src/components/ui/NftLoadingState.tsx

- Line 157: **CONVERT** `console.warn`
  - Original: `console.warn('重試過於頻繁，請稍後再試');`
  - Replacement: `logger.warn('重試過於頻繁，請稍後再試');`
- Line 170: **REMOVE** `console.log`
  - Original: `console.log(`執行第 ${retryCount + 1} 次重試，延遲 ${delay}ms`);`

### src/components/ui/ErrorBoundary.tsx

- Line 26: **CONVERT** `console.error`
  - Original: `console.error('ErrorBoundary caught an error:', error, errorInfo);`
  - Replacement: `logger.error('ErrorBoundary caught an error:', error, errorInfo);`

### src/components/layout/Footer.tsx

- Line 101: **CONVERT** `console.warn`
  - Original: `console.warn('無法解析 RPC URL:', rpcUrl);`
  - Replacement: `logger.warn('無法解析 RPC URL:', rpcUrl);`
- Line 113: **CONVERT** `console.error`
  - Original: `console.error("RPC health check failed:", error);`
  - Replacement: `logger.error("RPC health check failed:", error);`

### src/components/common/ErrorBoundary.tsx

- Line 26: **CONVERT** `console.error`
  - Original: `console.error('Error caught by boundary:', error, errorInfo);`
  - Replacement: `logger.error('Error caught by boundary:', error, errorInfo);`

