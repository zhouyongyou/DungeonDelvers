// 測試連接器配置
import { wagmiSimpleConfig } from '../wagmi-simple';

export const testConnectors = () => {
  console.log('🔍 測試 Wagmi 連接器配置...');
  
  const config = wagmiSimpleConfig;
  
  // 檢查配置是否存在
  if (!config) {
    console.error('❌ Wagmi 配置不存在');
    return;
  }
  
  // 檢查連接器
  const connectors = config.connectors;
  
  if (!connectors || connectors.length === 0) {
    console.error('❌ 沒有配置任何連接器');
    return;
  }
  
  console.log(`✅ 找到 ${connectors.length} 個連接器:`);
  
  connectors.forEach((connector, index) => {
    console.log(`  ${index + 1}. ${connector.name} (ID: ${connector.id})`);
    
    // 檢查連接器的必要方法
    const requiredMethods = ['connect', 'disconnect', 'getAccount', 'getChainId'];
    const missingMethods = requiredMethods.filter(method => typeof (connector as any)[method] !== 'function');
    
    if (missingMethods.length > 0) {
      console.warn(`    ⚠️ 缺少方法: ${missingMethods.join(', ')}`);
    } else {
      console.log(`    ✅ 所有必要方法都存在`);
    }
  });
  
  // 檢查 transport
  const transport = (config as any)._internal?.transports?.[56];
  if (transport) {
    console.log('✅ BSC 主網 transport 已配置');
  } else {
    console.error('❌ BSC 主網 transport 未配置');
  }
};

// 在開發環境下自動運行測試
if (import.meta.env.DEV) {
  setTimeout(() => {
    testConnectors();
  }, 2000);
}