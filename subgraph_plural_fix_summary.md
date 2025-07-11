# Subgraph 複數形式修復總結

## 問題描述
你發現了一個重要的問題！在 GraphQL 查詢中，複數形式不一致：

```graphql
{
  players(first: 5) {
    id
    heroes {  # ❌ 這裡應該是 heros
      id
    }
    relics {
      id
    }
    parties {
      id
    }
  }
  heros(first: 5) {  # ✅ 這裡是正確的
    id
    contractAddress
    tokenId
    owner {
      id
    }
  }
}
```

## 根本原因
The Graph 自動生成的 GraphQL API 會將複數形式轉換為：
- `heroes` → `heros`
- `relics` → `relics` (保持不變)
- `parties` → `parties` (保持不變)

## 修復的文件

### 1. DDgraphql/dungeon-delvers/schema.graphql
- 修復 `Player` 實體中的 `heroes` → `heros`
- 修復 `Party` 實體中的 `heroes` → `heros`

### 2. DDgraphql/dungeon-delvers/src/party.ts
- 修復 `party.heroes = heroIds` → `party.heros = heroIds`

### 3. DDgraphql/dungeon-delvers/generated/schema.ts
- 修復 `Player` 類中的 `get heroes()` → `get heros()`
- 修復 `Party` 類中的 `get heroes()` → `get heros()`
- 修復 `Party` 類中的 `set heroes()` → `set heros()`

## 修復前後的對比

### Schema 修復
```graphql
# 修復前
type Player @entity(immutable: false) {
  heroes: [Hero!] @derivedFrom(field: "owner")  # ❌
}

type Party @entity(immutable: false) {
  heroes: [Hero!]!  # ❌
}

# 修復後
type Player @entity(immutable: false) {
  heros: [Hero!] @derivedFrom(field: "owner")  # ✅
}

type Party @entity(immutable: false) {
  heros: [Hero!]!  # ✅
}
```

### 生成的代碼修復
```typescript
// 修復前
export class Player extends Entity {
  get heroes(): HeroLoader {  // ❌
    return new HeroLoader("Player", this.get("id")!.toBytes().toHexString(), "heroes");
  }
}

export class Party extends Entity {
  get heroes(): Array<string> {  // ❌
    let value = this.get("heroes");
    return value.toStringArray();
  }
}

// 修復後
export class Player extends Entity {
  get heros(): HeroLoader {  // ✅
    return new HeroLoader("Player", this.get("id")!.toBytes().toHexString(), "heros");
  }
}

export class Party extends Entity {
  get heros(): Array<string> {  // ✅
    let value = this.get("heros");
    return value.toStringArray();
  }
}
```

## 正確的查詢格式

### 修復後的查詢
```graphql
{
  players(first: 5) {
    id
    heros {  # ✅ 現在一致了
      id
    }
    relics {
      id
    }
    parties {
      id
    }
  }
  heros(first: 5) {  # ✅ 保持正確
    id
    contractAddress
    tokenId
    owner {
      id
    }
  }
}
```

## 部署步驟

1. **重新部署 Subgraph**
   ```bash
   cd DDgraphql/dungeon-delvers
   npm run deploy
   ```

2. **更新 Metadata Server**
   - 確保 metadata server 的查詢也使用正確的複數形式
   - 重新部署 metadata server

3. **測試查詢**
   - 使用修復後的查詢格式測試
   - 確認所有 GraphQL 查詢都能正常工作

## 注意事項

- 這個修復確保了 schema、生成的代碼和 GraphQL 查詢的一致性
- `relics` 和 `parties` 的複數形式是正確的，無需修改
- 只有 `heroes` 需要改為 `heros`
- 這個修復與之前的前端修復相輔相成，確保整個系統的一致性

## 驗證清單

- [x] Schema 中的 `heroes` → `heros`
- [x] 生成的 TypeScript 代碼中的 `heroes` → `heros`
- [x] 源代碼中的 `heroes` → `heros`
- [ ] 重新部署 subgraph
- [ ] 測試 GraphQL 查詢
- [ ] 確認 metadata server 正常工作 