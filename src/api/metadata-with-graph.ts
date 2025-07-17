// src/api/metadata-with-graph.ts - 整合 The Graph 的動態 Metadata 生成器

import { 
    generateHeroSVG, 
    generateRelicSVG, 
    generatePartySVG, 
    generateVipSVG 
} from '../utils/svgGenerators';

const THE_GRAPH_API_URL = process.env.THE_GRAPH_STUDIO_API_URL || '';

// GraphQL 查詢
const GET_NFT_DATA_QUERY = `
  query GetNFTData($id: ID!, $type: String!) {
    hero(id: $id) @include(if: $type == "hero") {
      tokenId
      power
      rarity
      owner {
        id
      }
    }
    relic(id: $id) @include(if: $type == "relic") {
      tokenId
      capacity
      rarity
      owner {
        id
      }
    }
    party(id: $id) @include(if: $type == "party") {
      tokenId
      totalPower
      totalCapacity
      partyRarity
      heroes {
        tokenId
      }
      relics {
        tokenId
      }
      owner {
        id
      }
    }
  }
`;

// 從合約地址判斷 NFT 類型
function getNftTypeFromContract(contractAddress: string): string {
  const address = contractAddress.toLowerCase();
  
  // 根據當前合約地址判斷類型
  const contracts = {
    '0x929a4187a462314fcc480ff547019fa122a283f0': 'hero',     // 最新 Hero 合約
    '0x1067295025d21f59c8acb5e777e42f3866a6d2ff': 'relic',    // 最新 Relic 合約
    '0xe0272e1d76de1f789ce0996f3226bcf54a8c7735': 'party',    // 最新 Party 合約
    '0x7abea5b90528a19580a0a2a83e4cf9ad4871880f': 'vip',      // 最新 VIP 合約
  };
  
  return contracts[address] || 'unknown';
}

// 從 The Graph 獲取 NFT 數據
async function fetchNftDataFromGraph(contractAddress: string, tokenId: string) {
  const nftType = getNftTypeFromContract(contractAddress);
  const id = `${contractAddress.toLowerCase()}-${tokenId}`;
  
  const response = await fetch(THE_GRAPH_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: GET_NFT_DATA_QUERY,
      variables: { id, type: nftType }
    })
  });
  
  const { data } = await response.json();
  const nftData = data[nftType];
  
  if (!nftData) {
    throw new Error(`NFT not found: ${contractAddress} #${tokenId}`);
  }
  
  // 格式化數據以匹配我們的 NFT 類型
  return formatNftData(nftData, nftType, contractAddress);
}

// 格式化 NFT 數據
function formatNftData(rawData: any, type: string, contractAddress: string): any {
  const baseData = {
    id: BigInt(rawData.tokenId),
    contractAddress,
    type,
    name: `${type.toUpperCase()} #${rawData.tokenId}`,
    attributes: []
  };
  
  switch (type) {
    case 'hero':
      return {
        ...baseData,
        power: Number(rawData.power),
        rarity: Number(rawData.rarity)
      };
      
    case 'relic':
      return {
        ...baseData,
        capacity: Number(rawData.capacity),
        rarity: Number(rawData.rarity)
      };
      
    case 'party':
      return {
        ...baseData,
        totalPower: BigInt(rawData.totalPower),
        totalCapacity: BigInt(rawData.totalCapacity),
        partyRarity: Number(rawData.partyRarity),
        heroIds: rawData.heroes.map((h: any) => BigInt(h.tokenId)),
        relicIds: rawData.relics.map((r: any) => BigInt(r.tokenId))
      };
      
    case 'vip':
      // VIP 可能需要額外查詢質押數據
      return {
        ...baseData,
        level: 1, // 需要從合約讀取
        stakedAmount: BigInt(0) // 需要從合約讀取
      };
      
    default:
      return baseData;
  }
}

// 生成包含動態 SVG 的 Metadata
export async function generateMetadataWithGraph(
  contractAddress: string, 
  tokenId: string
): Promise<any> {
  try {
    // 1. 從 The Graph 獲取鏈上數據
    const nftData = await fetchNftDataFromGraph(contractAddress, tokenId);
    
    // 2. 生成 SVG
    let svg: string;
    switch (nftData.type) {
      case 'hero':
        svg = generateHeroSVG(nftData);
        break;
      case 'relic':
        svg = generateRelicSVG(nftData);
        break;
      case 'party':
        svg = generatePartySVG(nftData);
        break;
      case 'vip':
        svg = generateVipSVG(nftData);
        break;
      default:
        throw new Error(`Unknown NFT type: ${nftData.type}`);
    }
    
    // 3. 生成完整的 metadata
    const metadata = {
      name: nftData.name,
      description: getDescription(nftData.type, nftData.rarity || 1),
      
      // 主圖片使用穩定的 PNG（確保所有市場兼容）
      image: `https://www.dungeondelvers.xyz/images/${nftData.type}/${nftData.type}-${nftData.rarity || 1}.png`,
      
      // 動態 SVG 作為動畫
      animation_url: `https://api.dungeondelvers.xyz/metadata/${contractAddress}/${tokenId}/svg`,
      
      // 可選：直接嵌入 SVG data
      // image_data: svgToDataURL(svg),
      
      // 屬性
      attributes: generateDynamicAttributes(nftData),
      
      // 額外的元數據
      external_url: `https://dungeondelvers.xyz/nft/${contractAddress}/${tokenId}`,
      background_color: "0f172a" // 深色背景
    };
    
    return metadata;
    
  } catch (error) {
    console.error('Failed to generate metadata:', error);
    
    // 降級到靜態 metadata
    return {
      name: `NFT #${tokenId}`,
      description: "Dungeon Delvers NFT",
      image: `https://www.dungeondelvers.xyz/images/placeholder.png`,
      attributes: []
    };
  }
}

// 生成動態屬性（基於實時鏈上數據）
function generateDynamicAttributes(nftData: any): any[] {
  const attributes = [];
  
  // 通用屬性
  if (nftData.rarity) {
    attributes.push({
      trait_type: 'Rarity',
      value: nftData.rarity,
      display_type: 'number'
    });
    
    attributes.push({
      trait_type: 'Rarity Name',
      value: ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'][nftData.rarity - 1] || 'Common'
    });
  }
  
  // 類型特定屬性
  switch (nftData.type) {
    case 'hero':
      attributes.push({
        trait_type: 'Power',
        value: nftData.power,
        display_type: 'number',
        max_value: 255
      });
      break;
      
    case 'relic':
      attributes.push({
        trait_type: 'Capacity',
        value: nftData.capacity,
        display_type: 'number',
        max_value: 5
      });
      break;
      
    case 'party':
      attributes.push(
        {
          trait_type: 'Total Power',
          value: Number(nftData.totalPower),
          display_type: 'number'
        },
        {
          trait_type: 'Total Capacity',
          value: Number(nftData.totalCapacity),
          display_type: 'number'
        },
        {
          trait_type: 'Party Rarity',
          value: nftData.partyRarity
        },
        {
          trait_type: 'Hero Count',
          value: nftData.heroIds?.length || 0
        },
        {
          trait_type: 'Relic Count',
          value: nftData.relicIds?.length || 0
        }
      );
      break;
  }
  
  // 添加時間戳（顯示數據新鮮度）
  attributes.push({
    trait_type: 'Last Updated',
    value: new Date().toISOString(),
    display_type: 'date'
  });
  
  return attributes;
}

function getDescription(type: string, rarity: number): string {
  const rarityNames = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'];
  const descriptions = {
    hero: `A ${rarityNames[rarity - 1] || 'Common'} hero of Dungeon Delvers. This brave warrior is ready to explore the darkest depths and face unimaginable dangers.`,
    relic: `An ancient ${rarityNames[rarity - 1] || 'Common'} relic discovered in the depths. Its mystical powers can turn the tide of any expedition.`,
    party: `A carefully assembled party of adventurers. Together, they are stronger than the sum of their parts.`,
    vip: `An exclusive VIP membership card that grants special privileges and benefits in the Dungeon Delvers ecosystem.`
  };
  return descriptions[type] || 'A unique NFT from Dungeon Delvers.';
}