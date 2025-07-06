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

// 為儀表板新增的圖示
const HeroIcon: React.FC<{ className?: string }> = ({ className }) => <span className={className}>🦸</span>;
const RelicIcon: React.FC<{ className?: string }> = ({ className }) => <span className={className}>💎</span>;
const PartyIcon: React.FC<{ className?: string }> = ({ className }) => <span className={className}>🛡️</span>;
const VipIcon: React.FC<{ className?: string }> = ({ className }) => <span className={className}>⭐</span>;
const MintIcon: React.FC<{ className?: string }> = ({ className }) => <span className={className}>✨</span>;
const AltarIcon: React.FC<{ className?: string }> = ({ className }) => <span className={className}>🔥</span>;
const AssetsIcon: React.FC<{ className?: string }> = ({ className }) => <span className={className}>📦</span>;
const DungeonIcon: React.FC<{ className?: string }> = ({ className }) => <span className={className}>⚔️</span>;
// ★ 新增：圖鑑圖示
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
    Codex: CodexIcon, // ★ 新增：導出圖鑑圖示
};
