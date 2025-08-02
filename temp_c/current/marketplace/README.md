# DungeonDelvers Marketplace Contracts

P2P NFT marketplace smart contracts for DungeonDelvers game assets.

## Contracts

### DungeonMarketplace.sol
Core marketplace contract for listing and trading NFTs.

**Features:**
- Create NFT listings (Heroes, Relics, Parties)
- Purchase NFTs with SOUL tokens
- Cancel listings
- Update listing prices
- Platform fee system (2.5% default)
- Admin controls for approved NFT contracts

### OfferSystem.sol
Offer system with escrow functionality.

**Features:**
- Make offers on NFTs with SOUL token escrow
- Accept/decline/cancel offers
- Automatic expiration handling
- Platform fee system (2.5% default)
- Message system for offers

## Deployment

### Prerequisites
1. Hardhat development environment
2. BSC network configuration
3. Deployer wallet with BNB for gas fees

### Deploy to BSC Mainnet
```bash
# Navigate to contracts directory
cd /Users/sotadic/Documents/DungeonDelversContracts

# Deploy contracts
npx hardhat run contracts/current/marketplace/deploy-marketplace.js --network bsc
```

### Configuration Update
After deployment, update the following files:

1. **Frontend Configuration** (`/Users/sotadic/Documents/GitHub/DungeonDelvers/src/config/contracts.ts`):
```typescript
DUNGEONMARKETPLACE: '0x...', // Replace with deployed address
OFFERSYSTEM: '0x...', // Replace with deployed address
```

2. **Subgraph Configuration** (`/Users/sotadic/Documents/GitHub/DungeonDelvers/DDgraphql/dungeon-delvers/subgraph.yaml`):
```yaml
- name: DungeonMarketplace
  source:
    address: '0x...' # Replace with deployed address
    startBlock: 12345678 # Replace with deployment block

- name: OfferSystem  
  source:
    address: '0x...' # Replace with deployed address
    startBlock: 12345678 # Replace with deployment block
```

## Contract Interactions

### Prerequisites for Users
1. **NFT Approval**: Users must approve the marketplace contract to transfer their NFTs
2. **SOUL Approval**: Users must approve marketplace/offer contracts to spend SOUL tokens

### Creating Listings
1. User calls `setApprovalForAll(marketplaceAddress, true)` on NFT contract
2. User calls `createListing(nftType, nftContract, tokenId, price)` on marketplace

### Purchasing NFTs
1. User calls `approve(marketplaceAddress, amount)` on SOUL token contract
2. User calls `purchaseNFT(listingId)` on marketplace

### Making Offers
1. User calls `approve(offerSystemAddress, amount)` on SOUL token contract
2. User calls `makeOffer(seller, nftType, nftContract, tokenId, amount, duration, message)` on offer system

## Security Features

### Access Control
- Owner-only functions for platform fee and approved contracts
- ReentrancyGuard protection on all state-changing functions
- Proper ownership verification for listings and offers

### Validation
- NFT ownership verification before listing/accepting offers
- Proper approval checks before transfers
- Price and duration validation
- Contract approval whitelist

### Emergency Controls
- Owner can emergency cancel listings
- Owner can emergency cancel offers
- Platform fee capped at 10%

## Events

### Marketplace Events
- `ListingCreated(listingId, seller, nftType, nftContract, tokenId, price)`
- `ListingSold(listingId, seller, buyer, price, platformFee)`
- `ListingCancelled(listingId, seller)`
- `ListingPriceUpdated(listingId, oldPrice, newPrice)`

### Offer System Events
- `OfferCreated(offerId, buyer, seller, nftType, nftContract, tokenId, amount, expiresAt, message)`
- `OfferAccepted(offerId, buyer, seller, amount, platformFee)`
- `OfferDeclined(offerId, seller)`
- `OfferCancelled(offerId, buyer)`
- `OfferExpired(offerId)`

## Integration with Frontend

The marketplace contracts integrate with the existing frontend through:

1. **useMarketplaceContract** hook for marketplace interactions
2. **useOfferSystemContract** hook for offer system interactions  
3. **useNftApproval** hook for NFT approvals
4. **useSoulApproval** hook for SOUL token approvals

## Gas Optimization

- Efficient storage patterns
- Minimal external calls
- Batch operations support
- Event-based state tracking for frontend

## Testing

```bash
# Run contract tests
npx hardhat test test/marketplace/

# Run gas analysis
npx hardhat test --gas-reporter
```

## Upgradeability

Contracts are not upgradeable by design for security and decentralization. New features require new contract deployments with migration paths.

## License

MIT License - see LICENSE file for details.