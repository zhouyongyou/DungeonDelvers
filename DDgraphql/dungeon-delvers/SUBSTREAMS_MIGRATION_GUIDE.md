# Substreams 遷移指南

## 📋 概述

Substreams 是 The Graph 的新一代索引技術，透過並行處理和流式架構大幅提升效能。本文檔記錄了未來可能的遷移計畫。

## 🚀 為什麼考慮 Substreams？

### 效能提升
- **索引速度**：比傳統子圖快 100x+
- **並行處理**：利用大規模集群進行平行運算
- **流式架構**：數據管道分為四個階段，每階段獨立優化

### 實際案例
- Sparkle 原型：將同步時間從數週縮短到 6小時
- 適合處理大量歷史數據和高頻事件

## 🔧 技術差異

### 現有子圖 (AssemblyScript)
```typescript
// 事件驅動模式
export function handleHeroMinted(event: HeroMinted): void {
  let hero = new Hero(event.params.tokenId.toString());
  hero.owner = event.params.owner;
  hero.class = event.params.class;
  hero.level = BigInt.fromI32(1);
  hero.save();
}
```

### Substreams (Rust)
```rust
// 區塊流式處理
#[substreams::handlers::map]
fn map_heroes(block: Block) -> Result<Heroes, Error> {
    let mut heroes = Heroes::default();
    
    for log in block.logs() {
        if let Some(event) = HeroMinted::match_log(&log) {
            heroes.items.push(Hero {
                id: event.token_id.to_string(),
                owner: format!("0x{}", hex::encode(&event.owner)),
                class: event.class,
                level: 1,
            });
        }
    }
    
    Ok(heroes)
}
```

## 📦 遷移步驟概覽

### 1. 環境準備
```bash
# 安裝 Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# 安裝 Substreams CLI
brew install streamingfast/tap/substreams

# 創建新項目
substreams init
```

### 2. 定義 Protobuf Schema
```protobuf
syntax = "proto3";

package dungeondelvers.v1;

message Heroes {
  repeated Hero items = 1;
}

message Hero {
  string id = 1;
  string owner = 2;
  uint32 class = 3;
  uint32 level = 4;
  uint64 experience = 5;
}
```

### 3. 實現 Mapping 模組
```rust
use substreams::prelude::*;
use substreams_ethereum::pb::eth::v2::Block;

#[substreams::handlers::map]
fn map_heroes(block: Block) -> Result<Heroes, Error> {
    // 處理區塊中的所有 Hero 相關事件
}

#[substreams::handlers::map]
fn map_parties(block: Block) -> Result<Parties, Error> {
    // 處理區塊中的所有 Party 相關事件
}
```

### 4. 配置 substreams.yaml
```yaml
specVersion: v0.1.0
package:
  name: dungeon_delvers_substreams
  version: v1.0.0

protobuf:
  files:
    - hero.proto
    - party.proto
    - relic.proto

binaries:
  default:
    type: wasm/rust-v1
    file: ./target/wasm32-unknown-unknown/release/substreams.wasm

modules:
  - name: map_heroes
    kind: map
    inputs:
      - source: sf.ethereum.type.v2.Block
    output:
      type: proto:dungeondelvers.v1.Heroes

  - name: store_heroes
    kind: store
    updatePolicy: set
    valueType: proto:dungeondelvers.v1.Hero
    inputs:
      - map: map_heroes
```

## 🎯 遷移優先順序

### 第一階段：核心 NFT
1. Hero 合約事件
2. Relic 合約事件  
3. Party 合約事件

### 第二階段：遊戲機制
1. DungeonMaster 探險事件
2. PlayerVault 獎勵事件
3. AltarOfAscension 升級事件

### 第三階段：輔助功能
1. VIPStaking 質押事件
2. PlayerProfile 經驗事件

## 💡 最佳實踐

### 1. 模組化設計
- 每個合約一個獨立的 map 模組
- 使用 store 模組管理狀態
- 利用 sink 模組輸出到不同目標

### 2. 效能優化
- 批次處理相關事件
- 使用 protobuf 而非 JSON
- 避免在 map 中做複雜計算

### 3. 錯誤處理
```rust
match decode_event(&log) {
    Ok(event) => process_event(event),
    Err(e) => {
        // 記錄錯誤但不中斷流程
        substreams::log::info!("Failed to decode event: {}", e);
    }
}
```

## 🔄 與現有子圖共存

### 過渡期策略
1. **並行運行**：Substreams 和傳統子圖同時運行
2. **數據驗證**：比對兩者數據確保一致性
3. **漸進切換**：逐步將查詢流量導向 Substreams

### 整合方式
```typescript
// 前端查詢抽象層
async function queryHeroes(owner: string) {
  if (ENABLE_SUBSTREAMS) {
    return querySubstreamsEndpoint(owner);
  }
  return querySubgraphEndpoint(owner);
}
```

## 📊 預期效益

### 效能指標
| 指標 | 傳統子圖 | Substreams | 提升 |
|------|---------|------------|------|
| 初始同步 | 17分鐘 | <1分鐘 | 17x |
| 區塊處理 | 100/秒 | 10000+/秒 | 100x |
| 歷史重建 | 數天 | 數小時 | 24x |

### 成本效益
- **索引成本**：降低 80%（並行處理效率）
- **查詢成本**：降低 60%（更好的緩存）
- **維護成本**：初期較高，長期降低

## 🚧 挑戰與風險

### 技術挑戰
1. **學習曲線**：團隊需要學習 Rust
2. **調試困難**：工具鏈還不成熟
3. **生態系統**：第三方工具支援有限

### 遷移風險
1. **數據一致性**：需要仔細驗證
2. **停機時間**：切換期間的服務中斷
3. **回滾困難**：一旦遷移難以回頭

## 📅 建議時間表

### 2025 Q1-Q2：評估階段
- 團隊 Rust 培訓
- 小規模 POC 測試
- 效能基準測試

### 2025 Q3：試點階段
- 選擇低風險模組試點
- 並行運行驗證數據
- 收集效能指標

### 2025 Q4：全面遷移
- 逐步遷移所有模組
- 監控和優化
- 完全切換

## 📚 學習資源

### 官方文檔
- [Substreams 文檔](https://substreams.streamingfast.io/)
- [The Graph Substreams 指南](https://thegraph.com/docs/en/substreams/)

### 教程範例
- [Substreams 快速開始](https://github.com/streamingfast/substreams-template)
- [以太坊 Substreams 範例](https://github.com/streamingfast/substreams-eth-block-meta)

### 社群資源
- Discord: The Graph Protocol
- Telegram: Substreams Developers

## 🎯 結論

Substreams 代表了區塊鏈索引的未來，但目前：
- **短期**：保持現有優化策略（已達到 3-5分鐘同步）
- **中期**：團隊學習 Rust，進行小規模測試
- **長期**：待技術成熟後全面遷移

記住：**不要為了技術而技術**，要在合適的時機採用合適的解決方案。

---

最後更新：2025-08-02
下次評估：2025-04-01