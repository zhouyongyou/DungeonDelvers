import React from 'react';
import { useAccount } from 'wagmi';
import { DEVELOPER_ADDRESS } from '../config/constants';

const PitchPage: React.FC = () => {
  const { address, isConnected } = useAccount();
  const isDeveloper = isConnected && address?.toLowerCase() === DEVELOPER_ADDRESS.toLowerCase();

  // 僅開發者或開發環境可訪問
  if (process.env.NODE_ENV === 'production' && !isDeveloper) {
    return (
      <div className="min-h-screen bg-[#121212] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-400 mb-4">Access Denied</h1>
          <p className="text-gray-400">This page is not publicly accessible.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 sm:p-8 bg-[#121212] text-[#E0E0E0]">
      <div className="max-w-5xl mx-auto">
        
        {/* Header Section */}
        <header className="text-center mb-12">
          <img 
            src="/logo-192x192.png" 
            alt="Dungeon Delvers Logo" 
            className="mx-auto mb-4 w-24 h-24 rounded-lg border-2 border-[#FFDF4D]"
          />
          <h1 className="text-3xl sm:text-5xl font-bold text-[#FFDF4D] mb-4" 
              style={{ fontFamily: "'Press Start 2P', cursive", textShadow: '0 0 8px rgba(255, 223, 77, 0.7)' }}>
            Dungeon Delvers
          </h1>
          <p className="mt-4 text-lg text-gray-300 font-medium">
            一款基於 BNB Chain 的全鏈上 Roguelike 地下城探險遊戲
          </p>
          <div className="mt-4 inline-block bg-red-900/20 border border-red-500 rounded-lg px-4 py-2">
            <span className="text-red-400 text-sm font-semibold">🔒 內部資料 - 僅供官方合作使用</span>
          </div>
        </header>

        {/* Core Gameplay Section */}
        <section className="mb-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white/5 border border-white/10 backdrop-blur-md p-6 rounded-lg text-center transform hover:scale-105 transition-transform duration-300">
              <div className="text-4xl mb-3 text-[#FFDF4D]">⚔️</div>
              <h3 className="text-xl mb-2 font-bold" style={{ fontFamily: "'Press Start 2P', cursive" }}>
                動態 NFT 英雄
              </h3>
              <p className="text-gray-400">
                您的英雄 NFT 會隨著遊戲進程升級、進化，所有數據完全上鏈，永久保存。
              </p>
            </div>
            <div className="bg-white/5 border border-white/10 backdrop-blur-md p-6 rounded-lg text-center transform hover:scale-105 transition-transform duration-300">
              <div className="text-4xl mb-3 text-[#FFDF4D]">💎</div>
              <h3 className="text-xl mb-2 font-bold" style={{ fontFamily: "'Press Start 2P', cursive" }}>
                隨機生成地城
              </h3>
              <p className="text-gray-400">
                每一次探險都是獨一無二的挑戰。地城、怪物、寶藏皆由智能合約隨機生成。
              </p>
            </div>
            <div className="bg-white/5 border border-white/10 backdrop-blur-md p-6 rounded-lg text-center transform hover:scale-105 transition-transform duration-300">
              <div className="text-4xl mb-3 text-[#FFDF4D]">🏆</div>
              <h3 className="text-xl mb-2 font-bold" style={{ fontFamily: "'Press Start 2P', cursive" }}>
                Play-to-Earn 2.0
              </h3>
              <p className="text-gray-400">
                透過策略與技巧賺取 $SOULSHARD 代幣與稀有 NFT 遺物，實現可持續的經濟模型。
              </p>
            </div>
          </div>
        </section>

        {/* Project Vision & Key Features */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          <div className="bg-white/5 border border-white/10 backdrop-blur-md p-8 rounded-lg">
            <h2 className="text-2xl mb-4 text-[#FFDF4D] border-b-2 border-[#FFDF4D] pb-2" 
                style={{ fontFamily: "'Press Start 2P', cursive" }}>
              專案願景
            </h2>
            <p className="text-gray-300 leading-relaxed">
              Dungeon Delvers 旨在解決當前 Web3 遊戲普遍存在的「生命週期短」與「經濟模型脆弱」的問題。
              我們透過 <strong className="text-amber-300">全鏈上 (Fully On-Chain)</strong> 的遊戲邏輯與 
              <strong className="text-amber-300"> Roguelike</strong> 的高重玩性，打造一個真正由社群驅動、
              資產永存、且具備可持續經濟循環的遊戲世界。我們的目標不僅是創造一款遊戲，
              而是一個開放且可組合的地下城宇宙。
            </p>
          </div>
          <div className="bg-white/5 border border-white/10 backdrop-blur-md p-8 rounded-lg">
            <h2 className="text-2xl mb-4 text-[#FFDF4D] border-b-2 border-[#FFDF4D] pb-2" 
                style={{ fontFamily: "'Press Start 2P', cursive" }}>
              核心特色
            </h2>
            <ul className="space-y-3 text-gray-300">
              <li>
                <span className="font-bold text-amber-300">全鏈上遊戲邏輯：</span> 
                確保遊戲的公平、透明與抗審查性。
              </li>
              <li>
                <span className="font-bold text-amber-300">動態 NFT 資產：</span> 
                英雄與遺物 NFT 的屬性與外觀會根據鏈上行為動態變化。
              </li>
              <li>
                <span className="font-bold text-amber-300">可組合的 NFT：</span> 
                英雄、隊伍、遺物皆為獨立 NFT，可自由組合與交易。
              </li>
              <li>
                <span className="font-bold text-amber-300">雙代幣模型：</span> 
                治理代幣與實用代幣 $SOULSHARD 相互協作，穩定經濟。
              </li>
            </ul>
          </div>
        </section>

        {/* Technical Implementation */}
        <section className="bg-white/5 border border-white/10 backdrop-blur-md p-8 rounded-lg mb-12">
          <h2 className="text-2xl text-center mb-6 text-[#FFDF4D]" 
              style={{ fontFamily: "'Press Start 2P', cursive" }}>
            技術實現亮點
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-lg font-semibold text-amber-300 mb-2">智能合約架構</h4>
              <ul className="text-gray-400 text-sm space-y-1">
                <li>• Diamond Proxy (EIP-2535) 模組化升級</li>
                <li>• 隨機數生成使用 Chainlink VRF</li>
                <li>• Gas 優化的批量操作設計</li>
                <li>• 完整的審計與安全測試</li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold text-amber-300 mb-2">前端技術棧</h4>
              <ul className="text-gray-400 text-sm space-y-1">
                <li>• React 18 + TypeScript + Vite</li>
                <li>• Wagmi v2 + Viem 區塊鏈集成</li>
                <li>• The Graph 子圖數據索引</li>
                <li>• 響應式設計與 PWA 支援</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Tokenomics Section */}
        <section className="bg-white/5 border border-white/10 backdrop-blur-md p-8 rounded-lg mb-12">
          <h2 className="text-2xl text-center mb-6 text-[#FFDF4D]" 
              style={{ fontFamily: "'Press Start 2P', cursive" }}>
            代幣經濟學: $SOULSHARD
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            <div>
              <h4 className="text-lg font-semibold text-amber-300">獲取方式</h4>
              <p className="mt-2 text-gray-400">完成地城探險、擊敗 Boss、參與社群活動。</p>
            </div>
            <div>
              <h4 className="text-lg font-semibold text-amber-300">消耗場景</h4>
              <p className="mt-2 text-gray-400">升級英雄、打造遺物、創建隊伍、進入高級地城。</p>
            </div>
            <div>
              <h4 className="text-lg font-semibold text-amber-300">核心價值</h4>
              <p className="mt-2 text-gray-400">作為遊戲內經濟循環的核心，驅動玩家持續遊玩與資產增值。</p>
            </div>
          </div>
        </section>

        {/* Current Status */}
        <section className="bg-white/5 border border-white/10 backdrop-blur-md p-8 rounded-lg mb-12">
          <h2 className="text-2xl text-center mb-6 text-[#FFDF4D]" 
              style={{ fontFamily: "'Press Start 2P', cursive" }}>
            目前開發狀況
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h4 className="text-lg font-semibold text-green-400 mb-3">✅ 已完成</h4>
              <ul className="text-gray-300 space-y-2">
                <li>• 核心智能合約開發完成</li>
                <li>• 前端應用基礎架構</li>
                <li>• NFT 動態生成系統</li>
                <li>• 基礎遊戲邏輯實現</li>
                <li>• 測試網部署與測試</li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold text-yellow-400 mb-3">🚧 進行中</h4>
              <ul className="text-gray-300 space-y-2">
                <li>• 智能合約安全審計</li>
                <li>• 前端 UI/UX 優化</li>
                <li>• The Graph 子圖部署</li>
                <li>• 遊戲平衡性調整</li>
                <li>• 社群功能開發</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Roadmap Section */}
        <section className="mb-12">
          <h2 className="text-2xl text-center mb-8 text-[#FFDF4D]" 
              style={{ fontFamily: "'Press Start 2P', cursive" }}>
            發展路線圖
          </h2>
          <div className="relative">
            <div className="absolute left-1/2 h-full w-0.5 bg-gray-700 -translate-x-1/2"></div>
            <div className="space-y-12">
              <div className="relative flex items-center">
                <div className="w-1/2 pr-8 text-right">
                  <div className="bg-white/5 border border-white/10 backdrop-blur-md p-4 rounded-lg">
                    <h4 className="font-bold text-amber-300">Q3 2025</h4>
                    <p className="text-sm text-gray-400">核心合約完成審計<br/>創世英雄 NFT 發行</p>
                  </div>
                </div>
                <div className="absolute left-1/2 w-4 h-4 bg-[#FFDF4D] rounded-full -translate-x-1/2 border-4 border-gray-800"></div>
              </div>
              <div className="relative flex items-center">
                <div className="w-1/2"></div>
                <div className="w-1/2 pl-8 text-left">
                  <div className="bg-white/5 border border-white/10 backdrop-blur-md p-4 rounded-lg">
                    <h4 className="font-bold text-amber-300">Q4 2025</h4>
                    <p className="text-sm text-gray-400">遊戲 Alpha 版本上線<br/>代幣 IDO/IEO</p>
                  </div>
                </div>
                <div className="absolute left-1/2 w-4 h-4 bg-[#FFDF4D] rounded-full -translate-x-1/2 border-4 border-gray-800"></div>
              </div>
              <div className="relative flex items-center">
                <div className="w-1/2 pr-8 text-right">
                  <div className="bg-white/5 border border-white/10 backdrop-blur-md p-4 rounded-lg">
                    <h4 className="font-bold text-amber-300">Q1 2026</h4>
                    <p className="text-sm text-gray-400">PVP 競技場模式<br/>開放遺物合成系統</p>
                  </div>
                </div>
                <div className="absolute left-1/2 w-4 h-4 bg-gray-500 rounded-full -translate-x-1/2 border-4 border-gray-800"></div>
              </div>
            </div>
          </div>
        </section>

        {/* Partnership Opportunities */}
        <section className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 border-2 border-purple-500/30 p-8 rounded-lg mb-12">
          <h2 className="text-2xl text-center mb-6 text-[#FFDF4D]" 
              style={{ fontFamily: "'Press Start 2P', cursive" }}>
            合作機會
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            <div>
              <h4 className="text-lg font-semibold text-purple-300">技術合作</h4>
              <p className="mt-2 text-gray-400">基礎設施、工具鏈、開發者生態系統整合</p>
            </div>
            <div>
              <h4 className="text-lg font-semibold text-purple-300">市場推廣</h4>
              <p className="mt-2 text-gray-400">聯合行銷、社群活動、品牌曝光合作</p>
            </div>
            <div>
              <h4 className="text-lg font-semibold text-purple-300">生態整合</h4>
              <p className="mt-2 text-gray-400">DeFi 協議、NFT 市場、GameFi 平台互通</p>
            </div>
          </div>
        </section>

        {/* Contact Info */}
        <footer className="text-center pt-8">
          <h2 className="text-2xl mb-6 text-[#FFDF4D]" 
              style={{ fontFamily: "'Press Start 2P', cursive" }}>
            聯繫方式
          </h2>
          <div className="bg-white/5 border border-white/10 backdrop-blur-md p-6 rounded-lg mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
              <div>
                <h4 className="font-semibold text-amber-300">商務合作</h4>
                <p className="text-gray-400">business@dungeondelvers.io</p>
              </div>
              <div>
                <h4 className="font-semibold text-amber-300">技術交流</h4>
                <p className="text-gray-400">tech@dungeondelvers.io</p>
              </div>
              <div>
                <h4 className="font-semibold text-amber-300">GitHub</h4>
                <p className="text-gray-400">github.com/dungeondelvers</p>
              </div>
              <div>
                <h4 className="font-semibold text-amber-300">官方網站</h4>
                <p className="text-gray-400">dungeondelvers.io</p>
              </div>
            </div>
          </div>
          <p className="text-gray-500 text-sm">
            © 2025 Dungeon Delvers. 保留所有權利。
            <br/>
            <span className="text-red-400">本文件僅供內部商務合作使用，請勿對外公開</span>
          </p>
        </footer>

      </div>
    </div>
  );
};

export default PitchPage;