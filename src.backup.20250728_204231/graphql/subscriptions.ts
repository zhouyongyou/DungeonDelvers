// subscriptions.ts - GraphQL 訂閱定義

import { gql } from '@apollo/client';

// 訂閱隊伍狀態變更
export const PARTY_STATUS_SUBSCRIPTION = gql`
  subscription OnPartyStatusChange($partyId: ID!) {
    party(id: $partyId) {
      id
      unclaimedRewards
      cooldownEndsAt
      provisionsRemaining
      lastUpdatedAt
      owner
      totalPower
    }
  }
`;

// 訂閱玩家的最新遠征結果
export const PLAYER_EXPEDITIONS_SUBSCRIPTION = gql`
  subscription OnPlayerExpeditions($player: String!, $timestamp: BigInt!) {
    expeditions(
      where: { 
        player: $player,
        timestamp_gt: $timestamp
      }
      orderBy: timestamp
      orderDirection: desc
      first: 1
    ) {
      id
      party {
        id
      }
      dungeonName
      success
      reward
      expGained
      timestamp
      transactionHash
    }
  }
`;

// 訂閱多個隊伍的狀態（批量訂閱）
export const PARTIES_STATUS_SUBSCRIPTION = gql`
  subscription OnPartiesStatusChange($partyIds: [ID!]!) {
    parties(where: { id_in: $partyIds }) {
      id
      unclaimedRewards
      cooldownEndsAt
      provisionsRemaining
      lastUpdatedAt
      totalPower
    }
  }
`;

// 訂閱玩家檔案更新
export const PLAYER_PROFILE_SUBSCRIPTION = gql`
  subscription OnPlayerProfileUpdate($playerId: ID!) {
    playerProfile(id: $playerId) {
      id
      totalRewardsEarned
      successfulExpeditions
      commissionEarned
      lastUpdatedAt
    }
  }
`;

// 訂閱最新的地城活動（用於即時排行榜）
export const DUNGEON_ACTIVITY_SUBSCRIPTION = gql`
  subscription OnDungeonActivity($dungeonId: BigInt!) {
    expeditions(
      where: { dungeonId: $dungeonId }
      orderBy: timestamp
      orderDirection: desc
      first: 10
    ) {
      id
      player
      party {
        id
        totalPower
      }
      success
      reward
      timestamp
    }
  }
`;

// 用於測試連接的簡單訂閱
export const TEST_SUBSCRIPTION = gql`
  subscription TestConnection {
    _meta {
      block {
        number
        timestamp
      }
    }
  }
`;