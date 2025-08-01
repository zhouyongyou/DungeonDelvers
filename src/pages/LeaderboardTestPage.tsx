// 排行榜測試頁面
import React from 'react';
import { LeaderboardSystem } from '../components/leaderboard/LeaderboardSystem';

const LeaderboardTestPage: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <div className="text-center mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
          排行榜測試頁面
        </h1>
        <p className="text-gray-400 text-sm md:text-base">
          測試新的排行榜類型
        </p>
      </div>

      <div className="space-y-8">
        {/* 總收益排行 */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h2 className="text-2xl font-bold text-white mb-6">💰 總收益排行榜</h2>
          <LeaderboardSystem type="totalEarnings" limit={5} showFilters={false} />
        </div>

        {/* VIP 等級排行 */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h2 className="text-2xl font-bold text-white mb-6">👑 VIP 等級排行榜</h2>
          <LeaderboardSystem type="vipLevel" limit={5} showFilters={false} />
        </div>

        {/* 隊伍戰力排行 */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h2 className="text-2xl font-bold text-white mb-6">🛡️ 隊伍戰力排行榜</h2>
          <LeaderboardSystem type="partyPower" limit={5} showFilters={false} />
        </div>

        {/* 玩家等級排行 */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h2 className="text-2xl font-bold text-white mb-6">🎯 玩家等級排行榜</h2>
          <LeaderboardSystem type="playerLevel" limit={5} showFilters={false} />
        </div>

        {/* 升級次數排行 */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h2 className="text-2xl font-bold text-white mb-6">⚡ 升級次數排行榜</h2>
          <LeaderboardSystem type="upgradeAttempts" limit={5} showFilters={false} />
        </div>
      </div>
    </div>
  );
};

export default LeaderboardTestPage;