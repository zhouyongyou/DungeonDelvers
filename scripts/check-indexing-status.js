#!/usr/bin/env node

// 檢查子圖索引狀態的詳細腳本

const SUBGRAPH_ID = 'Hmwr7XYgzVzsUb9dw95gSGJ1Vof6qYypuvCxynzinCjs';
const GRAPH_NETWORK_URL = 'https://gateway.thegraph.com/network';
const STUDIO_URL = 'https://api.studio.thegraph.com/query/115633/dungeon-delvers/v3.1.2';
const DECENTRALIZED_URL = `https://gateway.thegraph.com/api/f6c1aba78203cfdf0cc732eafe677bdd/subgraphs/id/${SUBGRAPH_ID}`;

async function queryGraph(url, query) {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    });
    
    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error('查詢失敗:', error.message);
    return null;
  }
}

// 查詢網絡狀態
const networkQuery = `{
  indexers(first: 10, where: { allocations_: { subgraphDeployment: "${SUBGRAPH_ID}" } }) {
    id
    defaultDisplayName
    stakedTokens
    allocatedTokens
    allocations(where: { subgraphDeployment: "${SUBGRAPH_ID}" }) {
      id
      allocatedTokens
      createdAt
      status
    }
  }
  
  subgraphDeployments(where: { id: "${SUBGRAPH_ID}" }) {
    id
    versions {
      id
      version
      createdAt
    }
    indexerAllocations {
      id
      indexer {
        id
        defaultDisplayName
      }
      allocatedTokens
      createdAt
      status
    }
    signalledTokens
    stakedTokens
    indexingRewardAmount
    queryFeesAmount
  }
}`;

// 查詢同步進度
const syncQuery = `{
  indexingStatuses(subgraphs: ["${SUBGRAPH_ID}"]) {
    subgraph
    synced
    health
    node
    chains {
      network
      chainHeadBlock {
        number
      }
      earliestBlock {
        number
      }
      latestBlock {
        number
      }
    }
    fatalError {
      message
      block {
        number
        hash
      }
    }
    nonFatalErrors {
      message
      block {
        number
        hash
      }
    }
  }
}`;

async function checkIndexingStatus() {
  console.log('🔍 檢查 DungeonDelvers 子圖索引狀態\n');
  console.log(`Subgraph ID: ${SUBGRAPH_ID}`);
  console.log('='.repeat(80));
  
  // 1. 檢查 Studio 版本狀態
  console.log('\n📊 Studio 版本狀態');
  console.log('-'.repeat(80));
  
  const studioMeta = await queryGraph(STUDIO_URL, '{ _meta { block { number } hasIndexingErrors } }');
  if (studioMeta) {
    console.log('✅ Studio 版本運行正常');
    console.log(`   當前區塊: ${studioMeta._meta.block.number}`);
    console.log(`   索引錯誤: ${studioMeta._meta.hasIndexingErrors ? '有' : '無'}`);
  }
  
  // 2. 檢查去中心化網絡狀態
  console.log('\n📊 去中心化網絡狀態');
  console.log('-'.repeat(80));
  
  const networkStatus = await queryGraph(GRAPH_NETWORK_URL, networkQuery);
  if (networkStatus) {
    const deployment = networkStatus.subgraphDeployments?.[0];
    if (deployment) {
      console.log('✅ 子圖已在去中心化網絡註冊');
      console.log(`   信號量: ${deployment.signalledTokens || 0} GRT`);
      console.log(`   質押量: ${deployment.stakedTokens || 0} GRT`);
      console.log(`   查詢費用: ${deployment.queryFeesAmount || 0} GRT`);
      console.log(`   索引獎勵: ${deployment.indexingRewardAmount || 0} GRT`);
      
      const allocations = deployment.indexerAllocations || [];
      console.log(`\n   索引器數量: ${allocations.length}`);
      
      if (allocations.length > 0) {
        console.log('\n   活躍索引器:');
        allocations.forEach(alloc => {
          console.log(`     - ${alloc.indexer.defaultDisplayName || alloc.indexer.id}`);
          console.log(`       分配代幣: ${alloc.allocatedTokens} GRT`);
          console.log(`       狀態: ${alloc.status}`);
          console.log(`       創建時間: ${new Date(alloc.createdAt * 1000).toLocaleString()}`);
        });
      } else {
        console.log('   ⚠️  尚無索引器分配資源');
        console.log('   💡 需要更多信號（Signal）來吸引索引器');
      }
    } else {
      console.log('❌ 子圖尚未在去中心化網絡註冊或無法查詢');
    }
  }
  
  // 3. 檢查同步進度
  console.log('\n📊 索引同步進度');
  console.log('-'.repeat(80));
  
  const syncStatus = await queryGraph(DECENTRALIZED_URL, syncQuery);
  if (syncStatus && syncStatus.indexingStatuses) {
    const status = syncStatus.indexingStatuses[0];
    if (status) {
      console.log(`   同步狀態: ${status.synced ? '✅ 已同步' : '🔄 同步中'}`);
      console.log(`   健康狀態: ${status.health}`);
      console.log(`   節點: ${status.node || 'N/A'}`);
      
      if (status.chains && status.chains.length > 0) {
        const chain = status.chains[0];
        console.log(`\n   鏈: ${chain.network}`);
        console.log(`   鏈頭區塊: ${chain.chainHeadBlock?.number || 'N/A'}`);
        console.log(`   最早區塊: ${chain.earliestBlock?.number || 'N/A'}`);
        console.log(`   最新區塊: ${chain.latestBlock?.number || 'N/A'}`);
        
        if (chain.chainHeadBlock && chain.latestBlock) {
          const behind = chain.chainHeadBlock.number - chain.latestBlock.number;
          console.log(`   落後區塊: ${behind}`);
          
          if (behind > 1000) {
            console.log('   ⚠️  同步進度落後較多');
          } else if (behind > 100) {
            console.log('   🔄 正在追趕中');
          } else {
            console.log('   ✅ 接近實時');
          }
        }
      }
      
      if (status.fatalError) {
        console.log('\n   ❌ 致命錯誤:');
        console.log(`      ${status.fatalError.message}`);
        console.log(`      區塊: ${status.fatalError.block.number}`);
      }
      
      if (status.nonFatalErrors && status.nonFatalErrors.length > 0) {
        console.log('\n   ⚠️  非致命錯誤:');
        status.nonFatalErrors.forEach(err => {
          console.log(`      - ${err.message} (區塊: ${err.block.number})`);
        });
      }
    }
  } else {
    console.log('   無法獲取同步狀態（可能尚未開始索引）');
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('\n💡 建議：');
  console.log('1. 如果沒有索引器，考慮增加更多信號（Signal）');
  console.log('2. 信號量建議至少 10,000 GRT 以吸引索引器');
  console.log('3. 可以在 https://thegraph.com/explorer 查看更多詳情');
  console.log('4. 索引器通常需要幾小時到幾天來開始索引新子圖');
}

checkIndexingStatus().catch(console.error);