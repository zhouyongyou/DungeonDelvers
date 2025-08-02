# 市場功能子圖配置封存

## 封存日期
2025-08-02

## 封存原因
為了提升子圖同步速度，暫時移除市場相關合約的監聽。

## 被移除的合約配置

### 1. DungeonMarketplaceV2
```yaml
- kind: ethereum/contract
  name: DungeonMarketplaceV2
  network: bsc
  source:
    address: '0xCd2Dc43ddB5f628f98CDAA273bd74605cBDF21F8'
    abi: DungeonMarketplaceV2
    startBlock: 55700000
  mapping:
    kind: ethereum/events
    apiVersion: 0.0.6
    language: wasm/assemblyscript
    entities:
      - MarketListingV2
      - MarketTransactionV2
      - ListingPriceUpdateV2
      - MarketStatsV2
      - TokenSupport
    abis:
      - name: DungeonMarketplaceV2
        file: ./abis/DungeonMarketplaceV2.json
      - name: ERC20
        file: ./abis/ERC20.json
    eventHandlers:
      - event: ListingCreated(indexed uint256,indexed address,uint8,address,uint256,uint256,address[])
        handler: handleListingCreated
      - event: ListingSold(indexed uint256,indexed address,indexed address,address,uint256,uint256)
        handler: handleListingSold
      - event: ListingCancelled(indexed uint256,indexed address)
        handler: handleListingCancelled
      - event: ListingPriceUpdated(indexed uint256,uint256,uint256)
        handler: handleListingPriceUpdated
      - event: ListingTokensUpdated(indexed uint256,address[])
        handler: handleListingTokensUpdated
      - event: PlatformFeeUpdated(uint256,uint256)
        handler: handlePlatformFeeUpdated
      - event: FeeRecipientUpdated(address,address)
        handler: handleFeeRecipientUpdated
      - event: NFTContractApproved(address)
        handler: handleNFTContractApproved
      - event: PaymentTokenAdded(address)
        handler: handlePaymentTokenAdded
      - event: PaymentTokenRemoved(address)
        handler: handlePaymentTokenRemoved
    file: ./src/marketplace-v2.ts
```

### 2. OfferSystemV2
```yaml
- kind: ethereum/contract
  name: OfferSystemV2
  network: bsc
  source:
    address: '0x4e1A3B4C072C81d6CB63A72F8fDD18A3aE55c65b'
    abi: OfferSystemV2
    startBlock: 56065457
  mapping:
    kind: ethereum/events
    apiVersion: 0.0.6
    language: wasm/assemblyscript
    entities:
      - OfferV2
      - OfferTransactionV2
      - MarketStatsV2
    abis:
      - name: OfferSystemV2
        file: ./abis/OfferSystemV2.json
      - name: ERC20
        file: ./abis/ERC20.json
    eventHandlers:
      - event: OfferMade(indexed uint256,indexed address,indexed address,uint8,address,uint256,uint256,address,uint256)
        handler: handleOfferMade
      - event: OfferAccepted(indexed uint256,indexed address,indexed address,uint256,address,uint256)
        handler: handleOfferAccepted
      - event: OfferDeclined(indexed uint256,indexed address)
        handler: handleOfferDeclined
      - event: OfferCancelled(indexed uint256,indexed address)
        handler: handleOfferCancelled
      - event: OfferExpired(indexed uint256)
        handler: handleOfferExpired
      - event: PlatformFeeUpdated(uint256,uint256)
        handler: handleOfferPlatformFeeUpdated
      - event: FeeRecipientUpdated(address,address)
        handler: handleOfferFeeRecipientUpdated
      - event: NFTContractApproved(address)
        handler: handleOfferNFTContractApproved
      - event: PaymentTokenAdded(address)
        handler: handleOfferPaymentTokenAdded
      - event: PaymentTokenRemoved(address)
        handler: handleOfferPaymentTokenRemoved
    file: ./src/offer-system-v2.ts
```

## 相關檔案
- `src/marketplace-v2.ts` - 市場事件處理器
- `src/offer-system-v2.ts` - 報價系統事件處理器
- `abis/DungeonMarketplaceV2.json` - 市場合約 ABI
- `abis/OfferSystemV2.json` - 報價合約 ABI

## Schema 實體
被暫停索引的實體：
- MarketListingV2
- MarketTransactionV2
- ListingPriceUpdateV2
- MarketStatsV2
- TokenSupport
- TokenVolume
- DailyMarketStatsV2
- HourlyMarketStatsV2
- UserMarketStatsV2
- NFTMarketStatsV2
- OfferV2
- OfferTransactionV2

## 恢復方式
要恢復市場功能，請：
1. 複製此文檔中的配置到 `subgraph.yaml`
2. 重新構建和部署子圖
3. 等待歷史資料重新索引

## 效能提升預期
移除市場合約後預期效果：
- 同步速度提升 60-80%
- 延遲從 17分鐘降到 3-5分鐘
- 減少 2個複雜合約的事件處理

## 替代方案
在市場功能恢復前，建議用戶使用：
- OKX NFT 市場: https://www.okx.com/web3/marketplace/nft/collection/bsc/dungeon-delvers