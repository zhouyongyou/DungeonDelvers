# TypeScript `any` Type Analysis Report

Generated: 2025-07-13T11:35:50.364Z
Total findings: 360

## Summary by Impact

### HIGH Impact (281 findings)

- **function**: 6 findings
- **function-parameter**: 275 findings

### LOW Impact (76 findings)

- **type-assertion**: 75 findings
- **array**: 1 findings

### MEDIUM Impact (3 findings)

- **variable**: 3 findings

## Detailed Findings

### src/api/nfts.ts

**Line 196** [high impact, implicit-parameter]
```typescript
await new Promise(resolve => setTimeout(resolve, retryDelay));
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 282** [high impact, implicit-parameter]
```typescript
const racePromises = gateways.map((url, index) =>
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 282** [high impact, implicit-parameter]
```typescript
const racePromises = gateways.map((url, index) =>
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 290** [high impact, implicit-parameter]
```typescript
}).then(response => {
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 298** [high impact, implicit-parameter]
```typescript
}).catch(error => {
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 387** [high impact, implicit-parameter]
```typescript
(response) => response.json()
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 466** [high impact, implicit-parameter]
```typescript
await new Promise(resolve => setTimeout(resolve, 100));
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 525** [high impact, implicit-parameter]
```typescript
const uriCalls = assets.map(asset => ({
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 591** [high impact, implicit-parameter]
```typescript
heroIds: partyAsset.heros ? partyAsset.heros.map((h) => BigInt(h.tokenId)) : [],
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 592** [high impact, implicit-parameter]
```typescript
relicIds: partyAsset.relics ? partyAsset.relics.map((r) => BigInt(r.tokenId)) : [],
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 611** [high impact, implicit-parameter]
```typescript
const assetsWithIndex = assets.map((asset, index) => ({ asset, index }));
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 611** [high impact, implicit-parameter]
```typescript
const assetsWithIndex = assets.map((asset, index) => ({ asset, index }));
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 614** [high impact, implicit-parameter]
```typescript
({ asset, index }) => processAsset(asset, index),
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 685** [high impact, implicit-parameter]
```typescript
const partyNfts = parties.filter((nft): nft is PartyNft => nft.type === 'party');
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 686** [high impact, implicit-parameter]
```typescript
const hasValidParties = partyNfts.every(party =>
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 693** [high impact, implicit-parameter]
```typescript
await new Promise(resolve => setTimeout(resolve, 2000)); // 等待2秒
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 699** [high impact, implicit-parameter]
```typescript
await new Promise(resolve => setTimeout(resolve, 2000));
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 707** [high impact, implicit-parameter]
```typescript
heros: heroes.filter(Boolean).map(nft => ({ ...nft, source: nft.source || 'subgraph' })),
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 708** [high impact, implicit-parameter]
```typescript
relics: relics.filter(Boolean).map(nft => ({ ...nft, source: nft.source || 'subgraph' })),
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 709** [high impact, implicit-parameter]
```typescript
parties: parties.filter(Boolean).map(nft => ({ ...nft, source: nft.source || 'subgraph' })),
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 710** [high impact, implicit-parameter]
```typescript
vipCards: vipCards.filter(Boolean).map(nft => ({ ...nft, source: nft.source || 'subgraph' })),
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

### src/components/admin/AddressSettingRow.tsx

**Line 20** [high impact, implicit-parameter]
```typescript
const AddressSettingRow: React.FC<AddressSettingRowProps> = ({
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 94** [high impact, implicit-parameter]
```typescript
onChange={(e) => onInputChange(e.target.value)}
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

### src/components/admin/AdminSection.tsx

**Line 9** [high impact, implicit-parameter]
```typescript
const AdminSection: React.FC<AdminSectionProps> = ({ title, children }) => (
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

### src/components/admin/AltarRuleManager.tsx

**Line 17** [high impact, implicit-parameter]
```typescript
const AltarRuleManager: React.FC<AltarRuleManagerProps> = ({ chainId }) => {
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 25** [high impact, implicit-parameter]
```typescript
contracts: Array.from({ length: 4 }, (_, i) => ({
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 25** [high impact, implicit-parameter]
```typescript
contracts: Array.from({ length: 4 }, (_, i) => ({
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 53** [high impact, implicit-parameter]
```typescript
rulesData.forEach((d, i) => {
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 53** [high impact, implicit-parameter]
```typescript
rulesData.forEach((d, i) => {
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 78** [high impact, implicit-parameter]
```typescript
setRuleInputs(prev => ({
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 121** [high impact, implicit-parameter]
```typescript
{rulesData?.map((d, i) => {
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 121** [high impact, implicit-parameter]
```typescript
{rulesData?.map((d, i) => {
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 152** [high impact, implicit-parameter]
```typescript
onChange={e => handleInputChange(ruleId, 'materialsRequired', e.target.value)}
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 164** [high impact, implicit-parameter]
```typescript
onChange={e => handleInputChange(ruleId, 'nativeFee', e.target.value)}
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 176** [high impact, implicit-parameter]
```typescript
onChange={e => handleInputChange(ruleId, 'greatSuccessChance', e.target.value)}
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 188** [high impact, implicit-parameter]
```typescript
onChange={e => handleInputChange(ruleId, 'successChance', e.target.value)}
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 200** [high impact, implicit-parameter]
```typescript
onChange={e => handleInputChange(ruleId, 'partialFailChance', e.target.value)}
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

### src/components/admin/DungeonManager.tsx

**Line 16** [high impact, implicit-parameter]
```typescript
const DungeonManager: React.FC<DungeonManagerProps> = ({ chainId }) => {
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 46** [high impact, implicit-parameter]
```typescript
defaultDungeons.forEach(dungeon => {
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 57** [high impact, implicit-parameter]
```typescript
setDungeonInputs(prev => ({
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 98** [high impact, implicit-parameter]
```typescript
{defaultDungeons.map((dungeon) => {
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 127** [high impact, implicit-parameter]
```typescript
onChange={e => handleInputChange(dungeon.id, 'requiredPower', e.target.value)}
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 139** [high impact, implicit-parameter]
```typescript
onChange={e => handleInputChange(dungeon.id, 'rewardAmountUSD', e.target.value)}
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 151** [high impact, implicit-parameter]
```typescript
onChange={e => handleInputChange(dungeon.id, 'baseSuccessRate', e.target.value)}
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

### src/components/admin/ReadOnlyRow.tsx

**Line 10** [high impact, implicit-parameter]
```typescript
const ReadOnlyRow: React.FC<ReadOnlyRowProps> = ({ label, value, isLoading }) => (
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

### src/components/admin/SettingRow.tsx

**Line 21** [high impact, implicit-parameter]
```typescript
const SettingRow: React.FC<SettingRowProps> = ({
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 38** [high impact, implicit-parameter]
```typescript
if (inputValues.some(v => !v)) return;
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 45** [high impact, implicit-parameter]
```typescript
const valuesToSet = inputValues.map((val) => {
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 87** [high impact, implicit-parameter]
```typescript
{inputValues.map((val, index) => (
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 87** [high impact, implicit-parameter]
```typescript
{inputValues.map((val, index) => (
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 97** [high impact, implicit-parameter]
```typescript
onChange={(e) => {
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

### src/components/core/TransactionWatcher.tsx

**Line 12** [high impact, implicit-parameter]
```typescript
const TrackedTransaction: React.FC<{ hash: Hash }> = ({ hash }) => {
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 13** [high impact, implicit-parameter]
```typescript
const updateTransactionStatus = useTransactionStore((state) => state.updateTransactionStatus);
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 40** [high impact, implicit-parameter]
```typescript
const allTransactions = useTransactionStore((state) => state.transactions);
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 49** [high impact, implicit-parameter]
```typescript
{pendingTransactions.map((tx) => (
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

### src/components/layout/Footer.tsx

**Line 13** [high impact, implicit-parameter]
```typescript
const CopyIcon: React.FC<{ className?: string }> = ({ className }) => (
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 21** [high impact, implicit-parameter]
```typescript
const ContractAddressItem: React.FC<{ name: string; address?: string }> = ({ name, address }) => {
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

### src/components/layout/Header.tsx

**Line 19** [high impact, implicit-parameter]
```typescript
const MenuIcon: React.FC<{ className?: string }> = ({ className }) => (
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 27** [high impact, implicit-parameter]
```typescript
const XIcon: React.FC<{ className?: string }> = ({ className }) => (
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 34** [high impact, implicit-parameter]
```typescript
export const Header: React.FC<{ activePage: Page; setActivePage: (page: Page) => void }> = ({ activePage, setActivePage }) => {
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 109** [high impact, implicit-parameter]
```typescript
<button onClick={() => setIsTxPopoverOpen(prev => !prev)} className="p-2 rounded-full text-gray-300 hover:bg-gray-700 transition-colors" aria-label="最近交易">
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 130** [high impact, implicit-parameter]
```typescript
{navItems.map(item => (
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 131** [high impact, implicit-parameter]
```typescript
<a key={item.key} href={`#/${item.key}`} className={`nav-item ${activePage === item.key ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setActivePage(item.key); }}>
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 152** [high impact, implicit-parameter]
```typescript
<button onClick={() => setIsTxPopoverOpen(prev => !prev)} className="p-2 rounded-full text-gray-300 hover:bg-gray-700 transition-colors" aria-label="最近交易">
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 161** [high impact, implicit-parameter]
```typescript
{navItems.map(item => (
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 166** [high impact, implicit-parameter]
```typescript
onClick={(e) => { e.preventDefault(); handleNavClick(item.key); }}
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

### src/components/ui/ActionButton.tsx

**Line 18** [high impact, implicit-parameter]
```typescript
export const ActionButton: React.FC<ActionButtonProps> = ({
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

### src/components/ui/EmptyState.tsx

**Line 11** [high impact, implicit-parameter]
```typescript
export const EmptyState: React.FC<EmptyStateProps> = ({ message, children }) => (
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

### src/components/ui/ErrorBoundary.tsx

**Line 67** [high impact, implicit-parameter]
```typescript
}> = ({ children, fallback, className }) => {
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 82** [high impact, implicit-parameter]
```typescript
}> = ({ message = "載入中...", className = "" }) => (
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 96** [high impact, implicit-parameter]
```typescript
}> = ({ message = "載入失敗", onRetry, className = "" }) => (
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

### src/components/ui/icons.tsx

**Line 5** [high impact, implicit-parameter]
```typescript
const HistoryIcon: React.FC<{ className?: string }> = ({ className }) => (
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 13** [high impact, implicit-parameter]
```typescript
const ExternalLinkIcon: React.FC<{ className?: string }> = ({ className }) => (
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 22** [high impact, implicit-parameter]
```typescript
const TwitterIcon: React.FC<{ className?: string }> = ({ className }) => (
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 29** [high impact, implicit-parameter]
```typescript
const CopyIcon: React.FC<{ className?: string }> = ({ className }) => (
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 37** [high impact, implicit-parameter]
```typescript
const AlertTriangleIcon: React.FC<{ className?: string }> = ({ className }) => (
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 46** [high impact, implicit-parameter]
```typescript
const HeroIcon: React.FC<{ className?: string }> = ({ className }) => <span className={className}>🦸</span>;
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 47** [high impact, implicit-parameter]
```typescript
const RelicIcon: React.FC<{ className?: string }> = ({ className }) => <span className={className}>💎</span>;
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 48** [high impact, implicit-parameter]
```typescript
const PartyIcon: React.FC<{ className?: string }> = ({ className }) => <span className={className}>🛡️</span>;
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 49** [high impact, implicit-parameter]
```typescript
const VipIcon: React.FC<{ className?: string }> = ({ className }) => <span className={className}>⭐</span>;
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 50** [high impact, implicit-parameter]
```typescript
const MintIcon: React.FC<{ className?: string }> = ({ className }) => <span className={className}>✨</span>;
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 51** [high impact, implicit-parameter]
```typescript
const AltarIcon: React.FC<{ className?: string }> = ({ className }) => <span className={className}>🔥</span>;
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 52** [high impact, implicit-parameter]
```typescript
const AssetsIcon: React.FC<{ className?: string }> = ({ className }) => <span className={className}>📦</span>;
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 53** [high impact, implicit-parameter]
```typescript
const DungeonIcon: React.FC<{ className?: string }> = ({ className }) => <span className={className}>⚔️</span>;
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 54** [high impact, implicit-parameter]
```typescript
const CodexIcon: React.FC<{ className?: string }> = ({ className }) => <span className={className}>📖</span>;
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

### src/components/ui/LoadingSpinner.tsx

**Line 8** [high impact, implicit-parameter]
```typescript
export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

### src/components/ui/Modal.tsx

**Line 23** [high impact, implicit-parameter]
```typescript
export const Modal: React.FC<ModalProps> = ({
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 67** [high impact, implicit-parameter]
```typescript
onClick={e => e.stopPropagation()}
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

### src/components/ui/NftCard.tsx

**Line 19** [high impact, implicit-parameter]
```typescript
const VipImage: React.FC<{ nft: VipNft; fallbackImage: string }> = memo(({ nft, fallbackImage }) => {
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 37** [high impact, implicit-parameter]
```typescript
: (nft.attributes?.find(attr => attr.trait_type === 'Level')?.value || '?');
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 62** [high impact, implicit-parameter]
```typescript
const NftCard: React.FC<NftCardProps> = memo(({
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 121** [high impact, implicit-parameter]
```typescript
onError={(e) => {
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 188** [high impact, implicit-parameter]
```typescript
{nft.attributes.slice(0, 3).map((attr, index) => (
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 188** [high impact, implicit-parameter]
```typescript
{nft.attributes.slice(0, 3).map((attr, index) => (
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

### src/components/ui/NftLoadingState.tsx

**Line 14** [high impact, implicit-parameter]
```typescript
export const NftLoadingState: React.FC<NftLoadingStateProps> = ({
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 107** [high impact, implicit-parameter]
```typescript
{Array.from({ length: maxRetries }).map((_, i) => (
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 107** [high impact, implicit-parameter]
```typescript
{Array.from({ length: maxRetries }).map((_, i) => (
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 163** [high impact, implicit-parameter]
```typescript
setRetryCount(prev => prev + 1);
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

### src/components/ui/RecentTransactions.tsx

**Line 17** [high impact, implicit-parameter]
```typescript
const TransactionItem: React.FC<{ tx: Transaction; explorerUrl?: string }> = ({ tx, explorerUrl }) => {
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 61** [high impact, implicit-parameter]
```typescript
disabled={!transactions.some(tx => tx.status !== 'pending')}
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 68** [high impact, implicit-parameter]
```typescript
{transactions.map((tx) => (
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

### src/components/ui/Skeleton.tsx

**Line 13** [high impact, implicit-parameter]
```typescript
export const Skeleton: React.FC<SkeletonProps> = ({
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 48** [high impact, implicit-parameter]
```typescript
export const SkeletonCard: React.FC<{ className?: string }> = ({ className = '' }) => (
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 66** [high impact, implicit-parameter]
```typescript
export const NFTGridSkeleton: React.FC<{ count?: number }> = ({ count = 6 }) => (
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 68** [high impact, implicit-parameter]
```typescript
{Array.from({ length: count }).map((_, i) => (
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 68** [high impact, implicit-parameter]
```typescript
{Array.from({ length: count }).map((_, i) => (
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 85** [high impact, implicit-parameter]
```typescript
export const ListSkeleton: React.FC<{ count?: number }> = ({ count = 5 }) => (
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 87** [high impact, implicit-parameter]
```typescript
{Array.from({ length: count }).map((_, i) => (
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 87** [high impact, implicit-parameter]
```typescript
{Array.from({ length: count }).map((_, i) => (
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 114** [high impact, implicit-parameter]
```typescript
export const StatGridSkeleton: React.FC<{ count?: number }> = ({ count = 4 }) => (
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 116** [high impact, implicit-parameter]
```typescript
{Array.from({ length: count }).map((_, i) => (
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 116** [high impact, implicit-parameter]
```typescript
{Array.from({ length: count }).map((_, i) => (
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 123** [high impact, implicit-parameter]
```typescript
export const TableSkeleton: React.FC<{ rows?: number; cols?: number }> = ({
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 131** [high impact, implicit-parameter]
```typescript
{Array.from({ length: cols }).map((_, i) => (
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 131** [high impact, implicit-parameter]
```typescript
{Array.from({ length: cols }).map((_, i) => (
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 139** [high impact, implicit-parameter]
```typescript
{Array.from({ length: rows }).map((_, i) => (
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 139** [high impact, implicit-parameter]
```typescript
{Array.from({ length: rows }).map((_, i) => (
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 142** [high impact, implicit-parameter]
```typescript
{Array.from({ length: cols }).map((_, j) => (
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 142** [high impact, implicit-parameter]
```typescript
{Array.from({ length: cols }).map((_, j) => (
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

### src/components/ui/TownBulletin.tsx

**Line 24** [high impact, implicit-parameter]
```typescript
const sortedAnnouncements = [...announcementsData].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 24** [high impact, implicit-parameter]
```typescript
const sortedAnnouncements = [...announcementsData].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 39** [high impact, implicit-parameter]
```typescript
announcements.map((item) => (
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

### src/config/cdn.ts

**Line 228** [high impact, implicit-parameter]
```typescript
criticalImages.forEach(url => {
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

### src/contexts/ExpeditionContext.tsx

**Line 28** [high impact, implicit-parameter]
```typescript
export const ExpeditionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

### src/contexts/ToastContext.tsx

**Line 22** [high impact, implicit-parameter]
```typescript
export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 26** [high impact, implicit-parameter]
```typescript
setToasts(prev => [...prev, { id, text, type }]);
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 27** [high impact, implicit-parameter]
```typescript
setTimeout(() => { setToasts(prev => prev.filter(t => t.id !== id)); }, 5000);
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 27** [high impact, implicit-parameter]
```typescript
setTimeout(() => { setToasts(prev => prev.filter(t => t.id !== id)); }, 5000);
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 38** [high impact, implicit-parameter]
```typescript
{toasts.map(toast => ( <div key={toast.id} className="px-6 py-3 rounded-lg text-white text-base shadow-lg animate-slide-in-right" style={{ background: toastColors[toast.type] }}>{toast.text}</div> ))}
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

### src/hooks/useContractEvents.optimized.ts

**Line 52** [high impact, implicit-parameter]
```typescript
events.forEach(event => document.addEventListener(event, resetTimer, { passive: true }));
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 59** [high impact, implicit-parameter]
```typescript
events.forEach(event => document.removeEventListener(event, resetTimer));
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 91** [high impact, implicit-parameter]
```typescript
logs.forEach(log => {
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 165** [high impact, implicit-parameter]
```typescript
}).catch((error) => {
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 224** [high impact, implicit-parameter]
```typescript
onLogs: createContractEventHandler(heroContract, 'HeroMinted', address, (log) => {
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 236** [high impact, implicit-parameter]
```typescript
onLogs: createContractEventHandler(relicContract, 'RelicMinted', address, (log) => {
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 248** [high impact, implicit-parameter]
```typescript
onLogs: createContractEventHandler(partyContract, 'PartyCreated', address, (log) => {
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 296** [high impact, implicit-parameter]
```typescript
onLogs: createContractEventHandler(dungeonMasterContract, 'ExpeditionFulfilled', address, (log) => {
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 314** [high impact, implicit-parameter]
```typescript
onLogs: createContractEventHandler(dungeonMasterContract, 'PartyRested', address, (log) => {
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 326** [high impact, implicit-parameter]
```typescript
onLogs: createContractEventHandler(dungeonMasterContract, 'ProvisionsBought', address, (log) => {
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 339** [high impact, implicit-parameter]
```typescript
onLogs: createContractEventHandler(altarOfAscensionContract, 'UpgradeProcessed', address, (log) => {
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

### src/hooks/useVipStatus.ts

**Line 44** [high impact, implicit-parameter]
```typescript
retryDelay: (attemptIndex) => Math.min(3000 * 2 ** attemptIndex, 30000), // 更慢的重試：3秒、6秒、12秒，最多30秒
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 55** [high impact, implicit-parameter]
```typescript
] = useMemo(() => vipData?.map(d => d.result) ?? [], [vipData]);
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

### src/pages/AdminPage.tsx

**Line 30** [high impact, implicit-parameter]
```typescript
const AdminPageContent: React.FC<{ chainId: SupportedChainId }> = ({ chainId }) => {
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 67** [high impact, implicit-parameter]
```typescript
const configs = setupConfig.map(c => {
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 75** [high impact, implicit-parameter]
```typescript
return configs.filter((c): c is NonNullable<typeof c> => c !== null && !!c.address);
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 86** [high impact, implicit-parameter]
```typescript
const settings = setupConfig.reduce((acc, config, index) => {
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 86** [high impact, implicit-parameter]
```typescript
const settings = setupConfig.reduce((acc, config, index) => {
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 86** [high impact, implicit-parameter]
```typescript
const settings = setupConfig.reduce((acc, config, index) => {
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 95** [high impact, implicit-parameter]
```typescript
return setupConfig.reduce((acc, config) => {
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 95** [high impact, implicit-parameter]
```typescript
return setupConfig.reduce((acc, config) => {
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 144** [high impact, implicit-parameter]
```typescript
return config.filter((c) => !!c.contract && !!c.contract.address) as ParameterConfigItem[];
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 148** [high impact, implicit-parameter]
```typescript
return parameterConfig.map(p => ({ ...p.contract, functionName: p.getter }));
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 211** [high impact, implicit-parameter]
```typescript
.filter(([, value]) => !!value.address)
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 212** [high impact, implicit-parameter]
```typescript
.reduce((acc, [key, value]) => { acc[key] = value.address!; return acc; }, {} as Record<string, string>);
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 212** [high impact, implicit-parameter]
```typescript
.reduce((acc, [key, value]) => { acc[key] = value.address!; return acc; }, {} as Record<string, string>);
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 213** [high impact, implicit-parameter]
```typescript
setInputs(prev => ({ ...prev, ...definedEnvAddresses }));
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 248** [high impact, implicit-parameter]
```typescript
{setupConfig.slice(0, 9).map(config => (
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 259** [high impact, implicit-parameter]
```typescript
onInputChange={(val) => setInputs(prev => ({ ...prev, [config.key]: val }))}
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 259** [high impact, implicit-parameter]
```typescript
onInputChange={(val) => setInputs(prev => ({ ...prev, [config.key]: val }))}
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 267** [high impact, implicit-parameter]
```typescript
{setupConfig.slice(9).map(config => (
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 278** [high impact, implicit-parameter]
```typescript
onInputChange={(val) => setInputs(prev => ({ ...prev, [config.key]: val }))}
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 278** [high impact, implicit-parameter]
```typescript
onInputChange={(val) => setInputs(prev => ({ ...prev, [config.key]: val }))}
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 296** [high impact, implicit-parameter]
```typescript
{parameterConfig.filter(p => p.unit === 'USD').map((p) => {
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 296** [high impact, implicit-parameter]
```typescript
{parameterConfig.filter(p => p.unit === 'USD').map((p) => {
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 304** [high impact, implicit-parameter]
```typescript
currentValue={params?.[parameterConfig.findIndex(pc => pc.key === p.key)]?.result}
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 312** [high impact, implicit-parameter]
```typescript
{parameterConfig.filter(p => p.unit === 'BNB').map((p) => {
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 312** [high impact, implicit-parameter]
```typescript
{parameterConfig.filter(p => p.unit === 'BNB').map((p) => {
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 320** [high impact, implicit-parameter]
```typescript
currentValue={params?.[parameterConfig.findIndex(pc => pc.key === p.key)]?.result}
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 328** [high impact, implicit-parameter]
```typescript
{parameterConfig.filter(p => ['commissionRate'].includes(p.key)).map((p) => {
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 328** [high impact, implicit-parameter]
```typescript
{parameterConfig.filter(p => ['commissionRate'].includes(p.key)).map((p) => {
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 329** [high impact, implicit-parameter]
```typescript
const paramIndex = parameterConfig.findIndex(pc => pc.key === p.key);
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 380** [high impact, implicit-parameter]
```typescript
{parameterConfig.filter(p => ['restDivisor', 'vipCooldown', 'globalRewardMultiplier'].includes(p.key)).map((p) => {
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 380** [high impact, implicit-parameter]
```typescript
{parameterConfig.filter(p => ['restDivisor', 'vipCooldown', 'globalRewardMultiplier'].includes(p.key)).map((p) => {
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 388** [high impact, implicit-parameter]
```typescript
currentValue={params?.[parameterConfig.findIndex(pc => pc.key === p.key)]?.result}
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 396** [high impact, implicit-parameter]
```typescript
{parameterConfig.filter(p => ['twapPeriod'].includes(p.key)).map((p) => {
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 396** [high impact, implicit-parameter]
```typescript
{parameterConfig.filter(p => ['twapPeriod'].includes(p.key)).map((p) => {
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 404** [high impact, implicit-parameter]
```typescript
currentValue={params?.[parameterConfig.findIndex(pc => pc.key === p.key)]?.result}
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 416** [high impact, implicit-parameter]
```typescript
{['hero', 'relic', 'party', 'dungeonMaster', 'vipStaking'].map(contractName => {
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 476** [high impact, implicit-parameter]
```typescript
].map(({ name, label }) => {
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

### src/pages/AltarPage.tsx

**Line 155** [high impact, implicit-parameter]
```typescript
const UpgradeResultModal: React.FC<{ result: UpgradeOutcome | null; onClose: () => void }> = ({ result, onClose }) => {
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 167** [high impact, implicit-parameter]
```typescript
{result.nfts.map(nft => ( <div key={nft.id.toString()} className="w-40"><NftCard nft={nft} /></div> ))}
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 175** [high impact, implicit-parameter]
```typescript
const UpgradeInfoCard: React.FC<{ rule: { materialsRequired: number; nativeFee: bigint; greatSuccessChance: number; successChance: number; partialFailChance: number } | null; isLoading: boolean; }> = ({ rule, isLoading }) => {
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 221** [high impact, implicit-parameter]
```typescript
contracts: [1, 2, 3, 4].map(r => ({ ...altarContract, functionName: 'upgradeRules', args: [r] })),
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 237** [high impact, implicit-parameter]
```typescript
setSelectedNfts(prev => {
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 238** [high impact, implicit-parameter]
```typescript
if (prev.includes(id)) return prev.filter(i => i !== id);
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 262** [high impact, implicit-parameter]
```typescript
selectedNfts: selectedNfts.map(id => id.toString()),
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 263** [high impact, implicit-parameter]
```typescript
availableNfts: availableNfts?.map(nft => ({
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 276** [high impact, implicit-parameter]
```typescript
const upgradeLog = receipt.logs.find(log => log.address.toLowerCase() === altarContract.address.toLowerCase());
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 287** [high impact, implicit-parameter]
```typescript
.filter(log => log.address.toLowerCase() === tokenContract.address.toLowerCase())
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 288** [high impact, implicit-parameter]
```typescript
.map(log => { try { return decodeEventLog({ abi: tokenContractAbi, ...log }); } catch { return null; } })
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 289** [high impact, implicit-parameter]
```typescript
.filter((log): log is NonNullable<typeof log> => log !== null && log.eventName === mintEventName);
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 291** [high impact, implicit-parameter]
```typescript
const newNfts: AnyNft[] = await Promise.all(mintedLogs.map(async (log) => {
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 332** [high impact, implicit-parameter]
```typescript
{(['hero', 'relic'] as const).map(t => (
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 337** [high impact, implicit-parameter]
```typescript
{[1, 2, 3, 4].map(r => (
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 359** [high impact, implicit-parameter]
```typescript
{availableNfts.map(nft => (
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

### src/pages/CodexPage.tsx

**Line 149** [high impact, implicit-parameter]
```typescript
{displayNfts.map((nft, index) => {
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 149** [high impact, implicit-parameter]
```typescript
{displayNfts.map((nft, index) => {
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

### src/pages/DashboardPage.tsx

**Line 123** [high impact, implicit-parameter]
```typescript
const StatCard: React.FC<{ title: string; value: string | number; isLoading?: boolean, icon: React.ReactNode, className?: string }> = ({ title, value, isLoading, icon, className }) => (
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 133** [high impact, implicit-parameter]
```typescript
const QuickActionButton: React.FC<{ title: string; description: string; onAction: () => void; icon: React.ReactNode }> = ({ title, description, onAction, icon }) => (
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 143** [high impact, implicit-parameter]
```typescript
const ExternalLinkButton: React.FC<{ title: string; url: string; icon: React.ReactNode }> = ({ title, url, icon }) => (
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 191** [high impact, implicit-parameter]
```typescript
const DashboardPage: React.FC<{ setActivePage: (page: Page) => void }> = ({ setActivePage }) => {
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 208** [high impact, implicit-parameter]
```typescript
const [ playerInfo, smallWithdrawThresholdUSD, largeWithdrawThresholdUSD, standardInitialRate, largeWithdrawInitialRate, decreaseRatePerPeriod, periodDuration, vipTaxReduction ] = taxParams.map(item => item.result);
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 245** [high impact, implicit-parameter]
```typescript
].filter(m => m.address && typeof m.address === 'string' && !m.address.includes('YOUR_'));
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 325** [high impact, implicit-parameter]
```typescript
{externalMarkets.map(market => (
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

### src/pages/DungeonPage.tsx

**Line 110** [high impact, function-parameter]
```typescript
return parties.map((p: any) => ({
```
**Suggested type:** `unknown`
**Auto-fixable:** Yes ✅

**Line 121** [high impact, function-parameter]
```typescript
heroIds: (p.heros || []).map((h: any) => BigInt(h.tokenId)),
```
**Suggested type:** `unknown`
**Auto-fixable:** Yes ✅

**Line 122** [high impact, function-parameter]
```typescript
relicIds: (p.relics || []).map((r: any) => BigInt(r.tokenId)),
```
**Suggested type:** `unknown`
**Auto-fixable:** Yes ✅

**Line 138** [high impact, implicit-parameter]
```typescript
retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 158** [high impact, implicit-parameter]
```typescript
const PartyStatusCard: React.FC<PartyStatusCardProps> = ({ party, dungeons, onStartExpedition, onRest, onBuyProvisions, isTxPending, isAnyTxPendingForThisParty, chainId }) => {
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 221** [high impact, implicit-parameter]
```typescript
onChange={(e) => setSelectedDungeonId(BigInt(e.target.value))}
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 225** [high impact, implicit-parameter]
```typescript
{dungeons.map(d => <option key={d.id} value={d.id.toString()}>{d.id}. {d.name} (要求: {d.requiredPower.toString()})</option>)}
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 233** [high impact, implicit-parameter]
```typescript
const DungeonInfoCard: React.FC<{ dungeon: Dungeon }> = ({ dungeon }) => (
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 250** [high impact, implicit-parameter]
```typescript
const DungeonPage: React.FC<{ setActivePage: (page: Page) => void; }> = ({ setActivePage }) => {
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 269** [high impact, implicit-parameter]
```typescript
contracts: Array.from({ length: 10 }, (_, i) => ({
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 269** [high impact, implicit-parameter]
```typescript
contracts: Array.from({ length: 10 }, (_, i) => ({
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 281** [high impact, implicit-parameter]
```typescript
return dungeonsData.map((d, i) => {
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 281** [high impact, implicit-parameter]
```typescript
return dungeonsData.map((d, i) => {
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 285** [high impact, implicit-parameter]
```typescript
}).filter((d): d is Dungeon => d !== null && d.isInitialized);
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 294** [high impact, implicit-parameter]
```typescript
return transactions.some(tx => tx.status === 'pending' && tx.description.includes(`隊伍 #${partyId.toString()}`));
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 368** [high impact, implicit-parameter]
```typescript
{parties.map((party) => (
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 387** [high impact, implicit-parameter]
```typescript
{dungeons.map(dungeon => ( <DungeonInfoCard key={dungeon.id} dungeon={dungeon} /> ))}
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

### src/pages/ExplorerPage.tsx

**Line 97** [high impact, implicit-parameter]
```typescript
const QuerySection: React.FC<QuerySectionProps> = ({ title, inputType, inputPlaceholder, onQuery, isLoading = false, children }) => {
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 114** [high impact, implicit-parameter]
```typescript
onChange={e => setInputValue(e.target.value)}
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 149** [high impact, implicit-parameter]
```typescript
const NftQuery: React.FC<{ type: 'hero' | 'relic' | 'party' }> = ({ type }) => {
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

### src/pages/MintPage.tsx

**Line 119** [high impact, implicit-parameter]
```typescript
const MintResultModal: React.FC<{ nft: AnyNft | null; onClose: () => void }> = ({ nft, onClose }) => {
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 142** [high impact, implicit-parameter]
```typescript
const MintCard: React.FC<{ type: 'hero' | 'relic'; options: number[]; chainId: typeof bsc.id }> = ({ type, options, chainId }) => {
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 192** [high impact, implicit-parameter]
```typescript
const mintLog = receipt.logs.find(log => { try { return decodeEventLog({ abi: contractConfig.abi, ...log }).eventName === mintEventName; } catch { return false; } });
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 233** [high impact, implicit-parameter]
```typescript
<div className="flex items-center justify-center gap-2 my-4">{options.map(q => <button key={q} onClick={() => setQuantity(q)} className={`w-12 h-12 rounded-full font-bold text-lg transition-all flex items-center justify-center border-2 ${quantity === q ? 'bg-indigo-500 text-white border-transparent scale-110' : 'bg-gray-700 hover:bg-gray-600 border-gray-600'}`}>{q}</button>)}</div>
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 254** [high impact, implicit-parameter]
```typescript
const MintingInterface: React.FC<{ chainId: typeof bsc.id }> = ({ chainId }) => {
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

### src/pages/MyAssetsPage.tsx

**Line 56** [high impact, implicit-parameter]
```typescript
const hero = heroes.find(h => h.id === id);
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 60** [high impact, implicit-parameter]
```typescript
const relic = relics.find(r => r.id === id);
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 73** [high impact, implicit-parameter]
```typescript
setList(list.filter(i => i !== id));
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 85** [high impact, implicit-parameter]
```typescript
setList(list.filter(i => i !== id));
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 103** [high impact, implicit-parameter]
```typescript
const sortedHeroes = [...heroes].sort((a, b) => b.power - a.power);
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 103** [high impact, implicit-parameter]
```typescript
const sortedHeroes = [...heroes].sort((a, b) => b.power - a.power);
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 104** [high impact, implicit-parameter]
```typescript
const selected = sortedHeroes.slice(0, totalCapacity).map(h => h.id);
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 111** [high impact, implicit-parameter]
```typescript
const sortedRelics = [...relics].sort((a, b) => b.capacity - a.capacity);
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 111** [high impact, implicit-parameter]
```typescript
const sortedRelics = [...relics].sort((a, b) => b.capacity - a.capacity);
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 112** [high impact, implicit-parameter]
```typescript
const selected = sortedRelics.slice(0, 5).map(r => r.id);
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 210** [high impact, implicit-parameter]
```typescript
{relics.length > 0 ? relics.map(relic => (
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 239** [high impact, implicit-parameter]
```typescript
{heroes.length > 0 ? heroes.map(hero => (
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 304** [high impact, implicit-parameter]
```typescript
retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000), // 指數退避
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 334** [high impact, implicit-parameter]
```typescript
const sortHeroNfts = (nfts: HeroNft[]) => [...nfts].sort((a, b) => b.power - a.power);
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 334** [high impact, implicit-parameter]
```typescript
const sortHeroNfts = (nfts: HeroNft[]) => [...nfts].sort((a, b) => b.power - a.power);
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 335** [high impact, implicit-parameter]
```typescript
const sortRelicNfts = (nfts: RelicNft[]) => [...nfts].sort((a, b) => b.capacity - a.capacity);
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 335** [high impact, implicit-parameter]
```typescript
const sortRelicNfts = (nfts: RelicNft[]) => [...nfts].sort((a, b) => b.capacity - a.capacity);
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 349** [high impact, implicit-parameter]
```typescript
return [...nfts.heros].sort((a, b) => b.power - a.power);
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 349** [high impact, implicit-parameter]
```typescript
return [...nfts.heros].sort((a, b) => b.power - a.power);
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 352** [high impact, implicit-parameter]
```typescript
return [...nfts.relics].sort((a, b) => b.capacity - a.capacity);
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 352** [high impact, implicit-parameter]
```typescript
return [...nfts.relics].sort((a, b) => b.capacity - a.capacity);
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 355** [high impact, implicit-parameter]
```typescript
return [...nfts.parties].sort((a, b) => b.partyRarity - a.partyRarity);
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 355** [high impact, implicit-parameter]
```typescript
return [...nfts.parties].sort((a, b) => b.partyRarity - a.partyRarity);
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 475** [high impact, implicit-parameter]
```typescript
{filterOptions.map(({ key, label }) => (
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 488** [high impact, implicit-parameter]
```typescript
{filteredNfts.map(nft => <NftCard key={nft.id.toString()} nft={nft} />)}
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

### src/pages/ProfilePage.tsx

**Line 96** [high impact, implicit-parameter]
```typescript
const ProfilePage: React.FC<{ setActivePage: (page: Page) => void }> = ({ setActivePage }) => {
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 137** [high impact, implicit-parameter]
```typescript
onError={(e) => {
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

### src/pages/ProvisionsPage.tsx

**Line 86** [high impact, implicit-parameter]
```typescript
const ProvisionsPage: React.FC<ProvisionsPageProps> = ({ preselectedPartyId, onPurchaseSuccess }) => {
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 176** [high impact, implicit-parameter]
```typescript
onChange={(e) => setSelectedPartyId(e.target.value ? BigInt(e.target.value) : null)}
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 180** [high impact, implicit-parameter]
```typescript
{nfts.parties.map(party => (
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 194** [high impact, implicit-parameter]
```typescript
onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

### src/pages/ReferralPage.tsx

**Line 271** [high impact, implicit-parameter]
```typescript
onChange={(e) => setReferrerInput(e.target.value)}
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

### src/pages/VipPage.tsx

**Line 15** [high impact, implicit-parameter]
```typescript
const VipCardDisplay: React.FC<{ tokenId: bigint | null, chainId: number | undefined, vipLevel: number, contractAddress?: string }> = ({ tokenId, chainId, vipLevel, contractAddress }) => {
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 96** [high impact, implicit-parameter]
```typescript
onSuccess: async (hash, variables) => {
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 96** [high impact, implicit-parameter]
```typescript
onSuccess: async (hash, variables) => {
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 159** [high impact, implicit-parameter]
```typescript
await new Promise(resolve => setTimeout(resolve, 3000));
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 206** [high impact, implicit-parameter]
```typescript
onChange={e => setAmount(e.target.value)}
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 212** [high impact, implicit-parameter]
```typescript
{[25, 50, 75, 100].map(p => (
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

### src/stores/useTransactionStore.ts

**Line 30** [high impact, implicit-parameter]
```typescript
(set) => ({
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 35** [high impact, implicit-parameter]
```typescript
addTransaction: (tx) => {
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 42** [high impact, implicit-parameter]
```typescript
set((state) => ({ transactions: [newTx, ...state.transactions] }));
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 46** [high impact, implicit-parameter]
```typescript
updateTransactionStatus: (hash, status) => {
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 46** [high impact, implicit-parameter]
```typescript
updateTransactionStatus: (hash, status) => {
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 47** [high impact, implicit-parameter]
```typescript
set((state) => ({
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 48** [high impact, implicit-parameter]
```typescript
transactions: state.transactions.map((tx) =>
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 56** [high impact, implicit-parameter]
```typescript
set((state) => ({
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 58** [high impact, implicit-parameter]
```typescript
(tx) => tx.status === 'pending'
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

### src/utils/marketDataIntegrator.ts

**Line 74** [high impact, function-parameter]
```typescript
attributes: nft.attributes?.map((attr: any) => ({
```
**Suggested type:** `unknown`
**Auto-fixable:** Yes ✅

**Line 116** [high impact, function-parameter]
```typescript
attributes: nft.attributes?.map((attr: any) => ({
```
**Suggested type:** `unknown`
**Auto-fixable:** Yes ✅

**Line 156** [high impact, function-parameter]
```typescript
attributes: nft.traits?.map((trait: any) => ({
```
**Suggested type:** `unknown`
**Auto-fixable:** Yes ✅

**Line 307** [high impact, implicit-parameter]
```typescript
validSources.sort((a, b) => {
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

**Line 307** [high impact, implicit-parameter]
```typescript
validSources.sort((a, b) => {
```
**Suggested type:** `unknown`
**Auto-fixable:** No ❌

### src/pages/AdminPage.tsx

**Line 431** [medium impact, variable-declaration]
```typescript
} catch (e: any) {
```
**Suggested type:** `unknown`
**Auto-fixable:** Yes ✅

**Line 451** [medium impact, variable-declaration]
```typescript
} catch (e: any) {
```
**Suggested type:** `unknown`
**Auto-fixable:** Yes ✅

**Line 491** [medium impact, variable-declaration]
```typescript
} catch (e: any) {
```
**Suggested type:** `unknown`
**Auto-fixable:** Yes ✅

### src/components/ui/NftCard.tsx

**Line 26** [low impact, type-assertion]
```typescript
...(vipStakingContract as any),
```
**Suggested type:** `unknown`
**Auto-fixable:** Yes ✅

**Line 27** [low impact, type-assertion]
```typescript
functionName: 'getVipLevel' as any,
```
**Suggested type:** `unknown`
**Auto-fixable:** Yes ✅

**Line 28** [low impact, type-assertion]
```typescript
args: [address!] as any,
```
**Suggested type:** `unknown`
**Auto-fixable:** Yes ✅

### src/pages/AdminPage.tsx

**Line 180** [low impact, type-assertion]
```typescript
const hash = await writeContractAsync({ address: targetContract.address, abi: targetContract.abi, functionName: functionName as any, args: [newAddress] });
```
**Suggested type:** `unknown`
**Auto-fixable:** Yes ✅

**Line 417** [low impact, type-assertion]
```typescript
const contract = getContract(chainId, contractName as any);
```
**Suggested type:** `unknown`
**Auto-fixable:** Yes ✅

**Line 427** [low impact, type-assertion]
```typescript
functionName: 'pause' as any
```
**Suggested type:** `unknown`
**Auto-fixable:** Yes ✅

**Line 447** [low impact, type-assertion]
```typescript
functionName: 'unpause' as any
```
**Suggested type:** `unknown`
**Auto-fixable:** Yes ✅

**Line 477** [low impact, type-assertion]
```typescript
const contract = getContract(chainId, name as any);
```
**Suggested type:** `unknown`
**Auto-fixable:** Yes ✅

**Line 487** [low impact, type-assertion]
```typescript
functionName: 'withdrawSoulShard' as any
```
**Suggested type:** `unknown`
**Auto-fixable:** Yes ✅

### src/pages/AltarPage.tsx

**Line 272** [low impact, type-assertion]
```typescript
const hash = await writeContractAsync({ ...(altarContract as any), functionName: 'upgradeNFTs' as any, args: [tokenContract.address, selectedNfts] as any, value: currentRule.nativeFee as any });
```
**Suggested type:** `unknown`
**Auto-fixable:** Yes ✅

**Line 272** [low impact, type-assertion]
```typescript
const hash = await writeContractAsync({ ...(altarContract as any), functionName: 'upgradeNFTs' as any, args: [tokenContract.address, selectedNfts] as any, value: currentRule.nativeFee as any });
```
**Suggested type:** `unknown`
**Auto-fixable:** Yes ✅

**Line 272** [low impact, type-assertion]
```typescript
const hash = await writeContractAsync({ ...(altarContract as any), functionName: 'upgradeNFTs' as any, args: [tokenContract.address, selectedNfts] as any, value: currentRule.nativeFee as any });
```
**Suggested type:** `unknown`
**Auto-fixable:** Yes ✅

**Line 272** [low impact, type-assertion]
```typescript
const hash = await writeContractAsync({ ...(altarContract as any), functionName: 'upgradeNFTs' as any, args: [tokenContract.address, selectedNfts] as any, value: currentRule.nativeFee as any });
```
**Suggested type:** `unknown`
**Auto-fixable:** Yes ✅

### src/pages/DashboardPage.tsx

**Line 204** [low impact, type-assertion]
```typescript
const { data: withdrawableBalanceInUSD } = useReadContract({ ...(dungeonCoreContract as any), functionName: 'getSoulShardAmountForUSD' as any, args: [withdrawableBalance] as any, query: { enabled: !!dungeonCoreContract && withdrawableBalance > 0n } });
```
**Suggested type:** `unknown`
**Auto-fixable:** Yes ✅

**Line 204** [low impact, type-assertion]
```typescript
const { data: withdrawableBalanceInUSD } = useReadContract({ ...(dungeonCoreContract as any), functionName: 'getSoulShardAmountForUSD' as any, args: [withdrawableBalance] as any, query: { enabled: !!dungeonCoreContract && withdrawableBalance > 0n } });
```
**Suggested type:** `unknown`
**Auto-fixable:** Yes ✅

**Line 204** [low impact, type-assertion]
```typescript
const { data: withdrawableBalanceInUSD } = useReadContract({ ...(dungeonCoreContract as any), functionName: 'getSoulShardAmountForUSD' as any, args: [withdrawableBalance] as any, query: { enabled: !!dungeonCoreContract && withdrawableBalance > 0n } });
```
**Suggested type:** `unknown`
**Auto-fixable:** Yes ✅

**Line 254** [low impact, type-assertion]
```typescript
const hash = await writeContractAsync({ ...(playerVaultContract as any), functionName: 'withdraw' as any, args: [withdrawableBalance] as any });
```
**Suggested type:** `unknown`
**Auto-fixable:** Yes ✅

**Line 254** [low impact, type-assertion]
```typescript
const hash = await writeContractAsync({ ...(playerVaultContract as any), functionName: 'withdraw' as any, args: [withdrawableBalance] as any });
```
**Suggested type:** `unknown`
**Auto-fixable:** Yes ✅

**Line 254** [low impact, type-assertion]
```typescript
const hash = await writeContractAsync({ ...(playerVaultContract as any), functionName: 'withdraw' as any, args: [withdrawableBalance] as any });
```
**Suggested type:** `unknown`
**Auto-fixable:** Yes ✅

### src/pages/DungeonPage.tsx

**Line 96** [low impact, array-element]
```typescript
let parties: any[] = [];
```
**Suggested type:** `unknown[]`
**Auto-fixable:** Yes ✅

**Line 163** [low impact, type-assertion]
```typescript
...(dungeonMasterContract as any),
```
**Suggested type:** `unknown`
**Auto-fixable:** Yes ✅

**Line 164** [low impact, type-assertion]
```typescript
functionName: 'explorationFee' as any,
```
**Suggested type:** `unknown`
**Auto-fixable:** Yes ✅

**Line 271** [low impact, type-assertion]
```typescript
abi: dungeonStorageContract?.abi as any,
```
**Suggested type:** `unknown`
**Auto-fixable:** Yes ✅

**Line 272** [low impact, type-assertion]
```typescript
functionName: 'getDungeon' as any,
```
**Suggested type:** `unknown`
**Auto-fixable:** Yes ✅

**Line 273** [low impact, type-assertion]
```typescript
args: [BigInt(i + 1)] as any,
```
**Suggested type:** `unknown`
**Auto-fixable:** Yes ✅

**Line 301** [low impact, type-assertion]
```typescript
const hash = await writeContractAsync({ ...(dungeonMasterContract as any), functionName: 'requestExpedition' as any, args: [partyId, dungeonId] as any, value: fee as any });
```
**Suggested type:** `unknown`
**Auto-fixable:** Yes ✅

**Line 301** [low impact, type-assertion]
```typescript
const hash = await writeContractAsync({ ...(dungeonMasterContract as any), functionName: 'requestExpedition' as any, args: [partyId, dungeonId] as any, value: fee as any });
```
**Suggested type:** `unknown`
**Auto-fixable:** Yes ✅

**Line 301** [low impact, type-assertion]
```typescript
const hash = await writeContractAsync({ ...(dungeonMasterContract as any), functionName: 'requestExpedition' as any, args: [partyId, dungeonId] as any, value: fee as any });
```
**Suggested type:** `unknown`
**Auto-fixable:** Yes ✅

**Line 301** [low impact, type-assertion]
```typescript
const hash = await writeContractAsync({ ...(dungeonMasterContract as any), functionName: 'requestExpedition' as any, args: [partyId, dungeonId] as any, value: fee as any });
```
**Suggested type:** `unknown`
**Auto-fixable:** Yes ✅

**Line 324** [low impact, type-assertion]
```typescript
const hash = await writeContractAsync({ ...(dungeonMasterContract as any), functionName: 'restParty' as any, args: [partyId] as any });
```
**Suggested type:** `unknown`
**Auto-fixable:** Yes ✅

**Line 324** [low impact, type-assertion]
```typescript
const hash = await writeContractAsync({ ...(dungeonMasterContract as any), functionName: 'restParty' as any, args: [partyId] as any });
```
**Suggested type:** `unknown`
**Auto-fixable:** Yes ✅

**Line 324** [low impact, type-assertion]
```typescript
const hash = await writeContractAsync({ ...(dungeonMasterContract as any), functionName: 'restParty' as any, args: [partyId] as any });
```
**Suggested type:** `unknown`
**Auto-fixable:** Yes ✅

### src/pages/MyAssetsPage.tsx

**Line 308** [low impact, type-assertion]
```typescript
...(partyContract as any),
```
**Suggested type:** `unknown`
**Auto-fixable:** Yes ✅

**Line 309** [low impact, type-assertion]
```typescript
functionName: 'platformFee' as any,
```
**Suggested type:** `unknown`
**Auto-fixable:** Yes ✅

**Line 315** [low impact, type-assertion]
```typescript
...(heroContract as any),
```
**Suggested type:** `unknown`
**Auto-fixable:** Yes ✅

**Line 316** [low impact, type-assertion]
```typescript
functionName: 'isApprovedForAll' as any,
```
**Suggested type:** `unknown`
**Auto-fixable:** Yes ✅

**Line 317** [low impact, type-assertion]
```typescript
args: [address!, partyContract!.address] as any,
```
**Suggested type:** `unknown`
**Auto-fixable:** Yes ✅

**Line 322** [low impact, type-assertion]
```typescript
...(relicContract as any),
```
**Suggested type:** `unknown`
**Auto-fixable:** Yes ✅

**Line 323** [low impact, type-assertion]
```typescript
functionName: 'isApprovedForAll' as any,
```
**Suggested type:** `unknown`
**Auto-fixable:** Yes ✅

**Line 324** [low impact, type-assertion]
```typescript
args: [address!, partyContract!.address] as any,
```
**Suggested type:** `unknown`
**Auto-fixable:** Yes ✅

**Line 373** [low impact, type-assertion]
```typescript
const hash = await writeContractAsync({ ...(heroContract as any), functionName: 'setApprovalForAll' as any, args: [partyContract.address, true as any] as any });
```
**Suggested type:** `unknown`
**Auto-fixable:** Yes ✅

**Line 373** [low impact, type-assertion]
```typescript
const hash = await writeContractAsync({ ...(heroContract as any), functionName: 'setApprovalForAll' as any, args: [partyContract.address, true as any] as any });
```
**Suggested type:** `unknown`
**Auto-fixable:** Yes ✅

**Line 373** [low impact, type-assertion]
```typescript
const hash = await writeContractAsync({ ...(heroContract as any), functionName: 'setApprovalForAll' as any, args: [partyContract.address, true as any] as any });
```
**Suggested type:** `unknown`
**Auto-fixable:** Yes ✅

**Line 373** [low impact, type-assertion]
```typescript
const hash = await writeContractAsync({ ...(heroContract as any), functionName: 'setApprovalForAll' as any, args: [partyContract.address, true as any] as any });
```
**Suggested type:** `unknown`
**Auto-fixable:** Yes ✅

**Line 391** [low impact, type-assertion]
```typescript
const hash = await writeContractAsync({ ...(relicContract as any), functionName: 'setApprovalForAll' as any, args: [partyContract.address, true as any] as any });
```
**Suggested type:** `unknown`
**Auto-fixable:** Yes ✅

**Line 391** [low impact, type-assertion]
```typescript
const hash = await writeContractAsync({ ...(relicContract as any), functionName: 'setApprovalForAll' as any, args: [partyContract.address, true as any] as any });
```
**Suggested type:** `unknown`
**Auto-fixable:** Yes ✅

**Line 391** [low impact, type-assertion]
```typescript
const hash = await writeContractAsync({ ...(relicContract as any), functionName: 'setApprovalForAll' as any, args: [partyContract.address, true as any] as any });
```
**Suggested type:** `unknown`
**Auto-fixable:** Yes ✅

**Line 391** [low impact, type-assertion]
```typescript
const hash = await writeContractAsync({ ...(relicContract as any), functionName: 'setApprovalForAll' as any, args: [partyContract.address, true as any] as any });
```
**Suggested type:** `unknown`
**Auto-fixable:** Yes ✅

**Line 410** [low impact, type-assertion]
```typescript
const hash = await writeContractAsync({ ...(partyContract as any), functionName: 'createParty' as any, args: [heroIds as any, relicIds as any] as any, value: fee as any });
```
**Suggested type:** `unknown`
**Auto-fixable:** Yes ✅

**Line 410** [low impact, type-assertion]
```typescript
const hash = await writeContractAsync({ ...(partyContract as any), functionName: 'createParty' as any, args: [heroIds as any, relicIds as any] as any, value: fee as any });
```
**Suggested type:** `unknown`
**Auto-fixable:** Yes ✅

**Line 410** [low impact, type-assertion]
```typescript
const hash = await writeContractAsync({ ...(partyContract as any), functionName: 'createParty' as any, args: [heroIds as any, relicIds as any] as any, value: fee as any });
```
**Suggested type:** `unknown`
**Auto-fixable:** Yes ✅

**Line 410** [low impact, type-assertion]
```typescript
const hash = await writeContractAsync({ ...(partyContract as any), functionName: 'createParty' as any, args: [heroIds as any, relicIds as any] as any, value: fee as any });
```
**Suggested type:** `unknown`
**Auto-fixable:** Yes ✅

**Line 410** [low impact, type-assertion]
```typescript
const hash = await writeContractAsync({ ...(partyContract as any), functionName: 'createParty' as any, args: [heroIds as any, relicIds as any] as any, value: fee as any });
```
**Suggested type:** `unknown`
**Auto-fixable:** Yes ✅

**Line 410** [low impact, type-assertion]
```typescript
const hash = await writeContractAsync({ ...(partyContract as any), functionName: 'createParty' as any, args: [heroIds as any, relicIds as any] as any, value: fee as any });
```
**Suggested type:** `unknown`
**Auto-fixable:** Yes ✅

### src/pages/ProfilePage.tsx

**Line 77** [low impact, type-assertion]
```typescript
...(playerProfileContract as any),
```
**Suggested type:** `unknown`
**Auto-fixable:** Yes ✅

**Line 78** [low impact, type-assertion]
```typescript
functionName: 'tokenURI' as any,
```
**Suggested type:** `unknown`
**Auto-fixable:** Yes ✅

**Line 79** [low impact, type-assertion]
```typescript
args: [tokenId!] as any,
```
**Suggested type:** `unknown`
**Auto-fixable:** Yes ✅

### src/pages/ProvisionsPage.tsx

**Line 34** [low impact, type-assertion]
```typescript
...(dungeonMasterContract as any),
```
**Suggested type:** `unknown`
**Auto-fixable:** Yes ✅

**Line 35** [low impact, type-assertion]
```typescript
functionName: 'provisionPriceUSD' as any,
```
**Suggested type:** `unknown`
**Auto-fixable:** Yes ✅

**Line 42** [low impact, type-assertion]
```typescript
...(dungeonCoreContract as any),
```
**Suggested type:** `unknown`
**Auto-fixable:** Yes ✅

**Line 43** [low impact, type-assertion]
```typescript
functionName: 'getSoulShardAmountForUSD' as any,
```
**Suggested type:** `unknown`
**Auto-fixable:** Yes ✅

**Line 44** [low impact, type-assertion]
```typescript
args: [typeof provisionPriceUSD === 'bigint' ? provisionPriceUSD * BigInt(quantity) : 0n] as any,
```
**Suggested type:** `unknown`
**Auto-fixable:** Yes ✅

**Line 54** [low impact, type-assertion]
```typescript
...(soulShardContract as any),
```
**Suggested type:** `unknown`
**Auto-fixable:** Yes ✅

**Line 55** [low impact, type-assertion]
```typescript
functionName: 'allowance' as any,
```
**Suggested type:** `unknown`
**Auto-fixable:** Yes ✅

**Line 56** [low impact, type-assertion]
```typescript
args: [address!, dungeonMasterContract?.address] as any,
```
**Suggested type:** `unknown`
**Auto-fixable:** Yes ✅

### src/pages/VipPage.tsx

**Line 135** [low impact, type-assertion]
```typescript
writeContractAsync({ ...(soulShardContract as any), functionName: 'approve' as any, args: [vipStakingContract!.address, maxUint256] as any }),
```
**Suggested type:** `unknown`
**Auto-fixable:** Yes ✅

**Line 135** [low impact, type-assertion]
```typescript
writeContractAsync({ ...(soulShardContract as any), functionName: 'approve' as any, args: [vipStakingContract!.address, maxUint256] as any }),
```
**Suggested type:** `unknown`
**Auto-fixable:** Yes ✅

**Line 135** [low impact, type-assertion]
```typescript
writeContractAsync({ ...(soulShardContract as any), functionName: 'approve' as any, args: [vipStakingContract!.address, maxUint256] as any }),
```
**Suggested type:** `unknown`
**Auto-fixable:** Yes ✅

**Line 139** [low impact, type-assertion]
```typescript
writeContractAsync({ ...(vipStakingContract as any), functionName: 'stake' as any, args: [parseEther(amount)] as any }),
```
**Suggested type:** `unknown`
**Auto-fixable:** Yes ✅

**Line 139** [low impact, type-assertion]
```typescript
writeContractAsync({ ...(vipStakingContract as any), functionName: 'stake' as any, args: [parseEther(amount)] as any }),
```
**Suggested type:** `unknown`
**Auto-fixable:** Yes ✅

**Line 139** [low impact, type-assertion]
```typescript
writeContractAsync({ ...(vipStakingContract as any), functionName: 'stake' as any, args: [parseEther(amount)] as any }),
```
**Suggested type:** `unknown`
**Auto-fixable:** Yes ✅

**Line 143** [low impact, type-assertion]
```typescript
writeContractAsync({ ...(vipStakingContract as any), functionName: 'requestUnstake' as any, args: [parseEther(amount)] as any }),
```
**Suggested type:** `unknown`
**Auto-fixable:** Yes ✅

**Line 143** [low impact, type-assertion]
```typescript
writeContractAsync({ ...(vipStakingContract as any), functionName: 'requestUnstake' as any, args: [parseEther(amount)] as any }),
```
**Suggested type:** `unknown`
**Auto-fixable:** Yes ✅

**Line 143** [low impact, type-assertion]
```typescript
writeContractAsync({ ...(vipStakingContract as any), functionName: 'requestUnstake' as any, args: [parseEther(amount)] as any }),
```
**Suggested type:** `unknown`
**Auto-fixable:** Yes ✅

**Line 147** [low impact, type-assertion]
```typescript
writeContractAsync({ ...(vipStakingContract as any), functionName: 'claimUnstaked' as any }),
```
**Suggested type:** `unknown`
**Auto-fixable:** Yes ✅

**Line 147** [low impact, type-assertion]
```typescript
writeContractAsync({ ...(vipStakingContract as any), functionName: 'claimUnstaked' as any }),
```
**Suggested type:** `unknown`
**Auto-fixable:** Yes ✅
