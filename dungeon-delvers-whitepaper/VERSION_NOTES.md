# DungeonDelvers 版本說明

## 當前版本：V2.0（2025-07-26）

### 已實裝功能
- ✅ 英雄 NFT 鑄造與交易
- ✅ 聖物 NFT 鑄造與交易
- ✅ 隊伍 NFT 組建系統
- ✅ 地城探索核心玩法
- ✅ VIP 質押系統
- ✅ 玩家個人檔案（SBT）
- ✅ 動態稅率與金庫系統
- ✅ 邀請佣金機制
- ✅ $SoulShard 代幣經濟
- ✅ **升星祭壇系統 (AltarOfAscension)** 🆕
  - NFT 升級與合成機制已完全實裝
  - 支援消耗低星級 NFT 獲得高星級
  - 鏈上隨機升級結果，具備四種不同成功率
  - 管理後台支援動態調整升星規則
  - 暫停/恢復功能確保系統安全性

### 計劃中功能（後續版本推出）
  
#### 未來版本規劃
- 🔮 裝備 NFT 系統
- 🔮 英雄升級/合成進階系統
- 🔮 PVE 世界 Boss
- 🔮 PVP 競技場
- 🔮 DAO 治理機制

## 合約地址說明

所有核心合約已部署至 BSC 主網，包括 `AltarOfAscension` 升星祭壇合約。具體合約地址可在管理後台或前端應用中查看。

## 技術亮點 - 升星祭壇

### 隨機性機制
- 採用動態種子 (Dynamic Seed) 技術，確保升級結果的真實隨機性
- 結合區塊時間戳、用戶地址、稀有度等多重因素生成隨機數
- 每次升級後自動更新種子，防止可預測性攻擊

### 管理功能
- 支援實時調整升級規則（材料數量、費用、成功率）
- 具備合約暫停/恢復機制，確保系統安全
- 完整的事件日誌記錄，便於追蹤和審計

### 經濟平衡
- 不同稀有度對應不同的升級成本和成功率
- 部分失敗機制減少玩家損失，維持遊戲樂趣
- 大成功機制增加期待感和額外價值

## 注意事項

我們致力於提供完整且穩定的遊戲功能。升星祭壇系統已經過充分測試並投入實際運營。