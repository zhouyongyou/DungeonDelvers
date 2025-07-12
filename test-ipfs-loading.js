// test-ipfs-loading.js
// IPFS 載入測試腳本

const testHash = 'bafybeiagvaba3iswugci4e45tnucrerh32retgukatdx3v6p6wpupkwphm';
const testPath = `${testHash}/1`;

const gateways = [
    'https://ipfs.io/ipfs/',
    'https://gateway.pinata.cloud/ipfs/',
    'https://cloudflare-ipfs.com/ipfs/',
    'https://ipfs.infura.io/ipfs/',
    'https://gateway.ipfs.io/ipfs/',
    'https://ipfs.fleek.co/ipfs/',
    'https://cf-ipfs.com/ipfs/',
    'https://4everland.io/ipfs/',
    'https://w3s.link/ipfs/',
    'https://nftstorage.link/ipfs/'
];

async function testGateway(gateway, path) {
    const url = `${gateway}${path}`;
    const startTime = Date.now();
    
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'DungeonDelvers/1.0'
            }
        });
        
        const loadTime = Date.now() - startTime;
        
        if (response.ok) {
            const data = await response.json();
            console.log(`✅ ${gateway}${path} - 成功 (${loadTime}ms)`);
            console.log(`   名稱: ${data.name}`);
            console.log(`   圖片: ${data.image}`);
            return { success: true, data, loadTime };
        } else {
            console.log(`❌ ${gateway}${path} - HTTP ${response.status} (${loadTime}ms)`);
            return { success: false, error: `HTTP ${response.status}`, loadTime };
        }
    } catch (error) {
        const loadTime = Date.now() - startTime;
        console.log(`❌ ${gateway}${path} - 錯誤: ${error.message} (${loadTime}ms)`);
        return { success: false, error: error.message, loadTime };
    }
}

async function runTests() {
    console.log('🔍 開始 IPFS 載入測試...\n');
    
    // 測試根目錄
    console.log('📁 測試根目錄:');
    const rootResults = await Promise.allSettled(
        gateways.map(gateway => testGateway(gateway, testHash))
    );
    
    console.log('\n📄 測試子路徑:');
    const pathResults = await Promise.allSettled(
        gateways.map(gateway => testGateway(gateway, testPath))
    );
    
    // 統計結果
    const rootSuccess = rootResults.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const pathSuccess = pathResults.filter(r => r.status === 'fulfilled' && r.value.success).length;
    
    console.log('\n📊 測試結果統計:');
    console.log(`根目錄成功: ${rootSuccess}/${gateways.length}`);
    console.log(`子路徑成功: ${pathSuccess}/${gateways.length}`);
    
    if (pathSuccess === 0) {
        console.log('\n⚠️  所有子路徑都失敗，建議檢查:');
        console.log('1. IPFS Hash 是否正確');
        console.log('2. 文件是否已上傳到 IPFS');
        console.log('3. 路徑結構是否正確');
    }
}

// 運行測試
runTests().catch(console.error); 