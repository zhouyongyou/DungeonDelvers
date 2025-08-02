// 手機版優化組件使用示例
import React from 'react';
import { MobileAddress, MobileAddressWithPreview } from '../components/mobile/MobileAddress';
import { MobileDataCard, MobileDataCardGroup } from '../components/mobile/MobileDataCard';
import { MobileActionMenu, MobileActionBar } from '../components/mobile/MobileActionMenu';
import { MobileStatsCard, MobileStatsGroup } from '../components/mobile/MobileStatsCard';
import { MobileTabs, MobileBottomTabs } from '../components/mobile/MobileTabs';
import { useMobileOptimization, useBreakpoint } from '../hooks/useMobileOptimization';
import { Icons } from '../components/ui/icons';

export const MobileOptimizationExample: React.FC = () => {
  const { isMobile, isTouch } = useMobileOptimization();
  const { isMobileBreakpoint } = useBreakpoint();
  
  // 示例數據
  const exampleAddress = '0x1234567890abcdef1234567890abcdef12345678';
  
  const exampleDataItems = [
    { label: '總戰力', value: '15,238', highlight: true },
    { label: '英雄數量', value: '12' },
    { label: '聖物數量', value: '8' },
    { label: '隊伍數量', value: '3' },
  ];
  
  const exampleActions = [
    { id: 'edit', label: '編輯', icon: Icons.Edit, onClick: () => console.log('編輯') },
    { id: 'delete', label: '刪除', icon: Icons.Trash, onClick: () => console.log('刪除'), variant: 'danger' as const },
    { id: 'share', label: '分享', icon: Icons.Share, onClick: () => console.log('分享') },
  ];
  
  const exampleStats = [
    { label: '日收益', value: '1,234 SOUL', trend: { value: '+12.5%', direction: 'up' as const } },
    { label: '週收益', value: '8,567 SOUL', trend: { value: '+5.2%', direction: 'up' as const } },
    { label: '總資產', value: '45,678 SOUL', trend: { value: '0%', direction: 'stable' as const } },
    { label: '排名', value: '#156', trend: { value: '-3', direction: 'down' as const } },
  ];
  
  const exampleTabs = [
    { id: 'overview', label: '總覽', icon: Icons.Home },
    { id: 'heroes', label: '英雄', icon: Icons.User, badge: 12 },
    { id: 'relics', label: '聖物', icon: Icons.Shield, badge: 8 },
    { id: 'parties', label: '隊伍', icon: Icons.Users, badge: 3 },
    { id: 'market', label: '市場', icon: Icons.ShoppingCart },
  ];
  
  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 space-y-6">
      <h1 className="text-2xl font-bold mb-4">手機版優化組件示例</h1>
      
      {/* 設備信息 */}
      <div className="bg-gray-800 rounded-lg p-4">
        <h2 className="text-lg font-semibold mb-2">當前設備信息</h2>
        <p className="text-sm text-gray-400">
          是否為手機: {isMobile ? '是' : '否'} | 
          支援觸控: {isTouch ? '是' : '否'} | 
          手機斷點: {isMobileBreakpoint ? '是' : '否'}
        </p>
      </div>
      
      {/* 地址顯示組件 */}
      <section>
        <h2 className="text-lg font-semibold mb-3">地址顯示組件</h2>
        
        <div className="space-y-3">
          <div className="bg-gray-800 rounded-lg p-4">
            <p className="text-sm text-gray-400 mb-2">基本地址顯示（帶複製）</p>
            <MobileAddress address={exampleAddress} />
          </div>
          
          <div className="bg-gray-800 rounded-lg p-4">
            <p className="text-sm text-gray-400 mb-2">長按顯示完整地址</p>
            <MobileAddressWithPreview address={exampleAddress} />
          </div>
        </div>
      </section>
      
      {/* 數據卡片組件 */}
      <section>
        <h2 className="text-lg font-semibold mb-3">數據卡片組件</h2>
        
        <MobileDataCard
          title="玩家統計"
          data={exampleDataItems}
          actions={
            <button className="w-full py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors">
              查看詳情
            </button>
          }
        />
        
        <h3 className="text-base font-medium mt-4 mb-2">橫向滾動卡片組</h3>
        <MobileDataCardGroup
          cards={[
            { id: 1, title: '英雄 #1', data: exampleDataItems },
            { id: 2, title: '英雄 #2', data: exampleDataItems },
            { id: 3, title: '英雄 #3', data: exampleDataItems },
          ]}
        />
      </section>
      
      {/* 操作選單組件 */}
      <section>
        <h2 className="text-lg font-semibold mb-3">操作選單組件</h2>
        
        <div className="bg-gray-800 rounded-lg p-4">
          <p className="text-sm text-gray-400 mb-2">多個操作合併為選單</p>
          <div className="flex justify-end">
            <MobileActionMenu actions={exampleActions} />
          </div>
        </div>
      </section>
      
      {/* 統計卡片組件 */}
      <section>
        <h2 className="text-lg font-semibold mb-3">統計卡片組件</h2>
        
        <MobileStatsCard
          title="收益統計"
          stats={exampleStats}
        />
        
        <h3 className="text-base font-medium mt-4 mb-2">橫向滾動統計組</h3>
        <MobileStatsGroup
          cards={[
            { id: 'daily', title: '日統計', stats: exampleStats },
            { id: 'weekly', title: '週統計', stats: exampleStats },
            { id: 'monthly', title: '月統計', stats: exampleStats },
          ]}
        />
      </section>
      
      {/* 標籤導航組件 */}
      <section>
        <h2 className="text-lg font-semibold mb-3">標籤導航組件</h2>
        
        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-400 mb-2">預設樣式</p>
            <MobileTabs
              tabs={exampleTabs}
              activeTab="heroes"
              onTabChange={(id) => console.log('切換到:', id)}
            />
          </div>
          
          <div>
            <p className="text-sm text-gray-400 mb-2">藥丸樣式</p>
            <MobileTabs
              tabs={exampleTabs}
              activeTab="heroes"
              onTabChange={(id) => console.log('切換到:', id)}
              variant="pill"
            />
          </div>
          
          <div>
            <p className="text-sm text-gray-400 mb-2">下劃線樣式</p>
            <MobileTabs
              tabs={exampleTabs}
              activeTab="heroes"
              onTabChange={(id) => console.log('切換到:', id)}
              variant="underline"
            />
          </div>
        </div>
      </section>
      
      {/* 底部操作欄示例 */}
      <div className="h-20" /> {/* 空間預留 */}
      <MobileActionBar
        primaryAction={{
          id: 'submit',
          label: '確認交易',
          icon: Icons.Check,
          onClick: () => console.log('確認交易'),
        }}
        secondaryActions={exampleActions}
      />
      
      {/* 底部標籤欄示例（註釋掉避免與操作欄衝突） */}
      {/* <MobileBottomTabs
        tabs={exampleTabs}
        activeTab="heroes"
        onTabChange={(id) => console.log('切換到:', id)}
      /> */}
    </div>
  );
};

export default MobileOptimizationExample;