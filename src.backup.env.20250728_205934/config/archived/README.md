# 封存檔案說明

此目錄包含已被新系統取代的舊檔案。

## 封存原因

### abis.ts
- **封存日期**: 2025-07-28
- **原因**: 已遷移到現代化的 JSON ABI 管理系統
- **取代方案**: 直接從 `src/abis/*.json` 載入 ABI 檔案
- **影響**: 所有引用 abis.ts 的檔案已更新為使用 JSON 檔案

## 遷移說明

舊系統使用方式：
```typescript
import { heroABI, relicABI } from './abis';
```

新系統使用方式：
```typescript
import heroABI from '../abis/Hero.json';
import relicABI from '../abis/Relic.json';
```

## 優點
1. 自動化 ABI 同步（使用 v25-sync-all.js）
2. 避免手動維護 TypeScript 檔案
3. 減少人為錯誤
4. 版本控制更清晰

## 注意事項
- 這些檔案保留僅供參考
- 請勿在新代碼中引用這些封存檔案
- 如需要回滾，請使用 v25-sync-all.js 的回滾功能