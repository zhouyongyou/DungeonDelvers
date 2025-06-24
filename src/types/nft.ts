// 這個型別用於區分不同的 NFT 種類
export type NftType = 'hero' | 'relic' | 'party';

// 所有 NFT 的基礎屬性
export interface BaseNft {
  id: bigint;
  name?: string;
  image?: string;
}

// 英雄 NFT 的獨有屬性
export interface HeroNft extends BaseNft {
  type: 'hero';
  rarity: number;
  power: bigint;
}

// 聖物 NFT 的獨有屬性
export interface RelicNft extends BaseNft {
  type: 'relic';
  rarity: number;
  capacity: number;
}

// 隊伍 NFT 的獨有屬性
export interface PartyNft extends BaseNft {
  type: 'party';
  heroIds: readonly bigint[];
  relicIds: readonly bigint[];
  totalPower: bigint;
  totalCapacity: bigint;
}

// << --- 這是最關鍵的一行 --- >>
// 我們將上面所有 NFT 型別組合起來，變成一個通用的 AnyNft 型別，並將其導出
export type AnyNft = HeroNft | RelicNft | PartyNft;
