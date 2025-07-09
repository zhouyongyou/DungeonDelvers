# 經驗加倍功能實現方案

## 合約層面實現

### 1. 合約修改需求
```solidity
// 在 DungeonMaster.sol 中添加
mapping(uint256 => bool) public hasExpBoostItem; // 隊伍是否有經驗加倍道具
uint256 public expBoostMultiplier = 2; // 經驗倍數

// 在遠征完成時計算經驗
function _calculateExperience(uint256 partyId, uint256 dungeonId, bool success) internal view returns (uint256) {
    uint256 baseExp = dungeonId * 5 + 20; // 基礎經驗
    if (success) {
        uint256 finalExp = baseExp;
        if (hasExpBoostItem[partyId]) {
            finalExp = baseExp * expBoostMultiplier;
            // 使用後移除道具
            hasExpBoostItem[partyId] = false;
        }
        return finalExp;
    }
    return baseExp / 2; // 失敗時獲得一半經驗
}
```

### 2. 前端實現
```typescript
// 在 DungeonPage.tsx 中添加經驗加倍道具檢查
const { data: hasExpBoost } = useReadContract({
    ...dungeonMasterContract,
    functionName: 'hasExpBoostItem',
    args: [party.id],
    query: { enabled: !!dungeonMasterContract }
});

// 在隊伍卡片中顯示
{hasExpBoost && (
    <div className="bg-yellow-900/50 p-2 rounded text-center">
        <span className="text-yellow-300 text-xs">⚡ 經驗加倍生效中</span>
    </div>
)}
```

## 道具系統設計

### 1. 經驗加倍道具
- **獲取方式**：商店購買、活動獎勵、成就解鎖
- **使用機制**：遠征前激活，遠征完成後消耗
- **效果**：當次遠征經驗獲得翻倍

### 2. 實現步驟
1. 合約添加道具系統
2. 前端添加道具管理界面
3. 集成到遠征流程中
4. 添加道具商店功能