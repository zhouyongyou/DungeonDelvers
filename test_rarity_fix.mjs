// test_rarity_fix.mjs
// 測試稀有度修復

import { getRarityNumber, getRarityChineseName, getRarityColor, convertRarity } from './src/utils/rarityConverter.ts';

console.log('🧪 測試稀有度轉換工具...\n');

// 測試各種輸入格式
const testCases = [
  'Common',
  'Uncommon', 
  'Rare',
  'Epic',
  'Legendary',
  'Mythic',
  'common',
  'UNCOMMON',
  'rare',
  'epic',
  'legendary',
  'mythic',
  1,
  2,
  3,
  4,
  5,
  6,
  '1',
  '2',
  '3',
  '4',
  '5',
  '6'
];

console.log('📋 測試結果:');
console.log('輸入值\t\t數字\t中文名稱\t\t顏色');
console.log('─'.repeat(60));

testCases.forEach(input => {
  try {
    const result = convertRarity(input);
    console.log(`${String(input).padEnd(12)}\t${result.number}\t${result.chineseName.padEnd(8)}\t${result.color}`);
  } catch (error) {
    console.log(`${String(input).padEnd(12)}\t❌\t錯誤: ${error.message}`);
  }
});

console.log('\n🎯 測試 metadata 中的稀有度值...');

// 測試實際的 metadata 值
const metadataRarities = [
  'Common',
  'Uncommon', 
  'Rare',
  'Epic',
  'Legendary'
];

metadataRarities.forEach(rarity => {
  const number = getRarityNumber(rarity);
  const chineseName = getRarityChineseName(rarity);
  const color = getRarityColor(rarity);
  
  console.log(`"${rarity}" -> 數字: ${number}, 中文: ${chineseName}, 顏色: ${color}`);
});

console.log('\n✅ 稀有度轉換測試完成！'); 