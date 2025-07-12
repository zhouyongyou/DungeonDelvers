export const getRarityChineseName = (rarity: number): string => {
  switch (rarity) {
    case 1:
      return '普通';
    case 2:
      return '不凡';
    case 3:
      return '稀有';
    case 4:
      return '史詩';
    case 5:
      return '傳奇';
    default:
      return '未知';
  }
};

export const getRarityColor = (rarity: number): string => {
  switch (rarity) {
    case 1:
      return 'text-gray-400';
    case 2:
      return 'text-green-400';
    case 3:
      return 'text-blue-400';
    case 4:
      return 'text-purple-400';
    case 5:
      return 'text-yellow-400';
    default:
      return 'text-gray-400';
  }
};

export const getRarityBgColor = (rarity: number): string => {
  switch (rarity) {
    case 1:
      return 'bg-gray-400/20';
    case 2:
      return 'bg-green-400/20';
    case 3:
      return 'bg-blue-400/20';
    case 4:
      return 'bg-purple-400/20';
    case 5:
      return 'bg-yellow-400/20';
    default:
      return 'bg-gray-400/20';
  }
}; 