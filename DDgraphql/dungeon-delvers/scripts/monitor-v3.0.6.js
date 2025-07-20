const axios = require('axios');

const SUBGRAPH_URL = 'https://api.studio.thegraph.com/query/115633/dungeon-delvers/v3.0.6';

async function querySubgraph(query) {
    try {
        const response = await axios.post(SUBGRAPH_URL, {
            query: query
        });
        return response.data;
    } catch (error) {
        console.error('查詢失敗:', error.message);
        return null;
    }
}

async function monitorV306() {
    console.log('🔍 監控子圖 v3.0.6 同步狀態\n');
    console.log('📡 端點:', SUBGRAPH_URL);
    console.log('─'.repeat(60));
    
    // 查詢元數據和統計
    const metaQuery = `
        query {
            _meta {
                block {
                    number
                    timestamp
                }
                hasIndexingErrors
            }
            parties(first: 5, orderBy: tokenId, orderDirection: desc) {
                id
                tokenId
                owner {
                    id
                }
                totalPower
                totalCapacity
                partyRarity
                createdAt
                heroIds
            }
            heros(first: 3, orderBy: tokenId, orderDirection: desc) {
                id
                tokenId
                owner {
                    id
                }
                rarity
            }
            relics(first: 3, orderBy: tokenId, orderDirection: desc) {
                id
                tokenId
                owner {
                    id
                }
                rarity
            }
        }
    `;
    
    const result = await querySubgraph(metaQuery);
    
    if (!result || result.errors) {
        console.log('❌ 查詢失敗');
        if (result?.errors) {
            result.errors.forEach(error => {
                console.log(`   錯誤: ${error.message}`);
            });
        }
        return;
    }
    
    const { _meta, parties, heros, relics } = result.data;
    
    // 顯示同步狀態
    console.log('\n📊 同步狀態:');
    console.log(`   當前區塊: ${_meta.block.number.toLocaleString()}`);
    console.log(`   區塊時間: ${new Date(_meta.block.timestamp * 1000).toLocaleString()}`);
    console.log(`   索引錯誤: ${_meta.hasIndexingErrors ? '❌ 有錯誤' : '✅ 無錯誤'}`);
    
    // 顯示 NFT 統計
    console.log('\n📈 NFT 統計:');
    console.log(`   Party NFTs: ${parties.length} 個`);
    console.log(`   Hero NFTs: ${heros.length} 個 (最新 3 個)`);
    console.log(`   Relic NFTs: ${relics.length} 個 (最新 3 個)`);
    
    // 顯示 Party 詳情
    if (parties.length > 0) {
        console.log('\n🎉 Party NFTs (最新 5 個):');
        parties.forEach((party, index) => {
            console.log(`   ${index + 1}. Party #${party.tokenId}`);
            console.log(`      擁有者: ${party.owner.id}`);
            console.log(`      戰力: ${party.totalPower}`);
            console.log(`      容量: ${party.totalCapacity}`);
            console.log(`      稀有度: ${party.partyRarity}`);
            console.log(`      英雄數量: ${party.heroIds.length}`);
            console.log(`      創建時間: ${new Date(party.createdAt * 1000).toLocaleString()}`);
            console.log('');
        });
    } else {
        console.log('\n⚠️  尚未找到任何 Party NFTs');
        console.log('   這可能是因為：');
        console.log('   1. 子圖還在同步中');
        console.log('   2. 還沒有任何 Party 被創建');
        console.log('   3. 事件索引存在問題');
    }
    
    // 顯示最新的其他 NFTs
    if (heros.length > 0) {
        console.log('\n🦸 最新 Hero NFTs:');
        heros.forEach((hero, index) => {
            console.log(`   ${index + 1}. Hero #${hero.tokenId} (稀有度: ${hero.rarity})`);
        });
    }
    
    if (relics.length > 0) {
        console.log('\n🏺 最新 Relic NFTs:');
        relics.forEach((relic, index) => {
            console.log(`   ${index + 1}. Relic #${relic.tokenId} (稀有度: ${relic.rarity})`);
        });
    }
    
    // 計算區塊延遲
    const currentTime = Math.floor(Date.now() / 1000);
    const blockDelay = currentTime - _meta.block.timestamp;
    const delayMinutes = Math.floor(blockDelay / 60);
    
    console.log('\n⏱️  同步延遲:');
    if (delayMinutes < 5) {
        console.log(`   ✅ ${delayMinutes} 分鐘 (良好)`);
    } else if (delayMinutes < 15) {
        console.log(`   ⚠️  ${delayMinutes} 分鐘 (可接受)`);
    } else {
        console.log(`   ❌ ${delayMinutes} 分鐘 (較慢)`);
    }
    
    console.log('\n' + '─'.repeat(60));
    console.log(`檢查時間: ${new Date().toLocaleString()}`);
    
    // 如果有 Party 但數量很少，建議等待
    if (parties.length > 0 && parties.length < 3) {
        console.log('\n💡 建議: 子圖正在同步中，建議 10-15 分鐘後再次檢查');
    }
}

async function runContinuousMonitoring() {
    console.log('🚀 開始連續監控模式 (每 2 分鐘檢查一次)');
    console.log('按 Ctrl+C 停止監控\n');
    
    await monitorV306();
    
    setInterval(async () => {
        console.log('\n' + '='.repeat(80));
        await monitorV306();
    }, 2 * 60 * 1000); // 每 2 分鐘
}

// 檢查命令行參數
const args = process.argv.slice(2);
if (args.includes('--continuous') || args.includes('-c')) {
    runContinuousMonitoring();
} else {
    monitorV306();
}