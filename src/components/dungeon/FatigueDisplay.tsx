import React from 'react';
import { Card } from '../ui/Card';

interface FatigueDisplayProps {
  fatigue: bigint;
  totalPower: bigint;
}

export const FatigueDisplay: React.FC<FatigueDisplayProps> = ({ fatigue, totalPower }) => {
  const fatiguePercent = Number(fatigue);
  const effectivePower = totalPower * (100n - fatigue) / 100n;
  
  const getFatigueColor = (percent: number) => {
    if (percent <= 25) return 'text-green-400';
    if (percent <= 50) return 'text-yellow-400';
    if (percent <= 75) return 'text-orange-400';
    return 'text-red-400';
  };

  const getFatigueStatus = (percent: number) => {
    if (percent <= 25) return '狀態良好';
    if (percent <= 50) return '輕微疲勞';
    if (percent <= 75) return '中度疲勞';
    return '嚴重疲勞';
  };

  const getFatigueIcon = (percent: number) => {
    if (percent <= 25) return '😊';
    if (percent <= 50) return '😐';
    if (percent <= 75) return '😴';
    return '😵';
  };

  return (
    <Card className="p-4">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">疲勞度狀態</h3>
          <span className="text-2xl">{getFatigueIcon(fatiguePercent)}</span>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-gray-300">當前疲勞度</span>
            <span className={`font-bold ${getFatigueColor(fatiguePercent)}`}>
              {fatiguePercent}%
            </span>
          </div>

          <div className="w-full bg-gray-700 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${
                fatiguePercent <= 25 ? 'bg-green-500' :
                fatiguePercent <= 50 ? 'bg-yellow-500' :
                fatiguePercent <= 75 ? 'bg-orange-500' : 'bg-red-500'
              }`}
              style={{ width: `${fatiguePercent}%` }}
            />
          </div>

          <div className="text-sm text-gray-400">
            狀態: {getFatigueStatus(fatiguePercent)}
          </div>
        </div>

        <div className="pt-3 border-t border-gray-700">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-gray-300">原始戰力</span>
              <span className="text-white font-mono">{totalPower.toString()}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-gray-300">有效戰力</span>
              <span className={`font-mono ${
                fatiguePercent > 50 ? 'text-orange-400' : 'text-green-400'
              }`}>
                {effectivePower.toString()}
              </span>
            </div>

            {fatiguePercent > 0 && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-400">戰力損失</span>
                <span className="text-red-400">
                  -{(totalPower - effectivePower).toString()} ({fatiguePercent}%)
                </span>
              </div>
            )}
          </div>
        </div>

        {fatiguePercent > 50 && (
          <div className="mt-3 p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
            <div className="text-orange-400 text-sm font-medium mb-1">
              ⚠️ 疲勞警告
            </div>
            <div className="text-orange-300 text-xs">
              疲勞度過高會顯著降低戰力，建議及時休息恢復。
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}; 