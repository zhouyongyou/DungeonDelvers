import React, { useState } from 'react';
import { ExternalLink, GamepadIcon, Coins, Trophy, Users, Zap, MessageCircle } from 'lucide-react';
import { useConnect } from 'wagmi';
import { injected } from 'wagmi/connectors';

interface ProjectIntroductionProps {
  variant?: 'full' | 'compact';
  showCallToAction?: boolean;
}

export const ProjectIntroduction: React.FC<ProjectIntroductionProps> = ({ 
  variant = 'full',
  showCallToAction = true 
}) => {
  const [activeTab, setActiveTab] = useState('overview');

  if (variant === 'compact') {
    return <CompactIntroduction showCallToAction={showCallToAction} />;
  }

  return (
    <div className="max-w-6xl mx-auto p-0 md:p-6 bg-transparent md:bg-gray-900 md:rounded-lg">
      {/* 主標題 */}
      <div className="text-center mb-6 md:mb-8">
        <h1 className="text-lg md:text-2xl lg:text-3xl font-bold text-white mb-3">
          不僅是遊戲，更是可持續的 <span className="text-purple-400">Web3 娛樂生態</span>
        </h1>
        <p className="text-sm md:text-base lg:text-lg text-gray-300 max-w-3xl mx-auto px-4">
          歡迎來到我們的世界！我們致力於打造能成功「出圈」、讓主流玩家也愛不釋手的 Web3 遊戲品牌。
        </p>
      </div>

      {/* 標籤導航 */}
      <div className="flex justify-center mb-6 md:mb-8 px-4 md:px-0">
        <div className="bg-gray-800 rounded-lg p-1 flex space-x-1 w-full md:w-auto">
          {[
            { id: 'overview', label: '項目總覽', icon: GamepadIcon },
            { id: 'tokenomics', label: '雙代幣系統', icon: Coins },
            { id: 'roadmap', label: '發展藍圖', icon: Trophy },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${
                activeTab === tab.id
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              <tab.icon size={16} />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 內容區域 */}
      <div className="min-h-[400px] px-4 md:px-0">
        {activeTab === 'overview' && <OverviewSection />}
        {activeTab === 'tokenomics' && <TokenomicsSection />}
        {activeTab === 'roadmap' && <RoadmapSection />}
      </div>

      {/* 行動號召 */}
      {showCallToAction && <CallToActionSection />}
    </div>
  );
};

// 緊湊版本
const CompactIntroduction: React.FC<{ showCallToAction: boolean }> = ({ showCallToAction }) => {
  return (
    <div className="bg-transparent md:bg-gray-900 md:rounded-lg p-0 md:p-6">
      <div className="text-center mb-6">
        <h2 className="text-base md:text-lg lg:text-xl font-bold text-white mb-2">
          Web3 遊戲新紀元
        </h2>
        <p className="text-xs md:text-sm text-gray-300">
          致力於打造「真正好玩、能出圈」的 Web3 遊戲品牌
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-3">
            <Coins className="text-yellow-400" size={20} />
            <h3 className="font-bold text-white">雙代幣系統</h3>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-blue-400 font-semibold">$SOUL</span>
              <span className="text-gray-400">遊戲獎勵幣（即將發行）</span>
            </div>
            <div className="flex justify-between">
              <span className="text-purple-400 font-semibold">$SAGA</span>
              <span className="text-gray-400">平台生態幣（十月後）</span>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-3">
            <GamepadIcon className="text-green-400" size={20} />
            <h3 className="font-bold text-white">首款遊戲</h3>
          </div>
          <div className="space-y-1 text-sm text-gray-300">
            <p>• 致敬經典 Play-to-Earn</p>
            <p>• U本位穩定獎勵</p>
            <p>• 即將上線測試</p>
          </div>
        </div>
      </div>

      {showCallToAction && (
        <div className="text-center">
          <button className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-6 rounded-lg transition-colors">
            立即體驗
          </button>
        </div>
      )}
    </div>
  );
};

// 項目總覽區塊
const OverviewSection: React.FC = () => {
  const features = [
    {
      icon: <GamepadIcon className="text-blue-400" size={24} />,
      title: "經典玩法，穩定開局",
      description: "致敬《飛船》、《血石》等經典鏈遊，提供成熟的 Play-to-Earn 體驗"
    },
    {
      icon: <Coins className="text-yellow-400" size={24} />,
      title: "U本位獎勵系統",
      description: "賺取以穩定幣價值錨定的 $SOUL 代幣，投入與回報更加穩定"
    },
    {
      icon: <Zap className="text-purple-400" size={24} />,
      title: "持續更新承諾",
      description: "每 2-3 個月進行重大改版，保持遊戲新鮮感與活力"
    },
    {
      icon: <Trophy className="text-green-400" size={24} />,
      title: "透明經濟模型",
      description: "基於 BSC 鏈 FOUR MEME 平台，所有獎勵池資金公開透明"
    }
  ];

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-lg md:text-xl lg:text-2xl font-bold text-white mb-2 md:mb-3">
          首發遊戲：致敬經典，穩定開局
        </h2>
        <p className="text-gray-300 text-xs md:text-sm lg:text-base">
          歷經近兩個月精心開發，目前已進入最終測試階段
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {features.map((feature, index) => (
          <div key={index} className="bg-gray-800 rounded-lg p-6">
            <div className="flex items-center space-x-3 mb-3">
              {feature.icon}
              <h3 className="text-sm md:text-base lg:text-lg font-bold text-white">{feature.title}</h3>
            </div>
            <p className="text-gray-300 text-xs md:text-sm">{feature.description}</p>
          </div>
        ))}
      </div>

      <div className="bg-gradient-to-r from-purple-900/50 to-blue-900/50 rounded-lg p-6">
        <h3 className="text-sm md:text-base lg:text-lg font-bold text-white mb-3">開發狀態</h3>
        <div className="flex items-center justify-between">
          <span className="text-gray-300">項目進度</span>
          <div className="flex items-center space-x-2">
            <div className="w-32 bg-gray-700 rounded-full h-2">
              <div className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full w-[90%]"></div>
            </div>
            <span className="text-white font-semibold">90%</span>
          </div>
        </div>
        <p className="text-sm text-gray-400 mt-2">目前處於最後 Debug 階段，即將開放測試</p>
      </div>
    </div>
  );
};

// 代幣經濟區塊
const TokenomicsSection: React.FC = () => {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-lg md:text-xl lg:text-2xl font-bold text-white mb-2 md:mb-3">
          核心雙代幣系統：<span className="text-purple-400">$SAGA</span> 與 <span className="text-blue-400">$SOUL</span>
        </h2>
        <p className="text-gray-300 text-xs md:text-sm lg:text-base">
          健康且可持續的經濟模型，雙代幣分工明確
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* SAGA 代幣 */}
        <div className="bg-gradient-to-br from-purple-900/30 to-purple-800/30 rounded-lg p-6 border border-purple-500/30">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-lg">$SAGA</span>
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">平台生態幣</h3>
              <p className="text-purple-300 text-sm">類似 $AXS 定位</p>
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="bg-purple-800/30 rounded p-3">
              <h4 className="text-white font-semibold mb-1">核心功能</h4>
              <ul className="text-purple-200 text-sm space-y-1">
                <li>• 生態治理與投票權</li>
                <li>• 未來遊戲消費場景</li>
                <li>• 特殊活動參與權</li>
                <li>• 品牌價值載體</li>
              </ul>
            </div>
            
            <div className="bg-purple-800/30 rounded p-3">
              <h4 className="text-white font-semibold mb-1">發行計劃</h4>
              <p className="text-purple-200 text-sm">預計十月後推出，為生態奠定基礎</p>
            </div>
          </div>
        </div>

        {/* SOUL 代幣 */}
        <div className="bg-gradient-to-br from-blue-900/30 to-blue-800/30 rounded-lg p-6 border border-blue-500/30">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-lg">$SOUL</span>
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">遊戲獎勵幣</h3>
              <p className="text-blue-300 text-sm">類似 $SLP 定位</p>
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="bg-blue-800/30 rounded p-3">
              <h4 className="text-white font-semibold mb-1">核心功能</h4>
              <ul className="text-blue-200 text-sm space-y-1">
                <li>• U本位穩定價值錨定</li>
                <li>• 遊戲內獎勵分發</li>
                <li>• Play-to-Earn 核心</li>
                <li>• 透明獎勵機制</li>
              </ul>
            </div>
            
            <div className="bg-blue-800/30 rounded p-3">
              <h4 className="text-white font-semibold mb-1">發行計劃</h4>
              <p className="text-blue-200 text-sm">即將發行，BSC 鏈 FOUR MEME 平台</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-xl font-bold text-white mb-4 text-center">代幣經濟關係圖</h3>
        <div className="flex items-center justify-center space-x-8">
          <div className="text-center">
            <div className="w-20 h-20 bg-purple-600 rounded-full flex items-center justify-center mb-2">
              <span className="text-white font-bold">$SAGA</span>
            </div>
            <p className="text-purple-300 text-sm">生態消費</p>
          </div>
          
          <div className="flex-1 border-t-2 border-dashed border-gray-600 relative">
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-gray-900 px-2">
              <span className="text-gray-400 text-sm">協同發展</span>
            </div>
          </div>
          
          <div className="text-center">
            <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center mb-2">
              <span className="text-white font-bold">$SOUL</span>
            </div>
            <p className="text-blue-300 text-sm">遊戲獎勵</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// 發展藍圖區塊
const RoadmapSection: React.FC = () => {
  const phases = [
    {
      phase: "Phase 1",
      title: "首款遊戲 + $SOUL 上線",
      status: "即將發行",
      statusColor: "bg-green-500",
      description: "經典 Play-to-Earn 體驗，穩定的 U 本位獎勵",
      features: ["地城探索遊戲", "$SOUL 獎勵系統", "NFT 英雄收集"]
    },
    {
      phase: "Phase 2", 
      title: "$SAGA 平台幣發行",
      status: "十月後",
      statusColor: "bg-blue-500",
      description: "建立生態基礎，為未來發展奠定根基",
      features: ["平台幣發行", "社群建設", "生態治理框架"]
    },
    {
      phase: "Phase 3",
      title: "生態擴展與創新",
      status: "規劃中", 
      statusColor: "bg-purple-500",
      description: "從 P2E 到 Play-for-Fun & Value 的全面升級",
      features: ["新遊戲類型", "高價值 NFT 系統", "$SAGA 深度整合"]
    },
    {
      phase: "Phase 4",
      title: "品牌出圈與主流化",
      status: "願景",
      statusColor: "bg-green-500", 
      description: "打造真正能吸引主流玩家的 Web3 遊戲品牌",
      features: ["多元遊戲矩陣", "主流市場拓展", "品牌生態成熟"]
    }
  ];

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-xl md:text-2xl font-bold text-white mb-4">
          發展藍圖：從 <span className="text-blue-400">P2E</span> 到 <span className="text-purple-400">Play-for-Fun & Value</span>
        </h2>
        <p className="text-gray-300 text-lg">
          階段性發展，逐步實現可持續的 Web3 遊戲生態
        </p>
      </div>

      <div className="space-y-6">
        {phases.map((phase, index) => (
          <div key={index} className="bg-gray-800 rounded-lg p-6">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-sm">{index + 1}</span>
                </div>
              </div>
              
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <h3 className="text-xl font-bold text-white">{phase.title}</h3>
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold text-white ${phase.statusColor}`}>
                    {phase.status}
                  </span>
                </div>
                
                <p className="text-gray-300 mb-3">{phase.description}</p>
                
                <div className="flex flex-wrap gap-2">
                  {phase.features.map((feature, featureIndex) => (
                    <span key={featureIndex} className="bg-gray-700 px-3 py-1 rounded-full text-sm text-gray-300">
                      {feature}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-gradient-to-r from-purple-900/50 to-blue-900/50 rounded-lg p-6">
        <h3 className="text-xl font-bold text-white mb-3">未來願景重點</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <h4 className="font-semibold text-purple-300">遊戲體驗革新</h4>
            <ul className="text-gray-300 text-sm space-y-1">
              <li>• 專注打造真正好玩的遊戲</li>
              <li>• 類似《BIG TIME》的高價值 NFT</li>
              <li>• 兼具外觀與實用性的資產</li>
            </ul>
          </div>
          <div className="space-y-2">
            <h4 className="font-semibold text-blue-300">品牌生態建設</h4>
            <ul className="text-gray-300 text-sm space-y-1">
              <li>• 多款遊戲形成品牌矩陣</li>
              <li>• $SAGA 深度融入消費場景</li>
              <li>• 成功實現主流市場出圈</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

// 行動號召區塊
const CallToActionSection: React.FC = () => {
  const { connect } = useConnect();
  
  const handleConnectWallet = () => {
    connect({ connector: injected() });
  };
  
  return (
    <div className="mt-12 bg-gradient-to-r from-purple-900 to-blue-900 rounded-lg p-8 text-center">
      <h2 className="text-xl md:text-2xl font-bold text-white mb-4">加入我們的世界</h2>
      <p className="text-base md:text-lg text-gray-200 mb-6 max-w-2xl mx-auto">
        一個偉大的遊戲世界需要熱情的玩家共同塑造。與開發團隊直接交流，見證嶄新遊戲品牌的誕生！
      </p>
      
      <div className="flex flex-wrap justify-center gap-4">
        <a 
          href="https://t.me/Soulbound_Saga" 
          target="_blank" 
          rel="noreferrer"
          className="bg-blue-600 text-white font-bold py-3 px-8 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 shadow-lg"
        >
          <MessageCircle size={20} />
          <span>加入 Telegram</span>
        </a>
        
        <a 
          href="https://x.com/Soulbound_Saga" 
          target="_blank" 
          rel="noreferrer"
          className="border-2 border-white text-white font-bold py-3 px-8 rounded-lg hover:bg-white hover:text-purple-900 transition-colors flex items-center space-x-2"
        >
          <ExternalLink size={20} />
          <span>關注 Twitter</span>
        </a>
        
      </div>
      
      <div className="mt-6 text-gray-300 text-sm">
        <p>啟動順序：首款遊戲 + $SOUL 代幣 → $SAGA 平台幣（十月後）</p>
      </div>
    </div>
  );
};

export default ProjectIntroduction;