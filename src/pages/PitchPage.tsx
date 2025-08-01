// src/pages/PitchPage.tsx

import React, { useState, useMemo, memo } from 'react';
import { useAccount } from 'wagmi';
import { formatEther } from 'viem';
import { ActionButton } from '../components/ui/ActionButton';
import { Icons } from '../components/ui/icons';
import { DEVELOPER_ADDRESS } from '../config/constants';

interface PitchSectionProps {
    title: string;
    children: React.ReactNode;
    gradient?: string;
    className?: string;
}

const PitchSection = memo<PitchSectionProps>(({ title, children, gradient = "from-gray-800/30 to-gray-900/30", className = "" }) => (
    <section className={`bg-gradient-to-br ${gradient} backdrop-blur-sm rounded-xl p-6 sm:p-8 border border-gray-700/50 shadow-xl ${className}`}>
        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-6 flex items-center gap-3">
            <span className="w-1 h-8 bg-gradient-to-b from-[#FF6B35] to-[#FFDF4D] rounded-full"></span>
            {title}
        </h2>
        {children}
    </section>
));

PitchSection.displayName = 'PitchSection';

const StatCard = memo<{ 
    icon: React.ReactNode; 
    title: string; 
    value: string; 
    description?: string;
    highlight?: boolean;
    trend?: 'up' | 'down' | 'stable';
}>(({ icon, title, value, description, highlight = false, trend }) => (
    <div className={`p-4 sm:p-6 rounded-lg border transition-all duration-300 hover:scale-105 hover:shadow-lg ${
        highlight 
            ? 'bg-gradient-to-br from-[#FF6B35]/20 to-[#FFDF4D]/20 border-[#FF6B35]/50 shadow-lg shadow-[#FF6B35]/20' 
            : 'bg-gray-800/40 border-gray-600/50 hover:border-[#4A90E2]/50'
    }`}>
        <div className="flex items-center gap-3 mb-2">
            <div className={`text-2xl ${highlight ? 'text-[#FFDF4D]' : 'text-[#4A90E2]'}`}>
                {icon}
            </div>
            <h3 className="font-semibold text-gray-200 text-sm">{title}</h3>
            {trend && (
                <div className={`text-xs px-2 py-1 rounded-full ${
                    trend === 'up' ? 'bg-green-500/20 text-green-400' :
                    trend === 'down' ? 'bg-red-500/20 text-red-400' :
                    'bg-gray-500/20 text-gray-400'
                }`}>
                    {trend === 'up' ? '↗' : trend === 'down' ? '↘' : '→'}
                </div>
            )}
        </div>
        <p className={`text-2xl font-bold mb-1 ${highlight ? 'text-[#FFDF4D]' : 'text-white'}`}>
            {value}
        </p>
        {description && (
            <p className="text-sm text-gray-400">{description}</p>
        )}
    </div>
));

StatCard.displayName = 'StatCard';

const FeatureCard = memo<{
    icon: React.ReactNode;
    title: string;
    description: string;
    benefits: string[];
    accentColor?: string;
}>(({ icon, title, description, benefits, accentColor = 'green' }) => (
    <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 p-6 rounded-xl border border-gray-600/50 hover:border-[#4A90E2]/50 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg">
        <div className="text-4xl mb-4 text-center">{icon}</div>
        <h3 className="text-xl font-bold text-white mb-3 text-center">{title}</h3>
        <p className="text-gray-300 mb-4 text-center text-sm leading-relaxed">{description}</p>
        <ul className="space-y-2">
            {benefits.map((benefit, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-gray-400">
                    <span className={`text-${accentColor}-400 mt-0.5 flex-shrink-0`}>✓</span>
                    <span className="leading-relaxed">{benefit}</span>
                </li>
            ))}
        </ul>
    </div>
));

FeatureCard.displayName = 'FeatureCard';

const PitchPage: React.FC = memo(() => {
    const { address, isConnected } = useAccount();
    const isDeveloper = isConnected && address?.toLowerCase() === DEVELOPER_ADDRESS.toLowerCase();

    // PITCH 頁面現在公開可訪問
    // 之前的訪問限制已移除

    const [activeTab, setActiveTab] = useState<'overview' | 'tokenomics' | 'roadmap' | 'team'>('overview');

    const keyMetrics = useMemo(() => [
        {
            icon: <Icons.Users />,
            title: "目標市場",
            value: "100K+",
            description: "首年活躍玩家目標",
            highlight: true,
            trend: 'up' as const
        },
        {
            icon: <Icons.TrendingUp />,
            title: "市場規模",
            value: "$65B",
            description: "2027年 GameFi 預期規模",
            trend: 'up' as const
        },
        {
            icon: <Icons.Shield />,
            title: "技術優勢",
            value: "100%",
            description: "完全去中心化架構",
            trend: 'stable' as const
        },
        {
            icon: <Icons.Crown />,
            title: "收益潛力",
            value: "30%+",
            description: "年化投資回報預期",
            trend: 'up' as const
        }
    ], []);

    const coreFeatures = useMemo(() => [
        {
            icon: "🎮",
            title: "真正的 GameFi",
            description: "超越 NFT 交易的完整遊戲生態，結合深度策略與區塊鏈技術",
            benefits: [
                "策略性隊伍組建與戰術配置",
                "多層次地下城探索系統",
                "完整的技能升級進化體系",
                "公會合作與競技模式"
            ],
            accentColor: "blue"
        },
        {
            icon: "🔒",
            title: "完全去中心化",
            description: "所有遊戲邏輯與資產管理完全在區塊鏈上運行，玩家真正擁有",
            benefits: [
                "智能合約驅動的遊戲邏輯",
                "玩家完全擁有所有遊戲資產",
                "透明的隨機數生成機制",
                "無法被中心化實體任意修改"
            ],
            accentColor: "purple"
        },
        {
            icon: "💰",
            title: "可持續經濟",
            description: "創新的雙代幣經濟模型，確保生態系統長期價值穩定增長",
            benefits: [
                "雙代幣系統平衡供需關係",
                "通縮機制維持代幣價值",
                "多元化收益來源設計",
                "社區治理驅動發展方向"
            ],
            accentColor: "yellow"
        },
        {
            icon: "🚀",
            title: "技術革新",
            description: "業界領先的區塊鏈遊戲技術解決方案，優化用戶體驗",
            benefits: [
                "Gas 費用優化與批量操作",
                "實時數據同步機制",
                "跨鏈資產橋接準備",
                "可擴展的模組化架構"
            ],
            accentColor: "green"
        }
    ], []);

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#FF6B35]/5 via-[#4A90E2]/5 to-[#FFDF4D]/5"></div>
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#4A90E2]/10 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#FF6B35]/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
            
            {/* Hero Section */}
            <section className="relative py-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
                <div className="relative max-w-7xl mx-auto text-center">
                    {/* Brand Logo & Title */}
                    <div className="mb-8">
                        <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-[#FF6B35] to-[#FFDF4D] rounded-full mb-6 shadow-2xl shadow-[#FF6B35]/30">
                            <span className="text-4xl">⚔️</span>
                        </div>
                        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
                            <span className="bg-gradient-to-r from-[#FF6B35] via-[#FFDF4D] to-[#FF6B35] bg-clip-text text-transparent">
                                Soulbound Saga
                            </span>
                        </h1>
                        <div className="text-lg sm:text-xl text-[#FF6B35] font-semibold mb-4 tracking-wide">
                            靈魂契約傳奇
                        </div>
                        <p className="text-xl sm:text-2xl text-gray-300 mb-6 max-w-4xl mx-auto leading-relaxed">
                            Web3 時代的完全去中心化策略遊戲生態系統
                        </p>
                        <p className="text-lg text-gray-400 max-w-3xl mx-auto leading-relaxed">
                            結合深度遊戲機制、創新經濟模型與完全鏈上運行，
                            開創區塊鏈遊戲的全新範式
                        </p>
                        
                        {/* Internal Access Notice */}
                        <div className="mt-6 inline-block bg-red-900/20 border border-red-500/50 rounded-lg px-4 py-2">
                            <span className="text-red-400 text-sm font-semibold">🔒 內部資料 - 僅供官方合作使用</span>
                        </div>
                    </div>
                    
                    {/* Key Metrics Dashboard */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 mb-12">
                        {keyMetrics.map((metric, index) => (
                            <StatCard key={index} {...metric} />
                        ))}
                    </div>
                    
                    {/* Primary CTA Buttons */}
                    <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
                        <ActionButton 
                            onClick={() => window.open('#/dashboard', '_self')}
                            className="bg-gradient-to-r from-[#FF6B35] to-[#FFDF4D] hover:from-[#FF6B35]/80 hover:to-[#FFDF4D]/80 px-8 py-4 text-lg font-semibold shadow-lg shadow-[#FF6B35]/25 text-white transform hover:scale-105 transition-all duration-300"
                        >
                            🎮 體驗遊戲原型
                        </ActionButton>
                        <ActionButton 
                            onClick={() => window.open('#/mint', '_self')}
                            variant="secondary"
                            className="border-2 border-[#4A90E2] hover:border-[#4A90E2]/80 hover:bg-[#4A90E2]/10 px-8 py-4 text-lg font-semibold text-[#4A90E2] transform hover:scale-105 transition-all duration-300"
                        >
                            🏺 鑄造 NFT 資產
                        </ActionButton>
                    </div>

                    {/* Value Proposition */}
                    <div className="bg-gradient-to-r from-[#4A90E2]/10 to-[#FF6B35]/10 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50 max-w-4xl mx-auto">
                        <h3 className="text-xl font-bold text-white mb-4">為什麼選擇 Soulbound Saga？</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                            <div className="text-center">
                                <div className="text-[#4A90E2] text-2xl mb-2">🎯</div>
                                <p className="text-gray-300">
                                    <strong className="text-white">真實遊戲需求</strong><br/>
                                    非投機炒作項目
                                </p>
                            </div>
                            <div className="text-center">
                                <div className="text-[#FFDF4D] text-2xl mb-2">⚡</div>
                                <p className="text-gray-300">
                                    <strong className="text-white">技術護城河</strong><br/>
                                    完全去中心化架構
                                </p>
                            </div>
                            <div className="text-center">
                                <div className="text-[#FF6B35] text-2xl mb-2">💎</div>
                                <p className="text-gray-300">
                                    <strong className="text-white">可持續經濟</strong><br/>
                                    長期價值增長模型
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Navigation Tabs */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-12 sticky top-4 z-10">
                <div className="flex flex-wrap justify-center gap-2 sm:gap-4 p-2 bg-gray-800/80 backdrop-blur-md rounded-xl border border-gray-700/50 shadow-lg">
                    {[
                        { key: 'overview', label: '項目概覽', icon: <Icons.Home />, emoji: '🏠' },
                        { key: 'tokenomics', label: '代幣經濟', icon: <Icons.BarChart />, emoji: '💰' },
                        { key: 'roadmap', label: '發展路線', icon: <Icons.TrendingUp />, emoji: '🛣️' },
                        { key: 'team', label: '團隊介紹', icon: <Icons.Users />, emoji: '👥' }
                    ].map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key as typeof activeTab)}
                            className={`flex items-center gap-2 px-4 py-3 rounded-lg font-semibold transition-all duration-300 ${
                                activeTab === tab.key
                                    ? 'bg-gradient-to-r from-[#FF6B35] to-[#FFDF4D] text-white shadow-lg transform scale-105'
                                    : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                            }`}
                        >
                            <span className="text-lg">{tab.emoji}</span>
                            <span className="hidden sm:inline">{tab.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Content Sections */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 pb-20 relative">
                {activeTab === 'overview' && (
                    <>
                        {/* Investment Highlights */}
                        <PitchSection title="🎯 投資亮點" gradient="from-[#4A90E2]/20 to-[#FF6B35]/20">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                                {/* Market Opportunity */}
                                <div className="space-y-6">
                                    <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                                        <span className="text-2xl">📈</span>
                                        巨大市場機會
                                    </h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 p-4 rounded-lg border border-green-500/30">
                                            <div className="text-2xl font-bold text-green-400">$15B</div>
                                            <div className="text-sm text-gray-300">2024 GameFi 市場</div>
                                        </div>
                                        <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 p-4 rounded-lg border border-blue-500/30">
                                            <div className="text-2xl font-bold text-blue-400">$65B</div>
                                            <div className="text-sm text-gray-300">2027 預期規模</div>
                                        </div>
                                        <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 p-4 rounded-lg border border-purple-500/30">
                                            <div className="text-2xl font-bold text-purple-400">50M+</div>
                                            <div className="text-sm text-gray-300">活躍玩家預期</div>
                                        </div>
                                        <div className="bg-gradient-to-br from-orange-500/10 to-red-500/10 p-4 rounded-lg border border-orange-500/30">
                                            <div className="text-2xl font-bold text-orange-400">$1,300</div>
                                            <div className="text-sm text-gray-300">平均用戶價值</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Competitive Advantages */}
                                <div className="space-y-6">
                                    <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                                        <span className="text-2xl">⚡</span>
                                        競爭差異化
                                    </h3>
                                    <div className="space-y-4">
                                        <div className="p-4 bg-gray-800/50 rounded-lg border-l-4 border-[#FFDF4D]">
                                            <h4 className="font-semibold text-[#FFDF4D] mb-2">vs 傳統遊戲</h4>
                                            <p className="text-sm text-gray-300">玩家真正擁有遊戲資產，可自由交易與轉移，無中心化風險</p>
                                        </div>
                                        <div className="p-4 bg-gray-800/50 rounded-lg border-l-4 border-[#4A90E2]">
                                            <h4 className="font-semibold text-[#4A90E2] mb-2">vs 其他 GameFi</h4>
                                            <p className="text-sm text-gray-300">完全去中心化運行，無中央服務器依賴，真正的 Web3 原生</p>
                                        </div>
                                        <div className="p-4 bg-gray-800/50 rounded-lg border-l-4 border-[#FF6B35]">
                                            <h4 className="font-semibold text-[#FF6B35] mb-2">vs DeFi 項目</h4>
                                            <p className="text-sm text-gray-300">真實遊戲需求驅動經濟循環，非純金融投機工具</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* ROI Projection */}
                            <div className="bg-gradient-to-r from-[#FF6B35]/10 to-[#FFDF4D]/10 rounded-xl p-6 border border-[#FF6B35]/30">
                                <h3 className="text-lg font-bold text-white mb-4 text-center">投資回報預期模型</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div className="text-center">
                                        <div className="text-green-400 text-sm font-semibold">保守估計</div>
                                        <div className="text-2xl font-bold text-white">15-20%</div>
                                        <div className="text-xs text-gray-400">年化收益率</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-yellow-400 text-sm font-semibold">基準預期</div>
                                        <div className="text-2xl font-bold text-white">25-35%</div>
                                        <div className="text-xs text-gray-400">年化收益率</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-orange-400 text-sm font-semibold">樂觀情境</div>
                                        <div className="text-2xl font-bold text-white">50%+</div>
                                        <div className="text-xs text-gray-400">年化收益率</div>
                                    </div>
                                </div>
                            </div>
                        </PitchSection>

                        {/* Core Features */}
                        <PitchSection title="🚀 核心競爭優勢" gradient="from-[#FF6B35]/20 to-[#4A90E2]/20">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                {coreFeatures.map((feature, index) => (
                                    <FeatureCard key={index} {...feature} />
                                ))}
                            </div>
                        </PitchSection>

                        {/* Product Demo */}
                        <PitchSection title="🎮 產品演示" gradient="from-purple-900/30 to-pink-900/30">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <h3 className="text-xl font-bold text-white mb-4">核心遊戲流程</h3>
                                    <div className="space-y-3">
                                        {[
                                            { step: "1", title: "鑄造 NFT 英雄與聖物", desc: "使用 $SOUL 代幣鑄造遊戲資產" },
                                            { step: "2", title: "組建探險隊伍", desc: "策略性配置英雄與聖物組合" },
                                            { step: "3", title: "探索地下城", desc: "挑戰不同難度獲得獎勵" },
                                            { step: "4", title: "升級與進化", desc: "提升角色能力與稀有度" },
                                            { step: "5", title: "交易與治理", desc: "在市場交易或參與社區決策" }
                                        ].map((item, index) => (
                                            <div key={index} className="flex items-start gap-4 p-3 bg-gray-800/30 rounded-lg">
                                                <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-r from-[#FF6B35] to-[#FFDF4D] rounded-full flex items-center justify-center text-white text-sm font-bold">
                                                    {item.step}
                                                </div>
                                                <div>
                                                    <h4 className="font-semibold text-white text-sm">{item.title}</h4>
                                                    <p className="text-xs text-gray-400">{item.desc}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-xl p-6 border border-gray-600/50">
                                    <h3 className="text-lg font-bold text-white mb-4 text-center">遊戲界面預覽</h3>
                                    <div className="aspect-video bg-gradient-to-br from-gray-700 to-gray-800 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-600">
                                        <div className="text-center">
                                            <div className="text-4xl mb-2">🎮</div>
                                            <p className="text-gray-400 text-sm">遊戲截圖/影片</p>
                                            <p className="text-gray-500 text-xs mt-1">開發中 - 即將上線</p>
                                        </div>
                                    </div>
                                    <div className="mt-4 grid grid-cols-3 gap-2">
                                        <div className="aspect-square bg-gray-700 rounded flex items-center justify-center">
                                            <span className="text-gray-500 text-xs">NFT 展示</span>
                                        </div>
                                        <div className="aspect-square bg-gray-700 rounded flex items-center justify-center">
                                            <span className="text-gray-500 text-xs">戰鬥界面</span>
                                        </div>
                                        <div className="aspect-square bg-gray-700 rounded flex items-center justify-center">
                                            <span className="text-gray-500 text-xs">市場交易</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </PitchSection>
                    </>
                )}

                {activeTab === 'tokenomics' && (
                    <PitchSection title="💰 代幣經濟模型" gradient="from-[#FFDF4D]/20 to-[#FF6B35]/20">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                            {/* Token Utility */}
                            <div>
                                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                                    <span className="text-2xl">🪙</span>
                                    雙代幣體系
                                </h3>
                                <div className="space-y-4">
                                    <div className="p-4 bg-gradient-to-r from-[#FFDF4D]/10 to-[#FF6B35]/10 rounded-lg border-l-4 border-[#FFDF4D]">
                                        <h4 className="font-semibold text-[#FFDF4D] mb-2 flex items-center gap-2">
                                            🎮 $SOUL 遊戲內貨幣 (即將發行)
                                        </h4>
                                        <p className="text-sm text-gray-300">鑄造 NFT、升級英雄、購買道具的主要貨幣</p>
                                    </div>
                                    <div className="p-4 bg-gradient-to-r from-[#4A90E2]/10 to-blue-500/10 rounded-lg border-l-4 border-[#4A90E2]">
                                        <h4 className="font-semibold text-[#4A90E2] mb-2 flex items-center gap-2">
                                            🏛️ 治理代幣 (十月後推出)
                                        </h4>
                                        <p className="text-sm text-gray-300">$SAGA - 參與社區治理，投票決定遊戲發展方向與參數調整</p>
                                    </div>
                                    <div className="p-4 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-lg border-l-4 border-green-500">
                                        <h4 className="font-semibold text-green-400 mb-2 flex items-center gap-2">
                                            💎 質押獎勵
                                        </h4>
                                        <p className="text-sm text-gray-300">質押獲得被動收益、VIP 權益與獨家遊戲內容</p>
                                    </div>
                                    <div className="p-4 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-lg border-l-4 border-purple-500">
                                        <h4 className="font-semibold text-purple-400 mb-2 flex items-center gap-2">
                                            🔥 通縮機制
                                        </h4>
                                        <p className="text-sm text-gray-300">NFT 升級與高級功能消耗代幣，創造持續通縮壓力</p>
                                    </div>
                                </div>
                            </div>

                            {/* Token Distribution */}
                            <div>
                                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                                    <span className="text-2xl">📊</span>
                                    代幣分配與釋放
                                </h3>
                                <div className="space-y-3 mb-6">
                                    <div className="flex justify-between items-center p-3 bg-gray-800/50 rounded-lg">
                                        <span className="text-gray-300">🎮 遊戲獎勵池</span>
                                        <span className="font-bold text-[#FFDF4D]">40%</span>
                                    </div>
                                    <div className="flex justify-between items-center p-3 bg-gray-800/50 rounded-lg">
                                        <span className="text-gray-300">💧 流動性激勵</span>
                                        <span className="font-bold text-[#4A90E2]">25%</span>
                                    </div>
                                    <div className="flex justify-between items-center p-3 bg-gray-800/50 rounded-lg">
                                        <span className="text-gray-300">👥 團隊與開發</span>
                                        <span className="font-bold text-purple-400">20%</span>
                                    </div>
                                    <div className="flex justify-between items-center p-3 bg-gray-800/50 rounded-lg">
                                        <span className="text-gray-300">🏛️ 社區金庫</span>
                                        <span className="font-bold text-[#FF6B35]">15%</span>
                                    </div>
                                </div>
                                
                                <div className="bg-gradient-to-r from-green-900/20 to-emerald-900/20 border border-green-500/30 rounded-lg p-4">
                                    <h4 className="font-semibold text-green-300 mb-2">🔥 通縮機制詳解</h4>
                                    <ul className="text-sm text-green-200 space-y-1">
                                        <li>• NFT 升級燃燒 5-10% 的投入代幣</li>
                                        <li>• 高級地下城入場費永久燃燒</li>
                                        <li>• 稀有道具合成消耗大量代幣</li>
                                        <li>• 預期年燃燒率：總供應量的 8-12%</li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                        {/* Economic Flow Diagram */}
                        <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-xl p-6 border border-gray-600/50">
                            <h3 className="text-lg font-bold text-white mb-4 text-center">代幣經濟循環圖</h3>
                            <div className="aspect-video bg-gradient-to-br from-gray-700 to-gray-800 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-600">
                                <div className="text-center">
                                    <div className="text-4xl mb-2">💰</div>
                                    <p className="text-gray-400 text-sm">代幣流轉經濟圖表</p>
                                    <p className="text-gray-500 text-xs mt-1">視覺化展示即將完成</p>
                                </div>
                            </div>
                        </div>

                        {/* Value Accrual */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-8">
                            <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 p-6 rounded-xl border border-blue-500/30">
                                <h4 className="font-semibold text-blue-400 mb-3 text-center">短期價值驅動</h4>
                                <ul className="text-sm text-gray-300 space-y-2">
                                    <li>• 遊戲上線用戶增長</li>
                                    <li>• NFT 鑄造需求激增</li>
                                    <li>• 初始流動性挖礦</li>
                                    <li>• KOL 與社區推廣</li>
                                </ul>
                            </div>
                            <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 p-6 rounded-xl border border-purple-500/30">
                                <h4 className="font-semibold text-purple-400 mb-3 text-center">中期價值驅動</h4>
                                <ul className="text-sm text-gray-300 space-y-2">
                                    <li>• 地下城獎勵分發</li>
                                    <li>• NFT 升級需求穩定</li>
                                    <li>• 競技模式獎勵池</li>
                                    <li>• 跨鏈擴展計劃</li>
                                </ul>
                            </div>
                            <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 p-6 rounded-xl border border-green-500/30">
                                <h4 className="font-semibold text-green-400 mb-3 text-center">長期價值驅動</h4>
                                <ul className="text-sm text-gray-300 space-y-2">
                                    <li>• 通縮機制持續發力</li>
                                    <li>• 治理權益價值提升</li>
                                    <li>• 生態系統網絡效應</li>
                                    <li>• 元宇宙整合潛力</li>
                                </ul>
                            </div>
                        </div>
                    </PitchSection>
                )}

                {activeTab === 'roadmap' && (
                    <PitchSection title="🛣️ 發展路線圖" gradient="from-purple-900/30 to-pink-900/30">
                        <div className="space-y-8">
                            {[
                                {
                                    phase: "Phase 1: 基礎建設完成",
                                    timeline: "2024 Q4 - 已完成",
                                    status: "completed",
                                    progress: 100,
                                    items: [
                                        "✅ 智能合約部署與安全審計",
                                        "✅ 核心遊戲機制開發",
                                        "✅ NFT 鑄造與交易功能",
                                        "✅ 初始流動性池建立"
                                    ]
                                },
                                {
                                    phase: "Phase 2: 產品正式上線",
                                    timeline: "2025 Q1 - 進行中",
                                    status: "current",
                                    progress: 75,
                                    items: [
                                        "🚀 正式版遊戲發布",
                                        "⚔️ 地下城探索功能",
                                        "🛡️ 隊伍戰鬥系統",
                                        "🏆 排行榜與競技模式"
                                    ]
                                },
                                {
                                    phase: "Phase 3: 生態系統擴展",
                                    timeline: "2025 Q2-Q3",
                                    status: "planned",
                                    progress: 0,
                                    items: [
                                        "🏰 公會系統與合作玩法",
                                        "💎 高級地下城與稀有獎勵",
                                        "🌉 跨鏈橋接與多鏈部署",
                                        "📱 移動端原生 App"
                                    ]
                                },
                                {
                                    phase: "Phase 4: 元宇宙整合",
                                    timeline: "2025 Q4+",
                                    status: "future",
                                    progress: 0,
                                    items: [
                                        "🌍 3D 虛擬世界建設",
                                        "🥽 VR/AR 遊戲體驗",
                                        "🤝 與其他 GameFi 聯動",
                                        "🤖 AI 驅動個性化內容"
                                    ]
                                }
                            ].map((phase, index) => (
                                <div key={index} className="relative">
                                    <div className="flex items-start gap-6">
                                        <div className="flex-shrink-0">
                                            <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg relative ${
                                                phase.status === 'completed' 
                                                    ? 'bg-green-500 text-white' 
                                                    : phase.status === 'current'
                                                    ? 'bg-[#FF6B35] text-white'
                                                    : phase.status === 'planned'
                                                    ? 'bg-[#4A90E2] text-white'
                                                    : 'bg-gray-600 text-gray-300'
                                            }`}>
                                                {phase.status === 'completed' ? '✓' : index + 1}
                                                {phase.status === 'current' && (
                                                    <div className="absolute inset-0 rounded-full border-2 border-[#FF6B35] animate-pulse"></div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-3">
                                                <h3 className="text-xl font-bold text-white">{phase.phase}</h3>
                                                <span className="text-sm text-gray-400">{phase.timeline}</span>
                                                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                                    phase.status === 'completed' 
                                                        ? 'bg-green-500/20 text-green-400' 
                                                        : phase.status === 'current'
                                                        ? 'bg-[#FF6B35]/20 text-[#FF6B35]'
                                                        : phase.status === 'planned'
                                                        ? 'bg-[#4A90E2]/20 text-[#4A90E2]'
                                                        : 'bg-gray-600/20 text-gray-400'
                                                }`}>
                                                    {phase.status === 'completed' ? '已完成' : 
                                                     phase.status === 'current' ? '進行中' :
                                                     phase.status === 'planned' ? '已規劃' : '未來計畫'}
                                                </span>
                                            </div>
                                            
                                            {/* Progress Bar */}
                                            {phase.progress > 0 && (
                                                <div className="mb-4">
                                                    <div className="flex justify-between text-sm mb-1">
                                                        <span className="text-gray-400">完成度</span>
                                                        <span className="text-white font-semibold">{phase.progress}%</span>
                                                    </div>
                                                    <div className="w-full bg-gray-700 rounded-full h-2">
                                                        <div 
                                                            className={`h-2 rounded-full transition-all duration-1000 ${
                                                                phase.status === 'completed' ? 'bg-green-500' : 'bg-[#FF6B35]'
                                                            }`}
                                                            style={{ width: `${phase.progress}%` }}
                                                        ></div>
                                                    </div>
                                                </div>
                                            )}
                                            
                                            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                {phase.items.map((item, itemIndex) => (
                                                    <li key={itemIndex} className="flex items-start gap-2 text-gray-300">
                                                        <span className="mt-1 text-sm">{item}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                    {index < 3 && (
                                        <div className="absolute left-6 top-12 w-0.5 h-8 bg-gray-600"></div>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Milestones & KPIs */}
                        <div className="mt-12 bg-gradient-to-r from-[#4A90E2]/10 to-[#FF6B35]/10 rounded-xl p-6 border border-gray-600/50">
                            <h3 className="text-lg font-bold text-white mb-6 text-center">關鍵績效指標 (KPIs)</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="text-center p-4 bg-gray-800/30 rounded-lg">
                                    <div className="text-2xl font-bold text-[#FFDF4D]">10K+</div>
                                    <div className="text-sm text-gray-400">Q1 註冊用戶</div>
                                </div>
                                <div className="text-center p-4 bg-gray-800/30 rounded-lg">
                                    <div className="text-2xl font-bold text-[#4A90E2]">50K+</div>
                                    <div className="text-sm text-gray-400">NFT 鑄造數量</div>
                                </div>
                                <div className="text-center p-4 bg-gray-800/30 rounded-lg">
                                    <div className="text-2xl font-bold text-[#FF6B35]">$2M+</div>
                                    <div className="text-sm text-gray-400">累計交易量</div>
                                </div>
                                <div className="text-center p-4 bg-gray-800/30 rounded-lg">
                                    <div className="text-2xl font-bold text-green-400">25%</div>
                                    <div className="text-sm text-gray-400">月活躍率</div>
                                </div>
                            </div>
                        </div>
                    </PitchSection>
                )}

                {activeTab === 'team' && (
                    <PitchSection title="👥 核心團隊" gradient="from-indigo-900/30 to-purple-900/30">
                        <div className="text-center mb-8">
                            <p className="text-lg text-gray-300 max-w-3xl mx-auto leading-relaxed">
                                我們是一支由區塊鏈技術專家、遊戲開發資深人員與經濟模型設計師組成的
                                <strong className="text-[#FFDF4D]">跨國精英團隊</strong>，
                                致力於創造下一代 Web3 遊戲體驗。
                            </p>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                            {[
                                {
                                    role: "技術架構師",
                                    expertise: "智能合約 & 區塊鏈架構",
                                    experience: "8年區塊鏈開發經驗",
                                    highlights: ["前 DeFi 協議核心開發者", "多個千萬級項目技術顧問", "智能合約安全專家", "發表10+篇技術論文"],
                                    avatar: "🏗️",
                                    color: "blue"
                                },
                                {
                                    role: "遊戲設計總監",
                                    expertise: "GameFi 機制設計 & 用戶體驗",
                                    experience: "12年遊戲產業經驗",
                                    highlights: ["前知名手遊公司主策劃", "多款月流水千萬遊戲主導者", "Web3 遊戲設計先驅", "DAU 百萬級產品操盤手"],
                                    avatar: "🎮",
                                    color: "purple"
                                },
                                {
                                    role: "經濟模型專家",
                                    expertise: "代幣經濟 & 金融建模",
                                    experience: "10年金融量化背景",
                                    highlights: ["前投行衍生品交易員", "多個DeFi協議經濟顧問", "博弈論與機制設計專家", "管理過億級資金池"],
                                    avatar: "💰",
                                    color: "green"
                                }
                            ].map((member, index) => (
                                <div key={index} className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 p-6 rounded-xl border border-gray-600/50 hover:border-gray-500/70 transition-all duration-300 hover:scale-[1.02]">
                                    <div className="text-center mb-4">
                                        <div className="text-4xl mb-3">{member.avatar}</div>
                                        <h3 className="text-lg font-bold text-white">{member.role}</h3>
                                        <p className="text-sm text-[#4A90E2] mb-1">{member.expertise}</p>
                                        <p className="text-xs text-gray-500">{member.experience}</p>
                                    </div>
                                    <ul className="space-y-2">
                                        {member.highlights.map((highlight, highlightIndex) => (
                                            <li key={highlightIndex} className="flex items-start gap-2 text-xs text-gray-400">
                                                <span className="text-[#FFDF4D] mt-0.5 flex-shrink-0">•</span>
                                                <span className="leading-relaxed">{highlight}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                        
                        {/* Team Strengths */}
                        <div className="bg-gradient-to-r from-[#4A90E2]/10 to-[#FF6B35]/10 rounded-xl p-6 border border-gray-600/50 mb-8">
                            <h3 className="text-lg font-bold text-white mb-6 text-center">團隊核心優勢</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="text-center">
                                    <div className="text-3xl mb-3">🎯</div>
                                    <h4 className="font-semibold text-white mb-2">專業專注</h4>
                                    <p className="text-sm text-gray-300">專注 GameFi 賽道，深度理解行業痛點與發展趨勢</p>
                                </div>
                                <div className="text-center">
                                    <div className="text-3xl mb-3">🛡️</div>
                                    <h4 className="font-semibold text-white mb-2">安全第一</h4>
                                    <p className="text-sm text-gray-300">多重安全審計流程，資金與用戶資產安全絕對保障</p>
                                </div>
                                <div className="text-center">
                                    <div className="text-3xl mb-3">⚡</div>
                                    <h4 className="font-semibold text-white mb-2">快速迭代</h4>
                                    <p className="text-sm text-gray-300">敏捷開發模式，快速響應市場變化與用戶需求</p>
                                </div>
                                <div className="text-center">
                                    <div className="text-3xl mb-3">🌍</div>
                                    <h4 className="font-semibold text-white mb-2">全球視野</h4>
                                    <p className="text-sm text-gray-300">國際化團隊協作，面向全球市場的產品設計</p>
                                </div>
                            </div>
                        </div>

                        {/* Advisors */}
                        <div className="bg-gray-800/30 rounded-xl p-6 border border-gray-600/50">
                            <h3 className="text-lg font-bold text-white mb-4 text-center">戰略顧問團</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="text-center p-4 bg-gray-700/30 rounded-lg">
                                    <div className="text-2xl mb-2">🏆</div>
                                    <h4 className="font-semibold text-[#FFDF4D] mb-1">頂級 VC 合夥人</h4>
                                    <p className="text-xs text-gray-400">投資策略與市場拓展顧問</p>
                                </div>
                                <div className="text-center p-4 bg-gray-700/30 rounded-lg">
                                    <div className="text-2xl mb-2">🔬</div>
                                    <h4 className="font-semibold text-[#4A90E2] mb-1">區塊鏈研究院士</h4>
                                    <p className="text-xs text-gray-400">技術前沿與學術合作顧問</p>
                                </div>
                            </div>
                        </div>
                    </PitchSection>
                )}

                {/* Partnership CTA */}
                <PitchSection title="🤝 合作夥伴邀請" gradient="from-[#FF6B35]/20 to-[#FFDF4D]/20" className="sticky bottom-4">
                    <div className="text-center">
                        <p className="text-xl text-gray-300 mb-6 max-w-3xl mx-auto leading-relaxed">
                            <strong className="text-[#FFDF4D]">Soulbound Saga</strong> 不只是一款遊戲，更是 
                            <strong className="text-[#FF6B35]">Web3 遊戲革命的起點</strong>。
                            加入我們，共同定義去中心化遊戲的未來。
                        </p>
                        
                        {/* Quick Action Buttons */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
                            <ActionButton 
                                onClick={() => window.open('#/dashboard', '_self')}
                                className="bg-gradient-to-r from-[#4A90E2] to-cyan-500 hover:from-[#4A90E2]/80 hover:to-cyan-500/80 py-3 text-sm"
                            >
                                🎮 體驗原型
                            </ActionButton>
                            <ActionButton 
                                onClick={() => window.open('#/mint', '_self')}
                                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 py-3 text-sm"
                            >
                                🏺 鑄造 NFT
                            </ActionButton>
                            <ActionButton 
                                onClick={() => window.open('#/vip', '_self')}
                                className="bg-gradient-to-r from-[#FFDF4D] to-[#FF6B35] hover:from-[#FFDF4D]/80 hover:to-[#FF6B35]/80 py-3 text-sm text-black font-semibold"
                            >
                                👑 VIP 質押
                            </ActionButton>
                            <ActionButton 
                                onClick={() => window.open('#/marketplace', '_self')}
                                className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 py-3 text-sm"
                            >
                                🏪 NFT 市場
                            </ActionButton>
                        </div>
                        
                        {/* Contact Information */}
                        <div className="bg-gradient-to-r from-gray-800/50 to-gray-700/50 rounded-xl p-6 border border-gray-600/50">
                            <h3 className="text-lg font-bold text-white mb-4">聯繫方式</h3>
                            <div className="flex flex-wrap justify-center gap-4 mb-4">
                                <a href="#" className="flex items-center gap-2 text-[#4A90E2] hover:text-[#4A90E2]/80 transition-colors">
                                    <span className="text-lg">📱</span>
                                    <span className="text-sm">Telegram</span>
                                </a>
                                <a href="#" className="flex items-center gap-2 text-[#4A90E2] hover:text-[#4A90E2]/80 transition-colors">
                                    <span className="text-lg">🐦</span>
                                    <span className="text-sm">Twitter</span>
                                </a>
                                <a href="#" className="flex items-center gap-2 text-[#4A90E2] hover:text-[#4A90E2]/80 transition-colors">
                                    <span className="text-lg">💬</span>
                                    <span className="text-sm">Discord</span>
                                </a>
                                <a href="mailto:business@soulboundsaga.com" className="flex items-center gap-2 text-[#4A90E2] hover:text-[#4A90E2]/80 transition-colors">
                                    <span className="text-lg">📧</span>
                                    <span className="text-sm">Email</span>
                                </a>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                <ActionButton 
                                    onClick={() => window.open('mailto:partnership@soulboundsaga.com', '_blank')}
                                    className="bg-gradient-to-r from-[#FF6B35] to-[#FFDF4D] hover:from-[#FF6B35]/80 hover:to-[#FFDF4D]/80 px-6 py-3 text-white font-semibold"
                                >
                                    📩 商務合作洽談
                                </ActionButton>
                                <ActionButton 
                                    onClick={() => window.open('https://docs.soulboundsaga.com', '_blank')}
                                    variant="secondary"
                                    className="border-2 border-[#4A90E2] hover:border-[#4A90E2]/80 hover:bg-[#4A90E2]/10 px-6 py-3 text-[#4A90E2]"
                                >
                                    📚 技術文檔
                                </ActionButton>
                            </div>
                        </div>
                        
                        {/* Footer */}
                        <footer className="mt-8 text-center text-gray-500 text-sm">
                            <p>
                                © 2025 Soulbound Saga. 保留所有權利。
                                <br/>
                                <span className="text-red-400">本文件僅供內部商務合作使用，請勿對外公開</span>
                            </p>
                        </footer>
                    </div>
                </PitchSection>
            </div>
        </div>
    );
});

PitchPage.displayName = 'PitchPage';

export default PitchPage;