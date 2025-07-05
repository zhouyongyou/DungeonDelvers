/**
 * @fileoverview
 * 這個檔案定義了遊戲中所有 NFT 的 TypeScript 型別。
 * 我們使用 "Discriminated Unions" (辨識聯合) 的設計模式，
 * 為不同種類的 NFT 提供強型別支援，讓前端程式碼更安全、更易於維護。
 */

import { type Address } from 'viem';

// 所有 NFT 的元數據中，屬性陣列的單個物件格式
export interface NftAttribute {
  trait_type: string;
  value: string | number;
  display_type?: string;
}

// 所有 NFT 共用的基礎屬性
export interface BaseNft {
  id: bigint;
  name: string;
  description: string;
  image: string;
  attributes: NftAttribute[];
  contractAddress: Address;
}

// 英雄 NFT 的獨有屬性
export interface HeroNft extends BaseNft {
  type: 'hero';
  // 為了方便前端使用，我們可以直接從 attributes 中提取出關鍵屬性
  // 當然，attributes 陣列中仍然會保留原始資料
  power: number;
  rarity: number;
}

// 聖物 NFT 的獨有屬性
export interface RelicNft extends BaseNft {
  type: 'relic';
  capacity: number;
  rarity: number;
}

// 隊伍 NFT 的獨有屬性
// 【修改】新增 heroIds 和 relicIds，與 Party.sol 合約的 getPartyComposition 函式回傳值保持一致
export interface PartyNft extends BaseNft {
  type: 'party';
  totalPower: number;
  totalCapacity: number;
  heroIds: bigint[];
  relicIds: bigint[];
}

// VIP 卡 NFT 的獨有屬性
export interface VipNft extends BaseNft {
    type: 'vip';
    // VIP 卡的核心屬性是它的等級，代表成功率加成
    level: number;
}

/**
 * 這是最關鍵的型別，代表遊戲中任何一種 NFT。
 * 透過 `|` (聯合類型)，我們告訴 TypeScript，一個 AnyNft 變數
 * 可能是 HeroNft、RelicNft、PartyNft 或 VipNft 中的任何一種。
 */
export type AnyNft = HeroNft | RelicNft | PartyNft | VipNft;

/**
 * 從 AnyNft 推導出所有可能的 NFT 種類字串，並將其匯出。
 * 這會自動產生 'hero' | 'relic' | 'party' | 'vip' 的聯合型別。
 */
export type NftType = AnyNft['type'];

/**
 * 這個型別用於定義 API 回傳的、已分類的所有 NFT 集合。
 */
export interface AllNftCollections {
  heroes: HeroNft[];
  relics: RelicNft[];
  parties: PartyNft[];
  vipCards: VipNft[]; 
}
