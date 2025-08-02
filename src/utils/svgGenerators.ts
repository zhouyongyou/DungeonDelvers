// src/utils/svgGenerators.ts - 前端 SVG 生成器

import type { HeroNft, RelicNft, PartyNft, VipNft } from '../types/nft';

// ============= 通用樣式和輔助函數 =============

const getSVGHeader = () => `<svg viewBox="0 0 400 400" preserveAspectRatio="xMidYMid meet" style="width: 100%; height: 100%;" xmlns="http://www.w3.org/2000/svg">`;

const getGlobalStyles = () => `
<style>
    @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&display=swap');
    .title { font: bold 24px 'Cinzel', serif; fill: #e5e7eb; }
    .subtitle { font: 16px 'Cinzel', serif; fill: #9ca3af; }
    .stat-label { font: 14px 'Cinzel', serif; fill: #9ca3af; }
    .stat-value { font: bold 32px 'Cinzel', serif; fill: #f3f4f6; }
    .rarity { font: bold 20px 'Cinzel', serif; fill: #fbbf24; }
    .footer { font: 12px 'Cinzel', serif; fill: #6b7280; }
    .glow { filter: drop-shadow(0 0 20px currentColor); }
    @keyframes breathe {
        0%, 100% { opacity: 0.3; }
        50% { opacity: 0.8; }
    }
    @keyframes float {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-5px); }
    }
    .breathe { animation: breathe 3s ease-in-out infinite; }
    .float { animation: float 4s ease-in-out infinite; }
</style>`;

const getRarityColor = (rarity: number): string => {
    const colors = ['#6b7280', '#10b981', '#3b82f6', '#a855f7', '#ef4444', '#fbbf24'];
    return colors[Math.min(rarity, 5)] || colors[0];
};

const getRarityStars = (rarity: number): string => {
    return '★'.repeat(Math.min(rarity, 5)) + '☆'.repeat(Math.max(0, 5 - rarity));
};

const getGradientDefs = (primaryColor: string, accentColor: string) => `
<defs>
    <linearGradient id="bg-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#0f172a;stop-opacity:1" />
        <stop offset="100%" style="stop-color:#1e293b;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="card-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:${primaryColor};stop-opacity:0.1" />
        <stop offset="100%" style="stop-color:${accentColor};stop-opacity:0.2" />
    </linearGradient>
    <filter id="glow">
        <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
        <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
        </feMerge>
    </filter>
    <pattern id="grid" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
        <rect x="0" y="0" width="40" height="40" fill="none" stroke="${primaryColor}" stroke-opacity="0.1" stroke-width="1"/>
    </pattern>
</defs>`;

// ============= 戰力範圍計算 =============

const getPowerRange = (rarity: number): { min: number; max: number } => {
    // 基於稀有度的戰力範圍 [Common, Uncommon, Rare, Epic, Legendary]
    const ranges = [
        { min: 0, max: 0 },     // 0 - 不存在
        { min: 25, max: 40 },   // 1 - Common (基礎值 32)
        { min: 65, max: 85 },   // 2 - Uncommon (基礎值 75)
        { min: 110, max: 140 }, // 3 - Rare (基礎值 125)
        { min: 160, max: 190 }, // 4 - Epic (基礎值 175)
        { min: 210, max: 245 }  // 5 - Legendary (基礎值 227)
    ];
    return ranges[Math.min(rarity, 5)] || ranges[0];
};

const getCapacityRange = (rarity: number): { min: number; max: number } => {
    // 基於稀有度的容量範圍
    const ranges = [
        { min: 0, max: 0 },     // 0 - 不存在
        { min: 1, max: 1 },     // 1 - Common
        { min: 2, max: 2 },     // 2 - Uncommon
        { min: 3, max: 3 },     // 3 - Rare
        { min: 4, max: 4 },     // 4 - Epic
        { min: 5, max: 5 }      // 5 - Legendary
    ];
    return ranges[Math.min(rarity, 5)] || ranges[0];
};

// ============= Emoji 選擇 =============

const getHeroEmojis = (rarity: number): { main: string; secondary: string } => {
    const emojis = [
        { main: '⚔️', secondary: '🛡️' },      // 0/1 - Common
        { main: '⚔️', secondary: '🛡️' },      // 1 - Common
        { main: '🗡️', secondary: '🔰' },      // 2 - Uncommon
        { main: '🏹', secondary: '💎' },      // 3 - Rare
        { main: '🔥', secondary: '⭐' },      // 4 - Epic
        { main: '⚡', secondary: '👑' }       // 5 - Legendary
    ];
    return emojis[Math.min(rarity, 5)] || emojis[0];
};

const getRelicEmojis = (rarity: number): { main: string; secondary: string } => {
    const emojis = [
        { main: '💍', secondary: '📿' },      // 0/1 - Common
        { main: '💍', secondary: '📿' },      // 1 - Common
        { main: '🔮', secondary: '🌟' },      // 2 - Uncommon
        { main: '💠', secondary: '✨' },      // 3 - Rare
        { main: '🌈', secondary: '🌠' },      // 4 - Epic
        { main: '🪐', secondary: '🌌' }       // 5 - Legendary
    ];
    return emojis[Math.min(rarity, 5)] || emojis[0];
};

// ============= Hero SVG 生成器 =============

export function generateHeroSVG(hero: HeroNft, isCodex: boolean = false): string {
    const rarityValue = typeof hero.rarity === 'string' ? parseInt(hero.rarity) : hero.rarity;
    const rarityColor = getRarityColor(rarityValue);
    const powerRange = getPowerRange(rarityValue);
    const emojis = getHeroEmojis(rarityValue);
    
    return `${getSVGHeader()}
        ${getGlobalStyles()}
        ${getGradientDefs(rarityColor, '#1e293b')}
        
        <!-- 背景 -->
        <rect width="400" height="400" rx="20" fill="url(#bg-gradient)"/>
        <rect width="400" height="400" rx="20" fill="url(#grid)"/>
        
        <!-- 邊框 -->
        <rect x="10" y="10" width="380" height="380" rx="15" fill="none" 
              stroke="${rarityColor}" stroke-width="3" opacity="0.8" class="glow"/>
        
        <!-- 標題區 -->
        <text x="200" y="40" text-anchor="middle" class="title">HERO #${hero.id}</text>
        
        <!-- 使用 foreignObject 顯示 Emoji -->
        <foreignObject x="50" y="120" width="300" height="100" class="float">
            <div xmlns="http://www.w3.org/1999/xhtml" style="display: flex; justify-content: center; align-items: center; height: 100%; gap: 20px;">
                <span style="font-size: 60px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI Emoji', 'Apple Color Emoji', 'Noto Color Emoji', sans-serif;">${emojis.main}</span>
                <span style="font-size: 60px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI Emoji', 'Apple Color Emoji', 'Noto Color Emoji', sans-serif;">${emojis.secondary}</span>
            </div>
        </foreignObject>
        
        <!-- 主要屬性 -->
        <rect x="50" y="260" width="300" height="80" rx="10" fill="${rarityColor}" opacity="0.1"/>
        ${isCodex ? `
        <text x="200" y="285" text-anchor="middle" class="stat-label">POWER RANGE</text>
        <text x="200" y="315" text-anchor="middle" class="stat-value">${powerRange.min} - ${powerRange.max}</text>
        <text x="200" y="335" text-anchor="middle" style="font: 12px 'Cinzel', serif; fill: #9ca3af;">Current: ${hero.power}</text>
        ` : `
        <text x="200" y="300" text-anchor="middle" class="stat-label">POWER</text>
        <text x="200" y="330" text-anchor="middle" class="stat-value">${hero.power}</text>
        `}
        
        <!-- 稀有度 -->
        <text x="200" y="370" text-anchor="middle" class="rarity">${getRarityStars(rarityValue)}</text>
    </svg>`;
}

// ============= Relic SVG 生成器 =============

export function generateRelicSVG(relic: RelicNft, isCodex: boolean = false): string {
    const rarityValue = typeof relic.rarity === 'string' ? parseInt(relic.rarity) : relic.rarity;
    const rarityColor = getRarityColor(rarityValue);
    const emojis = getRelicEmojis(rarityValue);
    
    return `${getSVGHeader()}
        ${getGlobalStyles()}
        ${getGradientDefs(rarityColor, '#1e293b')}
        
        <!-- 背景 -->
        <rect width="400" height="400" rx="20" fill="url(#bg-gradient)"/>
        <rect width="400" height="400" rx="20" fill="url(#grid)"/>
        
        <!-- 邊框 -->
        <rect x="10" y="10" width="380" height="380" rx="15" fill="none" 
              stroke="${rarityColor}" stroke-width="3" opacity="0.8" class="glow"/>
        
        <!-- 標題區 -->
        <text x="200" y="40" text-anchor="middle" class="title">RELIC #${relic.id}</text>
        
        <!-- 使用 foreignObject 顯示 Emoji -->
        <foreignObject x="50" y="120" width="300" height="100" class="float">
            <div xmlns="http://www.w3.org/1999/xhtml" style="display: flex; justify-content: center; align-items: center; height: 100%; gap: 20px;">
                <span style="font-size: 60px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI Emoji', 'Apple Color Emoji', 'Noto Color Emoji', sans-serif;">${emojis.main}</span>
                <span style="font-size: 60px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI Emoji', 'Apple Color Emoji', 'Noto Color Emoji', sans-serif;">${emojis.secondary}</span>
            </div>
        </foreignObject>
        
        <!-- 主要屬性 -->
        <rect x="50" y="260" width="300" height="80" rx="10" fill="${rarityColor}" opacity="0.1"/>
        ${isCodex ? `
        <text x="200" y="285" text-anchor="middle" class="stat-label">CAPACITY RANGE</text>
        <text x="200" y="315" text-anchor="middle" class="stat-value">${getCapacityRange(rarityValue).min} - ${getCapacityRange(rarityValue).max}</text>
        <text x="200" y="335" text-anchor="middle" style="font: 12px 'Cinzel', serif; fill: #9ca3af;">Current: ${relic.capacity}</text>
        ` : `
        <text x="200" y="285" text-anchor="middle" class="stat-label">CAPACITY</text>
        <text x="200" y="315" text-anchor="middle" class="stat-value">${relic.capacity}</text>
        <text x="200" y="335" text-anchor="middle" style="font: 12px 'Cinzel', serif; fill: #9ca3af;">Heroes Limit</text>
        `}
        
        <!-- 稀有度 -->
        <text x="200" y="370" text-anchor="middle" class="rarity">${getRarityStars(rarityValue)}</text>
    </svg>`;
}

// ============= Party SVG 生成器 =============

const getPartyEmojis = (rarity: number): { main: string; secondary: string } => {
    const emojis = [
        { main: '👥', secondary: '⚔️' },      // 0/1 - Common
        { main: '👥', secondary: '⚔️' },      // 1 - Common  
        { main: '🛡️', secondary: '👑' },      // 2 - Uncommon
        { main: '🏰', secondary: '⚡' },      // 3 - Rare
        { main: '🌟', secondary: '🔥' },      // 4 - Epic
        { main: '👑', secondary: '💎' }       // 5 - Legendary
    ];
    return emojis[Math.min(rarity, 5)] || emojis[0];
};

export function generatePartySVG(party: PartyNft): string {
    const rarityColor = getRarityColor(party.partyRarity);
    const tierName = ['Standard', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond'][Math.min(party.partyRarity, 5)] || 'Standard';
    const emojis = getPartyEmojis(party.partyRarity);
    
    return `${getSVGHeader()}
        ${getGlobalStyles()}
        ${getGradientDefs(rarityColor, '#1e293b')}
        
        <!-- 背景 -->
        <rect width="400" height="400" rx="20" fill="url(#bg-gradient)"/>
        <rect width="400" height="400" rx="20" fill="url(#grid)"/>
        
        <!-- 邊框 -->
        <rect x="10" y="10" width="380" height="380" rx="15" fill="none" 
              stroke="${rarityColor}" stroke-width="3" opacity="0.8" class="glow"/>
        
        <!-- 標題區 -->
        <text x="200" y="40" text-anchor="middle" class="title">PARTY #${party.id}</text>
        
        <!-- 使用 foreignObject 顯示雙 Emoji -->
        <foreignObject x="50" y="120" width="300" height="100" class="float">
            <div xmlns="http://www.w3.org/1999/xhtml" style="display: flex; justify-content: center; align-items: center; height: 100%; gap: 20px;">
                <span style="font-size: 60px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI Emoji', 'Apple Color Emoji', 'Noto Color Emoji', sans-serif;">${emojis.main}</span>
                <span style="font-size: 60px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI Emoji', 'Apple Color Emoji', 'Noto Color Emoji', sans-serif;">${emojis.secondary}</span>
            </div>
        </foreignObject>
        
        <!-- 統計數據 -->
        <g transform="translate(0, 260)">
            <!-- Power -->
            <rect x="50" y="0" width="140" height="50" rx="10" fill="${rarityColor}" opacity="0.1"/>
            <text x="120" y="20" text-anchor="middle" class="stat-label">POWER</text>
            <text x="120" y="40" text-anchor="middle" class="stat-value" style="font-size: 20px">${party.totalPower}</text>
            
            <!-- Capacity -->
            <rect x="210" y="0" width="140" height="50" rx="10" fill="${rarityColor}" opacity="0.1"/>
            <text x="280" y="20" text-anchor="middle" class="stat-label">CAPACITY</text>
            <text x="280" y="40" text-anchor="middle" class="stat-value" style="font-size: 20px">${party.totalCapacity}</text>
        </g>
        
        <!-- 隊伍成員數 -->
        <text x="200" y="340" text-anchor="middle" class="stat-label">HEROES: ${party.heroIds.length} / RELICS: ${party.relicIds.length}</text>
        
        <!-- 稀有度 -->
        <text x="200" y="370" text-anchor="middle" class="rarity">${getRarityStars(party.partyRarity)}</text>
    </svg>`;
}

// ============= VIP SVG 生成器 =============

export function generateVipSVG(vip: VipNft): string {
    const getTierInfo = (level: number) => {
        if (level >= 20) return { color: '#a78bfa', name: 'DIAMOND', icon: '💎' };
        if (level >= 10) return { color: '#E5E7EB', name: 'PLATINUM', icon: '🏆' };
        if (level >= 7) return { color: '#fbbd23', name: 'GOLD', icon: '🥇' };
        if (level >= 4) return { color: '#C0C0C0', name: 'SILVER', icon: '🥈' };
        if (level >= 1) return { color: '#cd7f32', name: 'BRONZE', icon: '🥉' };
        return { color: '#6B7280', name: 'STANDARD', icon: '🎯' };
    };
    
    const tier = getTierInfo(vip.level);
    
    return `${getSVGHeader()}
        ${getGlobalStyles()}
        <defs>
            <linearGradient id="vip-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color:#0f172a;stop-opacity:1" />
                <stop offset="100%" style="stop-color:${tier.color};stop-opacity:0.3" />
            </linearGradient>
            <filter id="vip-glow">
                <feGaussianBlur stdDeviation="10" result="coloredBlur"/>
                <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                </feMerge>
            </filter>
        </defs>
        
        <!-- 背景 -->
        <rect width="400" height="400" rx="20" fill="url(#vip-gradient)"/>
        
        <!-- 動畫星星背景 -->
        ${Array.from({length: 15}, (_, i) => `
            <circle cx="${Math.random() * 400}" cy="${Math.random() * 400}" r="${1 + Math.random() * 2}" 
                    fill="${tier.color}" opacity="0.3" class="breathe" 
                    style="animation-delay: ${Math.random() * 3}s"/>
        `).join('')}
        
        <!-- 邊框 -->
        <rect x="10" y="10" width="380" height="380" rx="15" fill="none" 
              stroke="${tier.color}" stroke-width="4" filter="url(#vip-glow)"/>
        
        <!-- 標題區 -->
        <text x="200" y="50" text-anchor="middle" class="title" fill="${tier.color}">${tier.name} VIP</text>
        
        <!-- 中央圖標 -->
        <g transform="translate(200, 180)">
            <circle r="70" fill="${tier.color}" opacity="0.1" class="breathe"/>
            <text text-anchor="middle" style="font-size: 80px;" class="float">${tier.icon}</text>
        </g>
        
        <!-- VIP 等級 -->
        <text x="200" y="280" text-anchor="middle" style="font-size: 40px; fill: ${tier.color}; font-weight: bold;">
            LEVEL ${vip.level}
        </text>
        
        <!-- 質押資訊 -->
        <rect x="50" y="300" width="300" height="40" rx="10" fill="${tier.color}" opacity="0.1"/>
        <text x="200" y="325" text-anchor="middle" class="stat-value" style="font-size: 16px">
            ${(Number(vip.stakedAmount) / 1e18).toFixed(2)} $SOUL
        </text>
        
        <!-- 稅率減免 -->
        <text x="200" y="370" text-anchor="middle" class="stat-value" style="font-size: 20px; fill: ${tier.color}">
            -${(vip.level * 0.5).toFixed(1)}% TAX
        </text>
    </svg>`;
}

// ============= 輔助函數：將 SVG 轉換為 Data URL =============

export function svgToDataURL(svg: string): string {
    const base64 = btoa(unescape(encodeURIComponent(svg)));
    return `data:image/svg+xml;base64,${base64}`;
}

// ============= 個人檔案 SVG 生成器 =============

export interface ProfileData {
    address: string;
    level: number;
    experience: bigint;
    nextLevelExp: bigint;
    currentLevelExp: bigint;
    progress: number; // 0-100
    heroCount?: number;
    relicCount?: number;
    partyCount?: number;
    expeditionCount?: number;
    totalRewards?: bigint;
    joinDate?: Date;
}

export function generateProfileSVG(profile: ProfileData): string {
    const primaryColor = '#8b5cf6'; // 紫色主題
    const accentColor = '#a78bfa';
    const bgPattern = `
        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1e293b" stroke-width="0.5" opacity="0.3"/>
        </pattern>
        <pattern id="dots" width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="10" cy="10" r="1" fill="${primaryColor}" opacity="0.2" class="breathe"/>
        </pattern>
    `;
    
    // 格式化地址
    const shortAddress = profile.address 
        ? `${profile.address.slice(0, 6)}...${profile.address.slice(-4)}`
        : '0x0000...0000';
    
    return `${getSVGHeader()}
        ${getGlobalStyles()}
        ${getGradientDefs(primaryColor, accentColor)}
        ${bgPattern}
        
        <!-- 背景 -->
        <rect width="400" height="400" fill="url(#bg-gradient)" />
        <rect width="400" height="400" fill="url(#dots)" />
        
        <!-- 裝飾邊框 -->
        <rect x="10" y="10" width="380" height="380" fill="none" stroke="${primaryColor}" stroke-width="2" opacity="0.3" rx="20" />
        <rect x="20" y="20" width="360" height="360" fill="none" stroke="${accentColor}" stroke-width="1" opacity="0.2" rx="15" />
        
        <!-- 標題區域 -->
        <g transform="translate(200, 70)">
            <text class="title" text-anchor="middle" y="0">Player Profile</text>
            <text class="subtitle" text-anchor="middle" y="25" fill="${accentColor}">${shortAddress}</text>
        </g>
        
        <!-- 等級顯示 (居中) -->
        <g transform="translate(200, 180)">
            <!-- 等級背景裝飾 -->
            <rect x="-80" y="-40" width="160" height="80" fill="${primaryColor}" fill-opacity="0.1" rx="20" />
            <!-- 等級文字 -->
            <text class="stat-value" text-anchor="middle" y="10" fill="${accentColor}" font-size="48">Lv.${profile.level}</text>
        </g>
        
        <!-- 進度百分比 -->
        <g transform="translate(200, 240)">
            <text class="stat-label" text-anchor="middle" y="0" font-size="16" fill="${accentColor}">Progress: ${Math.max(0, profile.progress)}%</text>
        </g>
        
        <!-- 經驗值條 -->
        <g transform="translate(50, 290)">
            <rect x="0" y="0" width="300" height="24" fill="#1e293b" rx="12" />
            <rect x="0" y="0" width="${Math.max(0, profile.progress) * 3}" height="24" fill="${primaryColor}" rx="12" class="glow" />
            <text class="stat-label" x="150" y="35" text-anchor="middle" font-size="12">
                ${Math.max(0, Number(profile.experience) - Number(profile.currentLevelExp)).toString()} / ${(Number(profile.nextLevelExp) - Number(profile.currentLevelExp)).toString()} EXP
            </text>
        </g>
        
        <!-- 總經驗值 -->
        <g transform="translate(200, 340)">
            <text class="stat-label" text-anchor="middle" y="0" font-size="11" fill="#9ca3af">
                Total: ${profile.experience.toString()} EXP
            </text>
        </g>
        
        <!-- 靈魂綁定標記 -->
        <g transform="translate(200, 370)">
            <text class="stat-label" text-anchor="middle" y="0" font-size="12" fill="${accentColor}">Soulbound NFT</text>
        </g>
    </svg>`;
}

// ============= 輔助函數：生成完整的 metadata JSON =============

export function generateMetadataJSON(nft: HeroNft | RelicNft | PartyNft | VipNft): string {
    let svg: string;
    let description: string;
    
    switch (nft.type) {
        case 'hero':
            svg = generateHeroSVG(nft as HeroNft);
            description = 'A mighty hero of Dungeon Delvers, ready to explore the depths.';
            break;
        case 'relic':
            svg = generateRelicSVG(nft as RelicNft);
            description = 'An ancient relic imbued with mystical powers.';
            break;
        case 'party':
            svg = generatePartySVG(nft as PartyNft);
            description = 'A brave party of delvers assembled for adventure.';
            break;
        case 'vip':
            svg = generateVipSVG(nft as VipNft);
            description = 'An exclusive VIP membership card with special privileges.';
            break;
        default:
            throw new Error('Unknown NFT type');
    }
    
    const metadata = {
        name: `${nft.type.toUpperCase()} #${nft.id}`,
        description,
        image: svgToDataURL(svg),
        attributes: nft.attributes || []
    };
    
    return JSON.stringify(metadata, null, 2);
}