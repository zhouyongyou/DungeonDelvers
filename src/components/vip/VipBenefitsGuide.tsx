// VipBenefitsGuide.tsx - VIP 會員全面好處說明組件
import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { useAdminAccess } from '../../hooks/useAdminAccess';

interface VipBenefitsGuideProps {
  isOpen: boolean;
  onClose: () => void;
}

const benefitCategories = [
  {
    id: 'overview',
    title: 'VIP 系統總覽',
    icon: null,
    content: (
      <div className="space-y-4">
        <div className="text-center mb-6">
          <h3 className="text-2xl font-bold bg-gradient-to-r from-yellow-300 to-orange-300 bg-clip-text text-transparent">
            DungeonDelvers VIP 會員系統
          </h3>
        </div>
        
        <div className="bg-gradient-to-br from-purple-900/30 to-indigo-900/30 border border-purple-500/30 rounded-lg p-6">
          <h4 className="text-lg font-semibold text-purple-300 mb-4">核心機制</h4>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <div>
                <strong className="text-white">質押驅動：</strong>
                <span className="text-gray-300">質押 SoulShard 代幣自動獲得 VIP 等級</span>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div>
                <strong className="text-white">等級計算：</strong>
                <span className="text-gray-300">VIP 等級 = √(質押USD價值 ÷ 100)，平滑成長無上限</span>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div>
                <strong className="text-white">即時生效：</strong>
                <span className="text-gray-300">質押後立即享受所有 VIP 特權，無需等待</span>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div>
                <strong className="text-white">NFT 身份：</strong>
                <span className="text-gray-300">獲得獨特的 VIP NFT 卡片作為身份象徵</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4">
          <p className="text-sm text-yellow-200 text-center">
            <strong>質押越多，特權越多！</strong>所有好處均基於您的實時質押價值自動調整。
          </p>
        </div>
      </div>
    )
  },
  {
    id: 'vault',
    title: '金庫稅率減免',
    icon: null,
    content: (
      <div className="space-y-4">
        <div className="text-center">
          <h3 className="text-xl font-bold text-green-300">玩家金庫稅率減免</h3>
        </div>

        <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4">
          <h4 className="font-semibold text-green-300 mb-3">減免機制</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-gray-300">基礎稅率減免</span>
              <span className="font-bold text-green-400">每 VIP 等級 -0.5%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-300">VIP 1 (質押$100+)</span>
              <span className="font-bold text-green-400">-0.5% 稅率</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-300">VIP 5 (質押$2500+)</span>
              <span className="font-bold text-green-400">-2.5% 稅率</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-300">VIP 10 (質押$10000+)</span>
              <span className="font-bold text-green-400">-5% 稅率</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-300">VIP 20 (質押$40000+)</span>
              <span className="font-bold text-green-400">-10% 稅率</span>
            </div>
          </div>
        </div>

        <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-4">
          <h4 className="font-semibold text-purple-300 mb-2">適用範圍</h4>
          <ul className="text-sm space-y-1 text-purple-200">
            <li>• 從玩家金庫提取 SoulShard 代幣時的手續費</li>
            <li>• 提取金額越大，節省的手續費越可觀</li>
            <li>• 結合玩家等級和時間衰減，實現多重減免</li>
            <li>• 所有減免累加計算，最大可完全免稅</li>
          </ul>
        </div>
      </div>
    )
  },
  {
    id: 'altar',
    title: '升星祭壇加成',
    icon: null,
    content: (
      <div className="space-y-4">
        <div className="text-center">
          <h3 className="text-xl font-bold text-purple-300">升星祭壇加成</h3>
        </div>

        <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-4">
          <h4 className="font-semibold text-purple-300 mb-3">加成機制</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-gray-300">加成類型</span>
              <span className="font-bold text-purple-400">普通成功率直接加成</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-300">大成功率</span>
              <span className="text-gray-400">不受影響（保持遊戲平衡）</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-300">最大加成</span>
              <span className="font-bold text-yellow-400">20%（管理員可調整）</span>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-indigo-900/30 to-purple-900/30 border border-indigo-500/30 rounded-lg p-4">
          <h4 className="font-semibold text-indigo-300 mb-3">實際效果示例</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-800/50 p-3 rounded">
              <div className="text-sm font-semibold text-green-300 mb-2">1★ → 2★ 升星</div>
              <div className="text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-400">基礎成功率</span>
                  <span className="text-white">77%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-purple-400">VIP 加成</span>
                  <span className="text-yellow-400">+5%</span>
                </div>
                <div className="flex justify-between border-t border-gray-600 pt-1">
                  <span className="text-green-300 font-semibold">最終成功率</span>
                  <span className="text-green-300 font-bold">82%</span>
                </div>
              </div>
            </div>
            <div className="bg-gray-800/50 p-3 rounded">
              <div className="text-sm font-semibold text-orange-300 mb-2">3★ → 4★ 升星</div>
              <div className="text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-400">基礎成功率</span>
                  <span className="text-white">41%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-purple-400">VIP 加成</span>
                  <span className="text-yellow-400">+10%</span>
                </div>
                <div className="flex justify-between border-t border-gray-600 pt-1">
                  <span className="text-green-300 font-semibold">最終成功率</span>
                  <span className="text-green-300 font-bold">51%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4">
          <h4 className="font-semibold text-yellow-300 mb-2">加成機制</h4>
          <p className="text-yellow-200 text-sm">
            VIP 等級自動提升升星成功率，等級越高加成越多。系統會根據您的質押等級實時計算並應用加成。
          </p>
        </div>
      </div>
    )
  },
  {
    id: 'dungeon',
    title: '地城探索加成',
    icon: null,
    content: (
      <div className="space-y-4">
        <div className="text-center">
          <h3 className="text-xl font-bold text-orange-300">地城探索加成</h3>
        </div>

        <div className="bg-orange-900/20 border border-orange-500/30 rounded-lg p-4">
          <h4 className="font-semibold text-orange-300 mb-3">探索加成</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-gray-300">加成類型</span>
              <span className="font-bold text-orange-400">基礎成功率直接加成</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-300">加成公式</span>
              <span className="font-bold text-orange-400">VIP 等級 = 成功率加成%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-300">適用範圍</span>
              <span className="text-orange-400">所有地城（1-10）</span>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-red-900/30 to-orange-900/30 border border-red-500/30 rounded-lg p-4">
          <h4 className="font-semibold text-red-300 mb-3">地城成功率提升示例</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="bg-gray-800/50 p-3 rounded">
                <div className="text-sm font-semibold text-blue-300 mb-2">新手礦洞 (地城1)</div>
                <div className="text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-400">基礎成功率</span>
                    <span className="text-white">89%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-orange-400">VIP 5 加成</span>
                    <span className="text-yellow-400">+5%</span>
                  </div>
                  <div className="flex justify-between border-t border-gray-600 pt-1">
                    <span className="text-green-300 font-semibold">最終成功率</span>
                    <span className="text-green-300 font-bold">94%</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-800/50 p-3 rounded">
                <div className="text-sm font-semibold text-purple-300 mb-2">蜘蛛巢穴 (地城4)</div>
                <div className="text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-400">基礎成功率</span>
                    <span className="text-white">74%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-orange-400">VIP 8 加成</span>
                    <span className="text-yellow-400">+8%</span>
                  </div>
                  <div className="flex justify-between border-t border-gray-600 pt-1">
                    <span className="text-green-300 font-semibold">最終成功率</span>
                    <span className="text-green-300 font-bold">82%</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="bg-gray-800/50 p-3 rounded">
                <div className="text-sm font-semibold text-red-300 mb-2">巨龍之巔 (地城9)</div>
                <div className="text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-400">基礎成功率</span>
                    <span className="text-white">49%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-orange-400">VIP 12 加成</span>
                    <span className="text-yellow-400">+12%</span>
                  </div>
                  <div className="flex justify-between border-t border-gray-600 pt-1">
                    <span className="text-green-300 font-semibold">最終成功率</span>
                    <span className="text-green-300 font-bold">61%</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-800/50 p-3 rounded">
                <div className="text-sm font-semibold text-gray-300 mb-2">混沌深淵 (地城10)</div>
                <div className="text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-400">基礎成功率</span>
                    <span className="text-white">44%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-orange-400">VIP 15 加成</span>
                    <span className="text-yellow-400">+15%</span>
                  </div>
                  <div className="flex justify-between border-t border-gray-600 pt-1">
                    <span className="text-green-300 font-semibold">最終成功率</span>
                    <span className="text-green-300 font-bold">59%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
          <h4 className="font-semibold text-blue-300 mb-2">加成機制</h4>
          <p className="text-blue-200 text-sm">
            VIP 等級直接提升地城探索的基礎成功率，讓您在最危險的地城中也能更有把握完成挑戰！
          </p>
        </div>
      </div>
    )
  },
  {
    id: 'nft',
    title: 'VIP NFT 身份象徵',
    icon: null,
    content: (
      <div className="space-y-4">
        <div className="text-center">
          <h3 className="text-xl font-bold text-pink-300">VIP NFT 身份象徵</h3>
        </div>

        <div className="bg-pink-900/20 border border-pink-500/30 rounded-lg p-4">
          <h4 className="font-semibold text-pink-300 mb-3">NFT 特色</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-gray-300">鑄造機制</span>
              <span className="text-pink-400">質押時自動鑄造</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-300">轉移限制</span>
              <span className="text-pink-400">不可轉移（綁定身份）</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-300">銷毀條件</span>
              <span className="text-pink-400">完全解質押時自動銷毀</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-300">視覺展示</span>
              <span className="text-pink-400">根據 VIP 等級動態顯示</span>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-cyan-900/30 to-blue-900/30 border border-cyan-500/30 rounded-lg p-4">
          <h4 className="font-semibold text-cyan-300 mb-3">等級徽章系統</h4>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-gray-800/50 p-3 rounded">
              <div className="flex items-center gap-2 mb-2">
                <span className="font-semibold text-orange-300">Bronze VIP</span>
              </div>
              <p className="text-gray-400">VIP 1-4：入門級會員</p>
            </div>
            <div className="bg-gray-800/50 p-3 rounded">
              <div className="flex items-center gap-2 mb-2">
                <span className="font-semibold text-gray-300">Silver VIP</span>
              </div>
              <p className="text-gray-400">VIP 5-9：進階級會員</p>
            </div>
            <div className="bg-gray-800/50 p-3 rounded">
              <div className="flex items-center gap-2 mb-2">
                <span className="font-semibold text-yellow-300">Gold VIP</span>
              </div>
              <p className="text-gray-400">VIP 10-19：黃金級會員</p>
            </div>
            <div className="bg-gray-800/50 p-3 rounded">
              <div className="flex items-center gap-2 mb-2">
                <span className="font-semibold text-cyan-300">Diamond VIP</span>
              </div>
              <p className="text-gray-400">VIP 20+：鑽石級會員</p>
            </div>
          </div>
        </div>

        <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-4">
          <h4 className="font-semibold text-purple-300 mb-2">NFT 特殊屬性</h4>
          <ul className="text-sm space-y-1 text-purple-200">
            <li>• <strong>動態元數據</strong>：根據質押價值實時更新</li>
            <li>• <strong>BSC 鏈上認證</strong>：真正的區塊鏈身份證明</li>
            <li>• <strong>唯一性保證</strong>：每個地址最多持有一張</li>
            <li>• <strong>社群展示</strong>：可在各 NFT 平台查看和展示</li>
            <li>• <strong>未來擴展</strong>：可用於更多遊戲功能和特權</li>
          </ul>
        </div>
      </div>
    )
  }
];

export const VipBenefitsGuide: React.FC<VipBenefitsGuideProps> = ({ isOpen, onClose }) => {
  const [activeCategory, setActiveCategory] = useState('overview');
  const { isAdmin } = useAdminAccess();
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!isOpen) return null;

  const currentCategory = benefitCategories.find(cat => cat.id === activeCategory);
  const currentCategoryIndex = benefitCategories.findIndex(cat => cat.id === activeCategory);

  const handleNext = () => {
    if (currentCategoryIndex < benefitCategories.length - 1) {
      setActiveCategory(benefitCategories[currentCategoryIndex + 1].id);
    }
  };

  const handlePrevious = () => {
    if (currentCategoryIndex > 0) {
      setActiveCategory(benefitCategories[currentCategoryIndex - 1].id);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="VIP 會員完整指南"
      showCloseButton={true}
      maxWidth="4xl"
    >
      <div className="relative">
        {/* ESC 鍵提示 */}
        <div className="absolute top-2 right-2 text-xs text-gray-500">
          按 ESC 關閉
        </div>
        {/* 上方導航分頁 */}
        <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-2 border-b border-gray-700">
          {benefitCategories.map((category) => (
            <button
              key={category.id}
              onClick={() => setActiveCategory(category.id)}
              className={`px-3 py-2 rounded-md whitespace-nowrap transition-all text-sm font-medium ${
                activeCategory === category.id
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md'
                  : 'bg-gray-800/40 text-gray-300 hover:bg-gray-700/60 hover:text-white'
              }`}
            >
              {category.title}
            </button>
          ))}
        </div>

        {/* 內容區域 */}
        <div className="min-h-[400px]">
          {currentCategory?.content}
        </div>

        {/* 底部導航 */}
        <div className="mt-8 pt-6 border-t border-gray-700">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={handlePrevious}
              disabled={currentCategoryIndex === 0}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                currentCategoryIndex === 0
                  ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                  : 'bg-gray-700 text-white hover:bg-gray-600'
              }`}
            >
              ← 上一篇
            </button>
            
            <div className="flex items-center gap-2">
              {benefitCategories.map((cat, index) => (
                <div
                  key={cat.id}
                  className={`w-2 h-2 rounded-full transition-all ${
                    index === currentCategoryIndex
                      ? 'bg-purple-500 w-8'
                      : 'bg-gray-600'
                  }`}
                />
              ))}
            </div>
            
            <button
              onClick={handleNext}
              disabled={currentCategoryIndex === benefitCategories.length - 1}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                currentCategoryIndex === benefitCategories.length - 1
                  ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                  : 'bg-purple-600 text-white hover:bg-purple-700'
              }`}
            >
              下一篇 →
            </button>
          </div>
          
          {/* 總結 */}
          <div className="bg-gradient-to-r from-purple-900/30 to-indigo-900/30 border border-purple-500/30 rounded-lg p-6 text-center">
            <h3 className="text-lg font-bold text-purple-300 mb-3">立即開始您的 VIP 之旅</h3>
            <p className="text-gray-300 mb-4">
              質押 SoulShard 代幣，解鎖強大的 VIP 特權，
              在 DungeonDelvers 的世界中享受更多優勢和回報！
            </p>
            <div className="flex items-center justify-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-gray-300">即時生效</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-300">隨時調整</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-300">無上限成長</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};