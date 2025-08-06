// DungeonDelvers Offer System V2 Event Handlers
// 處理多幣種出價系統合約的事件

import { BigInt, BigDecimal, Address, Bytes } from "@graphprotocol/graph-ts";
import {
  OfferMade,
  OfferAccepted,
  OfferDeclined,
  OfferCancelled,
  OfferExpired,
  PlatformFeeUpdated,
  FeeRecipientUpdated,
  NFTContractApproved,
  PaymentTokenAdded,
  PaymentTokenRemoved
} from "../generated/OfferSystemV2/OfferSystemV2";
import {
  OfferV2,
  OfferTransactionV2,
  MarketStatsV2,
  TokenSupport,
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
export function handleOfferMade(event: OfferMade): void {
  let offer = new OfferV2(event.params.offerId.toString());
  offer.offerId = event.params.offerId;
  offer.offerer = event.params.buyer;
  offer.targetAddress = event.params.seller;
  offer.nftType = getNFTTypeString(event.params.nftType);
  offer.nftContract = event.params.nftContract;
  offer.tokenId = event.params.tokenId;
  offer.offerAmount = event.params.amount.toBigDecimal().div(BigDecimal.fromString("1000000000000000000"));
  offer.paymentToken = event.params.paymentToken;
  offer.expirationTime = event.params.expiresAt;
  offer.message = ""; // OfferMade doesn't have a message parameter
  offer.status = "ACTIVE";
  offer.createdAt = event.block.timestamp;
  offer.updatedAt = event.block.timestamp;
  offer.save();

  // Update statistics
  let stats = getOrCreateMarketStats();
  stats.totalOffers = stats.totalOffers.plus(ONE_BI);
  stats.activeOffers = stats.activeOffers.plus(ONE_BI);
  stats.lastUpdated = event.block.timestamp;
  stats.save();

  let dailyStats = getOrCreateDailyStats(event.block.timestamp);
  dailyStats.offers = dailyStats.offers.plus(ONE_BI);
  dailyStats.save();

  let hourlyStats = getOrCreateHourlyStats(event.block.timestamp);
  hourlyStats.offers = hourlyStats.offers.plus(ONE_BI);
  hourlyStats.save();

  // Update user statistics
  let offererStats = getOrCreateUserStats(event.params.buyer);
  offererStats.totalOffersMade = offererStats.totalOffersMade.plus(ONE_BI);
  if (offererStats.firstActivityAt.equals(BigInt.fromI32(0))) {
    offererStats.firstActivityAt = event.block.timestamp;
  }
  offererStats.lastActivityAt = event.block.timestamp;
  offererStats.save();

  let targetStats = getOrCreateUserStats(event.params.seller);
  targetStats.totalOffersReceived = targetStats.totalOffersReceived.plus(ONE_BI);
  if (targetStats.firstActivityAt.equals(BigInt.fromI32(0))) {
    targetStats.firstActivityAt = event.block.timestamp;
  }
  targetStats.lastActivityAt = event.block.timestamp;
  targetStats.save();

  // Update NFT statistics
  let nftStats = getOrCreateNFTStats(event.params.nftContract, event.params.tokenId, getNFTTypeString(event.params.nftType));
  nftStats.totalOffers = nftStats.totalOffers.plus(ONE_BI);
  if (!nftStats.highestOfferAmount || offer.offerAmount.gt(nftStats.highestOfferAmount as BigDecimal)) {
    nftStats.highestOfferAmount = offer.offerAmount;
  }
  nftStats.save();
}

export function handleOfferAccepted(event: OfferAccepted): void {
  let offer = OfferV2.load(event.params.offerId.toString());
  if (offer == null) {
    return;
  }

  // Update offer status
  offer.status = "ACCEPTED";
  offer.updatedAt = event.block.timestamp;
  offer.save();

  // Create transaction record
  let transaction = new OfferTransactionV2(event.transaction.hash.toHexString() + "-" + event.logIndex.toString());
  transaction.offerId = event.params.offerId;
  transaction.offerer = event.params.buyer;
  transaction.accepter = event.params.seller;
  transaction.nftType = offer.nftType;
  transaction.nftContract = offer.nftContract;
  transaction.tokenId = offer.tokenId;
  transaction.offerAmount = event.params.amount.toBigDecimal().div(BigDecimal.fromString("1000000000000000000"));
  transaction.paymentToken = event.params.paymentToken;
  transaction.platformFee = event.params.platformFeeAmount.toBigDecimal().div(BigDecimal.fromString("1000000000000000000"));
  transaction.timestamp = event.block.timestamp;
  transaction.blockNumber = event.block.number;
  transaction.transactionHash = event.transaction.hash;
  transaction.offer = offer.id;
  transaction.save();

  // Link transaction to offer
  offer.acceptedTransaction = transaction.id;
  offer.save();

  // Update statistics
  let stats = getOrCreateMarketStats();
  stats.activeOffers = stats.activeOffers.minus(ONE_BI);
  stats.totalSales = stats.totalSales.plus(ONE_BI);
  stats.totalVolume = stats.totalVolume.plus(transaction.offerAmount);
  stats.platformFeesCollected = stats.platformFeesCollected.plus(transaction.platformFee);
  stats.lastUpdated = event.block.timestamp;
  stats.save();

  let dailyStats = getOrCreateDailyStats(event.block.timestamp);
  dailyStats.sales = dailyStats.sales.plus(ONE_BI);
  dailyStats.volume = dailyStats.volume.plus(transaction.offerAmount);
  dailyStats.offersAccepted = dailyStats.offersAccepted.plus(ONE_BI);
  dailyStats.save();

  let hourlyStats = getOrCreateHourlyStats(event.block.timestamp);
  hourlyStats.sales = hourlyStats.sales.plus(ONE_BI);
  hourlyStats.volume = hourlyStats.volume.plus(transaction.offerAmount);
  hourlyStats.offersAccepted = hourlyStats.offersAccepted.plus(ONE_BI);
  hourlyStats.save();

  // Update user statistics
  let offererStats = getOrCreateUserStats(event.params.buyer);
  offererStats.totalPurchases = offererStats.totalPurchases.plus(ONE_BI);
  offererStats.totalVolumeAsBuyer = offererStats.totalVolumeAsBuyer.plus(transaction.offerAmount);
  offererStats.lastActivityAt = event.block.timestamp;
  offererStats.save();

  let accepterStats = getOrCreateUserStats(event.params.seller);
  accepterStats.totalSales = accepterStats.totalSales.plus(ONE_BI);
  accepterStats.totalVolumeAsSeller = accepterStats.totalVolumeAsSeller.plus(transaction.offerAmount);
  accepterStats.totalOffersAccepted = accepterStats.totalOffersAccepted.plus(ONE_BI);
  accepterStats.lastActivityAt = event.block.timestamp;
  accepterStats.save();

  // Update NFT statistics
  let nftStats = getOrCreateNFTStats(offer.nftContract as Address, offer.tokenId, offer.nftType);
  nftStats.totalSales = nftStats.totalSales.plus(ONE_BI);
  nftStats.lastSalePrice = transaction.offerAmount;
  nftStats.lastSaleToken = offer.paymentToken;
  nftStats.lastSaleAt = event.block.timestamp;
  
  if (!nftStats.highestSalePrice || transaction.offerAmount.gt(nftStats.highestSalePrice as BigDecimal)) {
    nftStats.highestSalePrice = transaction.offerAmount;
  }
  if (!nftStats.lowestSalePrice || transaction.offerAmount.lt(nftStats.lowestSalePrice as BigDecimal)) {
    nftStats.lowestSalePrice = transaction.offerAmount;
  }
  
  // Calculate average sale price
  if (!nftStats.averageSalePrice) {
    nftStats.averageSalePrice = transaction.offerAmount;
  } else {
    let totalVolume = (nftStats.averageSalePrice as BigDecimal).times(nftStats.totalSales.minus(ONE_BI).toBigDecimal()).plus(transaction.offerAmount);
    nftStats.averageSalePrice = totalVolume.div(nftStats.totalSales.toBigDecimal());
  }
  
  if (!nftStats.firstSaleAt) {
    nftStats.firstSaleAt = event.block.timestamp;
  }
  
  nftStats.save();
}

export function handleOfferDeclined(event: OfferDeclined): void {
  let offer = OfferV2.load(event.params.offerId.toString());
  if (offer == null) {
    return;
  }

  offer.status = "DECLINED";
  offer.updatedAt = event.block.timestamp;
  offer.save();

  // Update statistics
  let stats = getOrCreateMarketStats();
  stats.activeOffers = stats.activeOffers.minus(ONE_BI);
  stats.lastUpdated = event.block.timestamp;
  stats.save();

  let targetStats = getOrCreateUserStats(event.params.seller);
  targetStats.lastActivityAt = event.block.timestamp;
  targetStats.save();
}

export function handleOfferCancelled(event: OfferCancelled): void {
  let offer = OfferV2.load(event.params.offerId.toString());
  if (offer == null) {
    return;
  }

  offer.status = "CANCELLED";
  offer.updatedAt = event.block.timestamp;
  offer.save();

  // Update statistics
  let stats = getOrCreateMarketStats();
  stats.activeOffers = stats.activeOffers.minus(ONE_BI);
  stats.lastUpdated = event.block.timestamp;
  stats.save();

  let offererStats = getOrCreateUserStats(event.params.buyer);
  offererStats.lastActivityAt = event.block.timestamp;
  offererStats.save();
}

export function handleOfferExpired(event: OfferExpired): void {
  let offer = OfferV2.load(event.params.offerId.toString());
  if (offer == null) {
    return;
  }

  offer.status = "EXPIRED";
  offer.updatedAt = event.block.timestamp;
  offer.save();

  // Update statistics
  let stats = getOrCreateMarketStats();
  stats.activeOffers = stats.activeOffers.minus(ONE_BI);
  stats.lastUpdated = event.block.timestamp;
  stats.save();
}

export function handleOfferPlatformFeeUpdated(event: PlatformFeeUpdated): void {
  let stats = getOrCreateMarketStats();
  stats.lastUpdated = event.block.timestamp;
  stats.save();
}

export function handleOfferFeeRecipientUpdated(event: FeeRecipientUpdated): void {
  let stats = getOrCreateMarketStats();
  stats.lastUpdated = event.block.timestamp;
  stats.save();
}

export function handleOfferNFTContractApproved(event: NFTContractApproved): void {
  let stats = getOrCreateMarketStats();
  stats.lastUpdated = event.block.timestamp;
  stats.save();
}

export function handleOfferPaymentTokenAdded(event: PaymentTokenAdded): void {
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

export function handleOfferPaymentTokenRemoved(event: PaymentTokenRemoved): void {
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