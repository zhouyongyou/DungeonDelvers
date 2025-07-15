// src/components/admin/RpcCostEstimator.tsx - RPC 成本估算組件

import React, { useState, useEffect } from 'react';
import { useRpcMonitoring } from '../../hooks/useRpcMonitoring';
import { ActionButton } from '../ui/ActionButton';
import { LoadingSpinner } from '../ui/LoadingSpinner';

// Alchemy 定價計劃
const ALCHEMY_PRICING = {
  free: {
    name: '免費計劃',
    monthlyUnits: 300_000_000, // 300M 計算單位
    price: 0,
  },
  growth: {
    name: '成長計劃',
    monthlyUnits: 1_500_000_000, // 1.5B 計算單位
    price: 49, // $49/月
    overagePrice: 200, // $200 per 1B units
  },
  scale: {
    name: '規模計劃',
    monthlyUnits: 5_000_000_000, // 5B 計算單位
    price: 199, // $199/月
    overagePrice: 150, // $150 per 1B units
  },
  enterprise: {
    name: '企業計劃',
    monthlyUnits: 20_000_000_000, // 20B 計算單位
    price: 999, // $999/月
    overagePrice: 100, // $100 per 1B units
  },
};

// 計算單位映射（簡化版本）
const COMPUTE_UNITS_MAP: Record<string, number> = {
  // 讀取操作
  eth_call: 26,
  eth_getBalance: 19,
  eth_getCode: 19,
  eth_getStorageAt: 17,
  eth_getTransactionCount: 16,
  eth_getBlockByNumber: 16,
  eth_getTransactionByHash: 15,
  eth_getLogs: 75,
  eth_getTransactionReceipt: 15,
  
  // 寫入操作
  eth_sendRawTransaction: 250,
  eth_sendTransaction: 250,
  
  // 訂閱操作
  eth_subscribe: 20,
  eth_unsubscribe: 10,
  
  // 過濾器操作
  eth_newFilter: 20,
  eth_newBlockFilter: 20,
  eth_getFilterChanges: 20,
  eth_uninstallFilter: 10,
  
  // 其他
  eth_blockNumber: 10,
  eth_chainId: 0,
  net_version: 0,
  web3_clientVersion: 0,
};

interface CostBreakdown {
  dailyRequests: number;
  monthlyRequests: number;
  dailyUnits: number;
  monthlyUnits: number;
  currentPlan: string;
  currentCost: number;
  recommendedPlan: string;
  recommendedCost: number;
  potentialSavings: number;
  costByMethod: Array<{
    method: string;
    requests: number;
    units: number;
    cost: number;
  }>;
}

const RpcCostEstimator: React.FC = () => {
  const { stats, isLoading } = useRpcMonitoring();
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month'>('day');
  const [breakdown, setBreakdown] = useState<CostBreakdown | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<keyof typeof ALCHEMY_PRICING>('free');

  // 計算成本明細
  useEffect(() => {
    if (!stats) return;

    const calculateBreakdown = () => {
      // 計算計算單位
      let totalUnits = 0;
      const methodBreakdown: CostBreakdown['costByMethod'] = [];

      Object.entries(stats.requestsByMethod).forEach(([method, count]) => {
        const unitsPerRequest = COMPUTE_UNITS_MAP[method] || 20; // 默認 20 單位
        const units = count * unitsPerRequest;
        totalUnits += units;

        methodBreakdown.push({
          method,
          requests: count,
          units,
          cost: 0, // 稍後計算
        });
      });

      // 基於時間範圍推算
      const hoursElapsed = (Date.now() - stats.lastUpdated) / (1000 * 60 * 60);
      const dailyMultiplier = 24 / Math.max(hoursElapsed, 1);
      const monthlyMultiplier = 30;

      const dailyUnits = totalUnits * dailyMultiplier;
      const monthlyUnits = dailyUnits * monthlyMultiplier;
      const dailyRequests = stats.totalRequests * dailyMultiplier;
      const monthlyRequests = dailyRequests * monthlyMultiplier;

      // 確定當前計劃和成本
      const currentPlanData = ALCHEMY_PRICING[selectedPlan];
      let currentCost = currentPlanData.price;

      if (monthlyUnits > currentPlanData.monthlyUnits && selectedPlan !== 'free') {
        const overageUnits = monthlyUnits - currentPlanData.monthlyUnits;
        const overageCost = (overageUnits / 1_000_000_000) * currentPlanData.overagePrice!;
        currentCost += overageCost;
      }

      // 推薦最優計劃
      let recommendedPlan: keyof typeof ALCHEMY_PRICING = 'free';
      let recommendedCost = 0;

      if (monthlyUnits <= ALCHEMY_PRICING.free.monthlyUnits) {
        recommendedPlan = 'free';
        recommendedCost = 0;
      } else if (monthlyUnits <= ALCHEMY_PRICING.growth.monthlyUnits) {
        recommendedPlan = 'growth';
        recommendedCost = ALCHEMY_PRICING.growth.price;
      } else if (monthlyUnits <= ALCHEMY_PRICING.scale.monthlyUnits) {
        recommendedPlan = 'scale';
        recommendedCost = ALCHEMY_PRICING.scale.price;
      } else {
        // 計算每個計劃的總成本
        const plans = ['growth', 'scale', 'enterprise'] as const;
        let minCost = Infinity;

        plans.forEach(plan => {
          const planData = ALCHEMY_PRICING[plan];
          let cost = planData.price;
          
          if (monthlyUnits > planData.monthlyUnits) {
            const overage = monthlyUnits - planData.monthlyUnits;
            cost += (overage / 1_000_000_000) * planData.overagePrice!;
          }

          if (cost < minCost) {
            minCost = cost;
            recommendedPlan = plan;
            recommendedCost = cost;
          }
        });
      }

      // 計算每個方法的成本
      methodBreakdown.forEach(item => {
        item.cost = (item.units / totalUnits) * recommendedCost;
      });

      // 按成本排序
      methodBreakdown.sort((a, b) => b.cost - a.cost);

      setBreakdown({
        dailyRequests,
        monthlyRequests,
        dailyUnits,
        monthlyUnits,
        currentPlan: ALCHEMY_PRICING[selectedPlan].name,
        currentCost,
        recommendedPlan: ALCHEMY_PRICING[recommendedPlan].name,
        recommendedCost,
        potentialSavings: Math.max(0, currentCost - recommendedCost),
        costByMethod: methodBreakdown.slice(0, 10), // 前10個
      });
    };

    calculateBreakdown();
  }, [stats, selectedPlan, timeRange]);

  // 格式化數字
  const formatNumber = (num: number): string => {
    if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(2)}B`;
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}M`;
    if (num >= 1_000) return `${(num / 1_000).toFixed(2)}K`;
    return num.toFixed(0);
  };

  // 格式化貨幣
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('zh-TW', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  if (isLoading || !stats || !breakdown) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 標題和計劃選擇 */}
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold text-white">RPC 成本估算</h3>
        <div className="flex items-center gap-4">
          <select
            value={selectedPlan}
            onChange={(e) => setSelectedPlan(e.target.value as keyof typeof ALCHEMY_PRICING)}
            className="px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
          >
            {Object.entries(ALCHEMY_PRICING).map(([key, plan]) => (
              <option key={key} value={key}>
                {plan.name} ({formatCurrency(plan.price)}/月)
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 成本概覽 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-700 p-6 rounded-lg">
          <h4 className="text-sm font-medium text-gray-400 mb-2">當前計劃成本</h4>
          <div className="text-2xl font-bold text-white">
            {formatCurrency(breakdown.currentCost)}
            <span className="text-sm text-gray-400">/月</span>
          </div>
          <p className="text-sm text-gray-400 mt-2">{breakdown.currentPlan}</p>
        </div>
        
        <div className="bg-gray-700 p-6 rounded-lg">
          <h4 className="text-sm font-medium text-gray-400 mb-2">建議計劃成本</h4>
          <div className="text-2xl font-bold text-green-400">
            {formatCurrency(breakdown.recommendedCost)}
            <span className="text-sm text-gray-400">/月</span>
          </div>
          <p className="text-sm text-gray-400 mt-2">{breakdown.recommendedPlan}</p>
        </div>
        
        <div className="bg-gray-700 p-6 rounded-lg">
          <h4 className="text-sm font-medium text-gray-400 mb-2">潛在節省</h4>
          <div className="text-2xl font-bold text-yellow-400">
            {formatCurrency(breakdown.potentialSavings)}
            <span className="text-sm text-gray-400">/月</span>
          </div>
          <p className="text-sm text-gray-400 mt-2">
            {breakdown.potentialSavings > 0 ? '切換計劃可節省' : '當前計劃最優'}
          </p>
        </div>
      </div>

      {/* 使用量統計 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gray-700 p-6 rounded-lg">
          <h4 className="text-lg font-semibold text-white mb-4">請求量統計</h4>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-400">每日請求</span>
              <span className="text-white font-medium">
                {formatNumber(breakdown.dailyRequests)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">每月請求</span>
              <span className="text-white font-medium">
                {formatNumber(breakdown.monthlyRequests)}
              </span>
            </div>
            <div className="border-t border-gray-600 pt-3">
              <div className="flex justify-between">
                <span className="text-gray-400">每日計算單位</span>
                <span className="text-white font-medium">
                  {formatNumber(breakdown.dailyUnits)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">每月計算單位</span>
                <span className="text-white font-medium">
                  {formatNumber(breakdown.monthlyUnits)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gray-700 p-6 rounded-lg">
          <h4 className="text-lg font-semibold text-white mb-4">成本優化建議</h4>
          <div className="space-y-3">
            {breakdown.potentialSavings > 0 && (
              <div className="p-3 bg-green-900/20 border border-green-500/30 rounded">
                <p className="text-sm text-green-400">
                  💡 切換到{breakdown.recommendedPlan}可節省 {formatCurrency(breakdown.potentialSavings)}/月
                </p>
              </div>
            )}
            {breakdown.monthlyUnits > ALCHEMY_PRICING.free.monthlyUnits * 0.8 && 
             breakdown.monthlyUnits <= ALCHEMY_PRICING.free.monthlyUnits && (
              <div className="p-3 bg-yellow-900/20 border border-yellow-500/30 rounded">
                <p className="text-sm text-yellow-400">
                  ⚠️ 接近免費計劃限制，考慮優化或升級
                </p>
              </div>
            )}
            <div className="p-3 bg-blue-900/20 border border-blue-500/30 rounded">
              <p className="text-sm text-blue-400">
                💾 啟用緩存可減少 60-80% 的 RPC 請求
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 方法成本明細 */}
      <div className="bg-gray-700 p-6 rounded-lg">
        <h4 className="text-lg font-semibold text-white mb-4">
          成本最高的 RPC 方法
        </h4>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-gray-600">
                <th className="text-left py-2 px-4 text-sm font-medium text-gray-400">方法</th>
                <th className="text-right py-2 px-4 text-sm font-medium text-gray-400">請求數</th>
                <th className="text-right py-2 px-4 text-sm font-medium text-gray-400">計算單位</th>
                <th className="text-right py-2 px-4 text-sm font-medium text-gray-400">預估成本</th>
              </tr>
            </thead>
            <tbody>
              {breakdown.costByMethod.map((item, index) => (
                <tr key={index} className="border-b border-gray-600/50">
                  <td className="py-2 px-4 text-sm text-white">{item.method}</td>
                  <td className="py-2 px-4 text-sm text-right text-gray-300">
                    {formatNumber(item.requests)}
                  </td>
                  <td className="py-2 px-4 text-sm text-right text-gray-300">
                    {formatNumber(item.units)}
                  </td>
                  <td className="py-2 px-4 text-sm text-right font-medium text-yellow-400">
                    {formatCurrency(item.cost)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 行動建議 */}
      <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-6">
        <h4 className="text-lg font-semibold text-blue-400 mb-3">行動建議</h4>
        <ul className="space-y-2 text-sm text-gray-300">
          <li className="flex items-start">
            <span className="text-blue-400 mr-2">•</span>
            實施全面的緩存策略，特別是對 eth_call 和 eth_getLogs 方法
          </li>
          <li className="flex items-start">
            <span className="text-blue-400 mr-2">•</span>
            使用批量請求合併多個 eth_call 調用
          </li>
          <li className="flex items-start">
            <span className="text-blue-400 mr-2">•</span>
            監控每日使用量，在接近限制時收到警報
          </li>
          {breakdown.recommendedPlan !== breakdown.currentPlan && (
            <li className="flex items-start">
              <span className="text-blue-400 mr-2">•</span>
              考慮切換到{breakdown.recommendedPlan}以優化成本
            </li>
          )}
        </ul>
      </div>
    </div>
  );
};

export default RpcCostEstimator;