// SubgraphDiagnostics.tsx - 子圖診斷面板
import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { AnimatedButton } from '../ui/AnimatedButton';
import { testGraphQLSupport } from '../../utils/testGraphQL';
import { THE_GRAPH_API_URL, isGraphConfigured } from '../../config/graphConfig';

interface DiagnosticResult {
  configured: boolean;
  playerQuery: boolean;
  expeditionsQuery: boolean;
  partiesQuery: boolean;
  error: string | null;
}

export const SubgraphDiagnostics: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);

  const { data: diagnostics, isLoading, refetch } = useQuery({
    queryKey: ['subgraphDiagnostics'],
    queryFn: testGraphQLSupport,
    staleTime: 30 * 1000, // 30秒
    gcTime: 2 * 60 * 1000, // 2分鐘
  });

  const getStatusIcon = (success: boolean) => {
    return success ? (
      <CheckCircle className="w-4 h-4 text-green-400" />
    ) : (
      <XCircle className="w-4 h-4 text-red-400" />
    );
  };

  const getOverallStatus = () => {
    if (!diagnostics) return 'unknown';
    if (!diagnostics.configured) return 'error';
    if (diagnostics.error) return 'error';
    if (diagnostics.playerQuery && diagnostics.expeditionsQuery && diagnostics.partiesQuery) {
      return 'success';
    }
    return 'warning';
  };

  const overallStatus = getOverallStatus();

  return (
    <div className="fixed bottom-20 sm:bottom-4 right-4 z-50">
      {/* 狀態指示器 */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`p-3 rounded-full shadow-lg border transition-all ${
          overallStatus === 'success'
            ? 'bg-green-600 border-green-500 hover:bg-green-700'
            : overallStatus === 'warning'
            ? 'bg-yellow-600 border-yellow-500 hover:bg-yellow-700'
            : 'bg-red-600 border-red-500 hover:bg-red-700'
        }`}
        title="子圖診斷狀態"
      >
        {overallStatus === 'success' && <CheckCircle className="w-5 h-5 text-white" />}
        {overallStatus === 'warning' && <AlertCircle className="w-5 h-5 text-white" />}
        {overallStatus === 'error' && <XCircle className="w-5 h-5 text-white" />}
      </button>

      {/* 詳細面板 */}
      {isExpanded && (
        <div className="absolute bottom-16 right-0 w-80 bg-gray-800 border border-gray-700 rounded-lg shadow-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">子圖診斷</h3>
            <AnimatedButton
              onClick={() => refetch()}
              size="sm"
              variant="secondary"
              animationType="scale"
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </AnimatedButton>
          </div>

          <div className="space-y-3">
            {/* API 配置狀態 */}
            <div className="flex items-center justify-between p-2 bg-gray-700/50 rounded">
              <span className="text-sm text-gray-300">API 配置</span>
              <div className="flex items-center gap-2">
                {getStatusIcon(isGraphConfigured())}
                <span className="text-xs text-gray-400">
                  {isGraphConfigured() ? '已配置' : '未配置'}
                </span>
              </div>
            </div>

            {/* API URL */}
            <div className="p-2 bg-gray-700/50 rounded">
              <div className="text-xs text-gray-400 mb-1">API URL:</div>
              <div className="text-xs text-gray-300 font-mono break-all">
                {THE_GRAPH_API_URL || '未設置'}
              </div>
            </div>

            {diagnostics && (
              <>
                {/* 玩家查詢 */}
                <div className="flex items-center justify-between p-2 bg-gray-700/50 rounded">
                  <span className="text-sm text-gray-300">玩家查詢</span>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(diagnostics.playerQuery)}
                    <span className="text-xs text-gray-400">
                      {diagnostics.playerQuery ? '支援' : '不支援'}
                    </span>
                  </div>
                </div>

                {/* 遠征查詢 */}
                <div className="flex items-center justify-between p-2 bg-gray-700/50 rounded">
                  <span className="text-sm text-gray-300">遠征查詢</span>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(diagnostics.expeditionsQuery)}
                    <span className="text-xs text-gray-400">
                      {diagnostics.expeditionsQuery ? '支援' : '不支援'}
                    </span>
                  </div>
                </div>

                {/* 隊伍查詢 */}
                <div className="flex items-center justify-between p-2 bg-gray-700/50 rounded">
                  <span className="text-sm text-gray-300">隊伍查詢</span>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(diagnostics.partiesQuery)}
                    <span className="text-xs text-gray-400">
                      {diagnostics.partiesQuery ? '支援' : '不支援'}
                    </span>
                  </div>
                </div>

                {/* 錯誤信息 */}
                {diagnostics.error && (
                  <div className="p-2 bg-red-900/20 border border-red-600/30 rounded">
                    <div className="text-xs text-red-400 mb-1">錯誤:</div>
                    <div className="text-xs text-red-300">{diagnostics.error}</div>
                  </div>
                )}
              </>
            )}

            {isLoading && (
              <div className="text-center py-4">
                <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
                <div className="text-xs text-gray-400 mt-2">檢測中...</div>
              </div>
            )}
          </div>

          {/* 建議 */}
          {diagnostics && overallStatus !== 'success' && (
            <div className="mt-4 p-3 bg-blue-900/20 border border-blue-600/30 rounded">
              <div className="text-xs text-blue-400 mb-2">建議：</div>
              <div className="text-xs text-blue-300 space-y-1">
                {!diagnostics.configured && (
                  <p>• 檢查 The Graph API URL 配置</p>
                )}
                {diagnostics.error && (
                  <p>• 檢查網路連線和 API Key</p>
                )}
                {!diagnostics.playerQuery && (
                  <p>• Player 實體可能未在子圖中定義</p>
                )}
                {!diagnostics.expeditionsQuery && (
                  <p>• Expedition 實體可能未在子圖中定義</p>
                )}
                {!diagnostics.partiesQuery && (
                  <p>• Party 實體可能未在子圖中定義</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};