/**
 * @fileoverview
 * 這個檔案定義了遊戲中所有 NFT 的 TypeScript 型別。
 * 我們使用 "Discriminated Unions" (辨識聯合) 的設計模式，
 * 為不同種類的 NFT 提供強型別支援，讓前端程式碼更安全、更易於維護。
 */


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
  contractAddress: `0x${string}`;
  /**
   * 資料來源：subgraph | metadata | fallback
   */
  source?: 'subgraph' | 'metadata' | 'fallback';
  /**
   * 是否為同步中（subgraph 與 metadata 不一致時）
   */
  syncing?: boolean;
}

// 英雄 NFT 的獨有屬性
export interface HeroNft extends BaseNft {
  type: 'hero';
  power: number;
  rarity: string | number; // 支持字符串和數字格式
  isRevealed?: boolean; // 是否已揭示
}

// 聖物 NFT 的獨有屬性
export interface RelicNft extends BaseNft {
  type: 'relic';
  capacity: number;
  rarity: string | number; // 支持字符串和數字格式
  isRevealed?: boolean; // 是否已揭示
}

// 隊伍 NFT 的獨有屬性
export interface PartyNft extends BaseNft {
  type: 'party';
  totalPower: bigint;
  totalCapacity: bigint;
  heroIds: bigint[];
  relicIds: bigint[];
  partyRarity: number; // 【新增】新增隊伍稀有度屬性
  entityId?: string; // 子圖中的完整 ID，用於查詢歷史
}

// VIP 卡 NFT 的獨有屬性
export interface VipNft extends BaseNft {
    type: 'vip';
    level: number;
    stakedAmount: bigint;
    stakedValueUSD?: bigint; // 可選的USD價值，由Oracle計算
}

/**
 * 這是最關鍵的型別，代表遊戲中任何一種 NFT。
 */
export type AnyNft = HeroNft | RelicNft | PartyNft | VipNft;

/**
 * 從 AnyNft 推導出所有可能的 NFT 種類字串。
 */
export type NftType = AnyNft['type'];

/**
 * 這個型別用於定義 API 回傳的、已分類的所有 NFT 集合。
 */
export interface AllNftCollections {
  heros: HeroNft[];
  relics: RelicNft[];
  parties: PartyNft[];
  vipCards: VipNft[]; 
}
