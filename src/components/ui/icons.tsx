// src/components/ui/icons.tsx

import React from 'react';

const HistoryIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
    <path d="M12 7v5l4 2" />
  </svg>
);

const ExternalLinkIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    <polyline points="15 3 21 3 21 9" />
    <line x1="10" y1="14" x2="21" y2="3" />
  </svg>
);

// ★ 新增：Twitter (X) 圖示
const TwitterIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
);

// ★ 新增：複製圖示
const CopyIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
    </svg>
);

// ★ 新增：警告三角形圖示
const AlertTriangleIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
        <line x1="12" y1="9" x2="12" y2="13"></line>
        <line x1="12" y1="17" x2="12.01" y2="17"></line>
    </svg>
);

// ★ 新增：勾選圖示
const CheckIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
);

// ★ 新增：下載圖示
const DownloadIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
        <polyline points="7 10 12 15 17 10"></polyline>
        <line x1="12" y1="15" x2="12" y2="3"></line>
    </svg>
);

// ★ 新增：叉叉圖示
const XIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
);

const HeroIcon: React.FC<{ className?: string }> = ({ className }) => <span className={className}>🦸</span>;
const RelicIcon: React.FC<{ className?: string }> = ({ className }) => <span className={className}>💎</span>;
const PartyIcon: React.FC<{ className?: string }> = ({ className }) => <span className={className}>🛡️</span>;
const VipIcon: React.FC<{ className?: string }> = ({ className }) => <span className={className}>⭐</span>;
const MintIcon: React.FC<{ className?: string }> = ({ className }) => <span className={className}>✨</span>;
const AltarIcon: React.FC<{ className?: string }> = ({ className }) => <span className={className}>🔥</span>;
const AssetsIcon: React.FC<{ className?: string }> = ({ className }) => <span className={className}>📦</span>;
const DungeonIcon: React.FC<{ className?: string }> = ({ className }) => <span className={className}>⚔️</span>;
const CodexIcon: React.FC<{ className?: string }> = ({ className }) => <span className={className}>📖</span>;


// 將所有圖示統一導出
export const Icons = {
    History: HistoryIcon,
    ExternalLink: ExternalLinkIcon,
    Hero: HeroIcon,
    Relic: RelicIcon,
    Party: PartyIcon,
    Vip: VipIcon,
    Mint: MintIcon,
    Altar: AltarIcon,
    Assets: AssetsIcon,
    Dungeon: DungeonIcon,
    Codex: CodexIcon,
    Twitter: TwitterIcon, // ★ 新增
    Copy: CopyIcon,       // ★ 新增
    Download: DownloadIcon, // ★ 新增：下載圖示
    AlertTriangle: AlertTriangleIcon, // ★ 新增：警告三角形圖示
    Check: CheckIcon,     // ★ 新增：勾選圖示
    X: XIcon,            // ★ 新增：叉叉圖示
};
