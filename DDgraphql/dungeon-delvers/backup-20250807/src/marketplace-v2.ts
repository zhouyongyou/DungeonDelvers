// DungeonDelvers Marketplace V2 Event Handlers
// 處理多幣種市場合約的事件

import { BigInt, BigDecimal, Address, Bytes } from "@graphprotocol/graph-ts";
import {
  ListingCreated,
  ListingSold,
  ListingCancelled,
  ListingPriceUpdated,
  ListingTokensUpdated,
  PlatformFeeUpdated,  
  FeeRecipientUpdated,
  NFTContractApproved,
  PaymentTokenAdded,
  PaymentTokenRemoved
} from "../generated/DungeonMarketplaceV2/DungeonMarketplaceV2";
import {
  MarketListingV2,
  MarketTransactionV2,
  ListingPriceUpdateV2,
  MarketStatsV2,
  TokenSupport,
  TokenVolume,
  DailyMarketStatsV2,
  HourlyMarketStatsV2,
  UserMarketStatsV2,
  NFTMarketStatsV2
} from "../generated/schema";

// Constants
const ZERO_BD = BigDecimal.fromString("0");
const ONE_BI = BigInt.fromI32(1);
const SECONDS_PER_DAY = BigInt.fromI32(86400);
const SECONDS_PER_HOUR = BigInt.fromI32(3600);

// Helper functions
function getNFTTypeString(nftType: i32): string {
  if (nftType == 0) return "HERO";
  if (nftType == 1) return "RELIC";
  if (nftType == 2) return "PARTY";
  if (nftType == 3) return "VIP";
  return "UNKNOWN";
}

function getOrCreateMarketStats(): MarketStatsV2 {
  let stats = MarketStatsV2.load("global");
  if (stats == null) {
    stats = new MarketStatsV2("global");
    stats.totalListings = BigInt.fromI32(0);
    stats.activeListings = BigInt.fromI32(0);
    stats.totalSales = BigInt.fromI32(0);
    stats.totalVolume = ZERO_BD;
    stats.totalVolumeByToken = [];
    stats.totalOffers = BigInt.fromI32(0);
    stats.activeOffers = BigInt.fromI32(0);
    stats.platformFeesCollected = ZERO_BD;
    stats.platformFeesCollectedByToken = [];
    stats.lastUpdated = BigInt.fromI32(0);
    stats.save();
  }
  return stats as MarketStatsV2;
}

function getOrCreateDailyStats(timestamp: BigInt): DailyMarketStatsV2 {
  let dayId = timestamp.div(SECONDS_PER_DAY);
  let dayStartTimestamp = dayId.times(SECONDS_PER_DAY);
  let id = dayStartTimestamp.toString();

  let dailyStats = DailyMarketStatsV2.load(id);
  if (dailyStats == null) {
    dailyStats = new DailyMarketStatsV2(id);
    dailyStats.date = dayStartTimestamp;
    dailyStats.listings = BigInt.fromI32(0);
    dailyStats.sales = BigInt.fromI32(0);
    dailyStats.volume = ZERO_BD;
    dailyStats.volumeByToken = [];
    dailyStats.uniqueBuyers = BigInt.fromI32(0);
    dailyStats.uniqueSellers = BigInt.fromI32(0);
    dailyStats.offers = BigInt.fromI32(0);
    dailyStats.offersAccepted = BigInt.fromI32(0);
    dailyStats.save();
  }
  return dailyStats as DailyMarketStatsV2;
}

function getOrCreateHourlyStats(timestamp: BigInt): HourlyMarketStatsV2 {
  let hourId = timestamp.div(SECONDS_PER_HOUR);
  let hourStartTimestamp = hourId.times(SECONDS_PER_HOUR);
  let id = hourStartTimestamp.toString();

  let hourlyStats = HourlyMarketStatsV2.load(id);
  if (hourlyStats == null) {
    hourlyStats = new HourlyMarketStatsV2(id);
    hourlyStats.hour = hourStartTimestamp;
    hourlyStats.listings = BigInt.fromI32(0);
    hourlyStats.sales = BigInt.fromI32(0);
    hourlyStats.volume = ZERO_BD;
    hourlyStats.volumeByToken = [];
    hourlyStats.uniqueBuyers = BigInt.fromI32(0);
    hourlyStats.uniqueSellers = BigInt.fromI32(0);
    hourlyStats.offers = BigInt.fromI32(0);
    hourlyStats.offersAccepted = BigInt.fromI32(0);
    hourlyStats.save();
  }
  return hourlyStats as HourlyMarketStatsV2;
}

function getOrCreateUserStats(userAddress: Address): UserMarketStatsV2 {
  let id = userAddress.toHexString();
  let userStats = UserMarketStatsV2.load(id);
  if (userStats == null) {
    userStats = new UserMarketStatsV2(id);
    userStats.userAddress = userAddress;
    userStats.totalListings = BigInt.fromI32(0);
    userStats.totalSales = BigInt.fromI32(0);
    userStats.totalPurchases = BigInt.fromI32(0);
    userStats.totalVolumeAsSeller = ZERO_BD;
    userStats.totalVolumeAsBuyer = ZERO_BD;
    userStats.totalOffersMade = BigInt.fromI32(0);
    userStats.totalOffersReceived = BigInt.fromI32(0);
    userStats.totalOffersAccepted = BigInt.fromI32(0);
    userStats.firstActivityAt = BigInt.fromI32(0);
    userStats.lastActivityAt = BigInt.fromI32(0);
    userStats.save();
  }
  return userStats as UserMarketStatsV2;
}

function getOrCreateNFTStats(nftContract: Address, tokenId: BigInt, nftType: string): NFTMarketStatsV2 {
  let id = nftContract.toHexString() + "-" + tokenId.toString();
  let nftStats = NFTMarketStatsV2.load(id);
  if (nftStats == null) {
    nftStats = new NFTMarketStatsV2(id);
    nftStats.nftContract = nftContract;
    nftStats.tokenId = tokenId;
    nftStats.nftType = nftType;
    nftStats.totalListings = BigInt.fromI32(0);
    nftStats.totalSales = BigInt.fromI32(0);
    nftStats.totalOffers = BigInt.fromI32(0);
    nftStats.save();
  }
  return nftStats as NFTMarketStatsV2;
}

// Event Handlers
export function handleListingCreated(event: ListingCreated): void {
  let listing = new MarketListingV2(event.params.listingId.toString());
  listing.listingId = event.params.listingId;
  listing.seller = event.params.seller;
  listing.nftType = getNFTTypeString(event.params.nftType);
  listing.nftContract = event.params.nftContract;
  listing.tokenId = event.params.tokenId;
  listing.price = event.params.price.toBigDecimal().div(BigDecimal.fromString("1000000000000000000")); // Convert from wei to tokens
  listing.acceptedTokens = event.params.acceptedTokens.map<Bytes>((token: Address) => token as Bytes);
  listing.isActive = true;
  listing.createdAt = event.block.timestamp;
  listing.updatedAt = event.block.timestamp;
  listing.save();

  // Update statistics
  let stats = getOrCreateMarketStats();
  stats.totalListings = stats.totalListings.plus(ONE_BI);
  stats.activeListings = stats.activeListings.plus(ONE_BI);
  stats.lastUpdated = event.block.timestamp;
  stats.save();

  let dailyStats = getOrCreateDailyStats(event.block.timestamp);
  dailyStats.listings = dailyStats.listings.plus(ONE_BI);
  dailyStats.save();

  let hourlyStats = getOrCreateHourlyStats(event.block.timestamp);
  hourlyStats.listings = hourlyStats.listings.plus(ONE_BI);
  hourlyStats.save();

  let userStats = getOrCreateUserStats(event.params.seller);
  userStats.totalListings = userStats.totalListings.plus(ONE_BI);
  if (userStats.firstActivityAt.equals(BigInt.fromI32(0))) {
    userStats.firstActivityAt = event.block.timestamp;
  }
  userStats.lastActivityAt = event.block.timestamp;
  userStats.save();

  let nftStats = getOrCreateNFTStats(event.params.nftContract, event.params.tokenId, getNFTTypeString(event.params.nftType));
  nftStats.totalListings = nftStats.totalListings.plus(ONE_BI);
  nftStats.lastListingPrice = listing.price;
  nftStats.lastListingTokens = listing.acceptedTokens;
  nftStats.lastListingAt = event.block.timestamp;
  nftStats.save();
}

export function handleListingSold(event: ListingSold): void {
  let listing = MarketListingV2.load(event.params.listingId.toString());
  if (listing == null) {
    return;
  }

  // Mark listing as inactive
  listing.isActive = false;
  listing.updatedAt = event.block.timestamp;
  listing.save();

  // Create transaction record
  let transaction = new MarketTransactionV2(event.transaction.hash.toHexString() + "-" + event.logIndex.toString());
  transaction.listingId = event.params.listingId;
  transaction.buyer = event.params.buyer;
  transaction.seller = event.params.seller;
  transaction.nftType = listing.nftType;
  transaction.nftContract = listing.nftContract;
  transaction.tokenId = listing.tokenId;
  transaction.price = event.params.price.toBigDecimal().div(BigDecimal.fromString("1000000000000000000"));
  transaction.paymentToken = event.params.paymentToken;
  transaction.platformFee = event.params.platformFeeAmount.toBigDecimal().div(BigDecimal.fromString("1000000000000000000"));
  transaction.timestamp = event.block.timestamp;
  transaction.blockNumber = event.block.number;
  transaction.transactionHash = event.transaction.hash;
  transaction.listing = listing.id;
  transaction.save();

  // Link transaction to listing
  listing.soldTransaction = transaction.id;
  listing.save();

  // Update statistics
  let stats = getOrCreateMarketStats();
  stats.activeListings = stats.activeListings.minus(ONE_BI);
  stats.totalSales = stats.totalSales.plus(ONE_BI);
  stats.totalVolume = stats.totalVolume.plus(transaction.price);
  stats.platformFeesCollected = stats.platformFeesCollected.plus(transaction.platformFee);
  stats.lastUpdated = event.block.timestamp;
  stats.save();

  let dailyStats = getOrCreateDailyStats(event.block.timestamp);
  dailyStats.sales = dailyStats.sales.plus(ONE_BI);
  dailyStats.volume = dailyStats.volume.plus(transaction.price);
  dailyStats.save();

  let hourlyStats = getOrCreateHourlyStats(event.block.timestamp);
  hourlyStats.sales = hourlyStats.sales.plus(ONE_BI);
  hourlyStats.volume = hourlyStats.volume.plus(transaction.price);
  hourlyStats.save();

  // Update user statistics
  let sellerStats = getOrCreateUserStats(event.params.seller);
  sellerStats.totalSales = sellerStats.totalSales.plus(ONE_BI);
  sellerStats.totalVolumeAsSeller = sellerStats.totalVolumeAsSeller.plus(transaction.price);
  sellerStats.lastActivityAt = event.block.timestamp;
  sellerStats.save();

  let buyerStats = getOrCreateUserStats(event.params.buyer);
  buyerStats.totalPurchases = buyerStats.totalPurchases.plus(ONE_BI);
  buyerStats.totalVolumeAsBuyer = buyerStats.totalVolumeAsBuyer.plus(transaction.price);
  if (buyerStats.firstActivityAt.equals(BigInt.fromI32(0))) {
    buyerStats.firstActivityAt = event.block.timestamp;
  }
  buyerStats.lastActivityAt = event.block.timestamp;
  buyerStats.save();

  // Update NFT statistics
  let nftStats = getOrCreateNFTStats(listing.nftContract as Address, listing.tokenId, listing.nftType);
  nftStats.totalSales = nftStats.totalSales.plus(ONE_BI);
  nftStats.lastSalePrice = transaction.price;
  nftStats.lastSaleToken = event.params.paymentToken;
  nftStats.lastSaleAt = event.block.timestamp;
  
  // Use simpler null checks for AssemblyScript
  if (!nftStats.highestSalePrice || transaction.price.gt(nftStats.highestSalePrice as BigDecimal)) {
    nftStats.highestSalePrice = transaction.price;
  }
  if (!nftStats.lowestSalePrice || transaction.price.lt(nftStats.lowestSalePrice as BigDecimal)) {
    nftStats.lowestSalePrice = transaction.price;
  }
  
  // Calculate average sale price
  if (!nftStats.averageSalePrice) {
    nftStats.averageSalePrice = transaction.price;
  } else {
    let totalVolume = (nftStats.averageSalePrice as BigDecimal).times(nftStats.totalSales.minus(ONE_BI).toBigDecimal()).plus(transaction.price);
    nftStats.averageSalePrice = totalVolume.div(nftStats.totalSales.toBigDecimal());
  }
  
  if (!nftStats.firstSaleAt) {
    nftStats.firstSaleAt = event.block.timestamp;
  }
  
  nftStats.save();
}

export function handleListingCancelled(event: ListingCancelled): void {
  let listing = MarketListingV2.load(event.params.listingId.toString());
  if (listing == null) {
    return;
  }

  listing.isActive = false;
  listing.updatedAt = event.block.timestamp;
  listing.save();

  // Update statistics
  let stats = getOrCreateMarketStats();
  stats.activeListings = stats.activeListings.minus(ONE_BI);
  stats.lastUpdated = event.block.timestamp;
  stats.save();

  let userStats = getOrCreateUserStats(event.params.seller);
  userStats.lastActivityAt = event.block.timestamp;
  userStats.save();
}

export function handleListingPriceUpdated(event: ListingPriceUpdated): void {
  let listing = MarketListingV2.load(event.params.listingId.toString());
  if (listing == null) {
    return;
  }

  // Create price update record
  let priceUpdate = new ListingPriceUpdateV2(event.transaction.hash.toHexString() + "-" + event.logIndex.toString());
  priceUpdate.listingId = event.params.listingId;
  priceUpdate.oldPrice = event.params.oldPrice.toBigDecimal().div(BigDecimal.fromString("1000000000000000000"));
  priceUpdate.newPrice = event.params.newPrice.toBigDecimal().div(BigDecimal.fromString("1000000000000000000"));
  priceUpdate.oldAcceptedTokens = listing.acceptedTokens;
  priceUpdate.newAcceptedTokens = listing.acceptedTokens; // Keep same tokens, only price changed
  priceUpdate.timestamp = event.block.timestamp;
  priceUpdate.blockNumber = event.block.number;
  priceUpdate.transactionHash = event.transaction.hash;
  priceUpdate.listing = listing.id;
  priceUpdate.save();

  // Update listing
  listing.price = priceUpdate.newPrice;
  listing.updatedAt = event.block.timestamp;
  listing.save();

  // Update NFT stats
  let nftStats = getOrCreateNFTStats(listing.nftContract as Address, listing.tokenId, listing.nftType);
  nftStats.lastListingPrice = priceUpdate.newPrice;
  nftStats.lastListingAt = event.block.timestamp;
  nftStats.save();
}

export function handlePlatformFeeUpdated(event: PlatformFeeUpdated): void {
  // Could be used to track platform fee changes over time
  // For now, just update the global stats timestamp
  let stats = getOrCreateMarketStats();
  stats.lastUpdated = event.block.timestamp;
  stats.save();
}

export function handleFeeRecipientUpdated(event: FeeRecipientUpdated): void {
  // Could be used to track fee recipient changes
  let stats = getOrCreateMarketStats();
  stats.lastUpdated = event.block.timestamp;
  stats.save();
}

export function handleNFTContractApproved(event: NFTContractApproved): void {
  // Could be used to track which NFT contracts are approved
  let stats = getOrCreateMarketStats();
  stats.lastUpdated = event.block.timestamp;
  stats.save();
}

export function handleListingTokensUpdated(event: ListingTokensUpdated): void {
  let listing = MarketListingV2.load(event.params.listingId.toString());
  if (listing == null) {
    return;
  }

  listing.acceptedTokens = event.params.newAcceptedTokens.map<Bytes>((token: Address) => token as Bytes);
  listing.updatedAt = event.block.timestamp;
  listing.save();

  // Update NFT stats
  let nftStats = getOrCreateNFTStats(listing.nftContract as Address, listing.tokenId, listing.nftType);
  nftStats.lastListingTokens = listing.acceptedTokens;
  nftStats.lastListingAt = event.block.timestamp;
  nftStats.save();
}

export function handlePaymentTokenAdded(event: PaymentTokenAdded): void {
  let tokenSupport = TokenSupport.load(event.params.token.toHexString());
  if (tokenSupport == null) {
    tokenSupport = new TokenSupport(event.params.token.toHexString());
    tokenSupport.tokenAddress = event.params.token;
    tokenSupport.addedAt = event.block.timestamp;
  }
  tokenSupport.isSupported = true;
  tokenSupport.updatedAt = event.block.timestamp;
  tokenSupport.save();

  let stats = getOrCreateMarketStats();
  stats.lastUpdated = event.block.timestamp;
  stats.save();
}

export function handlePaymentTokenRemoved(event: PaymentTokenRemoved): void {
  let tokenSupport = TokenSupport.load(event.params.token.toHexString());
  if (tokenSupport == null) {
    tokenSupport = new TokenSupport(event.params.token.toHexString());
    tokenSupport.tokenAddress = event.params.token;
    tokenSupport.addedAt = event.block.timestamp;
  }
  tokenSupport.isSupported = false;
  tokenSupport.updatedAt = event.block.timestamp;
  tokenSupport.save();

  let stats = getOrCreateMarketStats();
  stats.lastUpdated = event.block.timestamp;
  stats.save();
}