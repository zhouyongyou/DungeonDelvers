// 測試環境變數更新是否正確
import fs from 'fs';
import path from 'path';

function checkEnvFile(filePath, description) {
    console.log(`\n🔍 檢查 ${description}:`);
    console.log(`📁 路徑: ${filePath}`);
    
    if (!fs.existsSync(filePath)) {
        console.log('❌ 文件不存在');
        return false;
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    
    // 檢查是否已更新到 v3.0.6
    const hasV306 = content.includes('v3.0.6');
    const hasOldV305 = content.includes('v3.0.5');
    
    if (hasV306) {
        console.log('✅ 已更新到 v3.0.6');
        
        // 顯示相關行
        const lines = content.split('\n');
        lines.forEach((line, index) => {
            if (line.includes('v3.0.6')) {
                console.log(`   第 ${index + 1} 行: ${line.trim()}`);
            }
        });
        
        if (hasOldV305) {
            console.log('⚠️  仍有 v3.0.5 殘留');
            lines.forEach((line, index) => {
                if (line.includes('v3.0.5')) {
                    console.log(`   舊版本第 ${index + 1} 行: ${line.trim()}`);
                }
            });
        }
        
        return true;
    } else {
        console.log('❌ 尚未更新到 v3.0.6');
        if (hasOldV305) {
            console.log('   仍使用 v3.0.5');
        }
        return false;
    }
}

async function testSubgraphConnection() {
    console.log('\n🌐 測試子圖連接:');
    
    const { default: axios } = await import('axios');
    const url = 'https://api.studio.thegraph.com/query/115633/dungeon-delvers/v3.0.6';
    
    return axios.post(url, {
        query: `
            query {
                _meta {
                    block {
                        number
                    }
                }
                parties(first: 1) {
                    id
                    tokenId
                }
            }
        `
    }).then(response => {
        if (response.data && response.data.data) {
            console.log('✅ v3.0.6 子圖連接成功');
            console.log(`   當前區塊: ${response.data.data._meta.block.number}`);
            console.log(`   Party 數量: ${response.data.data.parties.length}`);
            return true;
        } else {
            console.log('❌ 子圖響應異常');
            return false;
        }
    }).catch(error => {
        console.log('❌ 子圖連接失敗:', error.message);
        return false;
    });
}

async function main() {
    console.log('🚀 檢查環境變數更新狀態\n');
    console.log('=' * 60);
    
    // 檢查前端 .env
    const frontendEnv = '/Users/sotadic/Documents/GitHub/DungeonDelvers/.env';
    const frontendOk = checkEnvFile(frontendEnv, '前端環境變數');
    
    // 檢查後端 .env
    const backendEnv = '/Users/sotadic/Documents/dungeon-delvers-metadata-server/.env';
    const backendOk = checkEnvFile(backendEnv, '後端環境變數');
    
    // 測試子圖連接
    const connectionOk = await testSubgraphConnection();
    
    console.log('\n' + '=' * 60);
    console.log('📊 更新狀態總結:');
    console.log(`   前端 ENV: ${frontendOk ? '✅' : '❌'}`);
    console.log(`   後端 ENV: ${backendOk ? '✅' : '❌'}`);
    console.log(`   子圖連接: ${connectionOk ? '✅' : '❌'}`);
    
    if (frontendOk && backendOk && connectionOk) {
        console.log('\n🎉 所有更新完成！可以開始使用 v3.0.6 子圖');
        console.log('\n📋 下一步操作:');
        console.log('   1. 更新 Vercel 環境變數');
        console.log('   2. 更新 Render 環境變數');
        console.log('   3. 重新部署前端和後端');
    } else {
        console.log('\n⚠️  發現問題，請檢查上述錯誤');
    }
}

main().catch(console.error);