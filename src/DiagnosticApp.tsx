// 診斷版 App - 用於逐個測試問題組件
import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';

// 逐個導入可能有問題的組件和 hooks
import { useMobileOptimization } from './hooks/useMobileOptimization';
import { usePrefetchOnHover } from './hooks/usePagePrefetch';
import { preloadCriticalImages, setupSmartPreloading } from './utils/imagePreloadStrategy';
import { quickDiagnose } from './utils/simpleDiagnostics';

// 組件狀態追蹤
const ComponentStatus = ({ name, status, error }: { name: string; status: string; error?: string }) => (
  <div className={`p-2 rounded ${status === 'error' ? 'bg-red-900' : status === 'loading' ? 'bg-yellow-900' : 'bg-green-900'}`}>
    <strong>{name}:</strong> {status}
    {error && <div className="text-xs mt-1">{error}</div>}
  </div>
);

function DiagnosticApp() {
  const { address, isConnected } = useAccount();
  const [componentStatuses, setComponentStatuses] = useState<Record<string, { status: string; error?: string }>>({});
  const [enabledComponents, setEnabledComponents] = useState<Record<string, boolean>>({
    useMobileOptimization: false,
    usePrefetchOnHover: false,
    imagePreloading: false,
    quickDiagnose: false,
    lazyPages: false,
    header: false,
    footer: false,
    errorBoundaries: false,
    transactionWatcher: false,
    performanceDashboard: false
  });

  // 更新組件狀態
  const updateStatus = (name: string, status: string, error?: string) => {
    setComponentStatuses(prev => ({ ...prev, [name]: { status, error: error?.toString() } }));
  };

  // 始終調用 Hooks（React 規則要求）
  let mobileData = null;
  let prefetchData = null;
  
  try {
    mobileData = useMobileOptimization();
  } catch (error) {
    console.warn('useMobileOptimization error:', error);
  }
  
  try {
    prefetchData = usePrefetchOnHover();
  } catch (error) {
    console.warn('usePrefetchOnHover error:', error);
  }

  // 根據啟用狀態處理結果
  const mobileOptimizationResult = enabledComponents.useMobileOptimization && mobileData
    ? `success - isMobile: ${mobileData.isMobile}`
    : enabledComponents.useMobileOptimization
    ? 'error: Hook failed'
    : null;

  const prefetchResult = enabledComponents.usePrefetchOnHover && prefetchData
    ? 'success'
    : enabledComponents.usePrefetchOnHover
    ? 'error: Hook failed'
    : null;

  // 測試圖片預加載
  const testImagePreloading = () => {
    try {
      if (enabledComponents.imagePreloading) {
        updateStatus('imagePreloading', 'loading');
        setTimeout(() => {
          preloadCriticalImages();
          setupSmartPreloading();
          updateStatus('imagePreloading', 'success');
        }, 100);
      }
    } catch (error) {
      updateStatus('imagePreloading', 'error', error?.toString());
    }
  };

  // 測試診斷工具
  const testQuickDiagnose = () => {
    try {
      if (enabledComponents.quickDiagnose) {
        updateStatus('quickDiagnose', 'loading');
        quickDiagnose();
        updateStatus('quickDiagnose', 'success - 查看控制台');
      }
    } catch (error) {
      updateStatus('quickDiagnose', 'error', error?.toString());
    }
  };

  // 執行測試
  useEffect(() => {
    testMobileOptimization();
  }, [enabledComponents.useMobileOptimization]);

  useEffect(() => {
    testPrefetchOnHover();
  }, [enabledComponents.usePrefetchOnHover]);

  useEffect(() => {
    testImagePreloading();
  }, [enabledComponents.imagePreloading]);

  useEffect(() => {
    testQuickDiagnose();
  }, [enabledComponents.quickDiagnose]);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <h1 className="text-3xl font-bold mb-6">🔧 DungeonDelvers 診斷模式</h1>
      
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">基本狀態</h2>
        <div className="bg-gray-800 p-4 rounded">
          <p>錢包連接: {isConnected ? `已連接 ${address}` : '未連接'}</p>
          <p>時間: {new Date().toLocaleTimeString()}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <h2 className="text-xl font-semibold mb-4">組件開關</h2>
          <div className="space-y-2">
            {Object.entries(enabledComponents).map(([key, enabled]) => (
              <label key={key} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => setEnabledComponents(prev => ({ ...prev, [key]: e.target.checked }))}
                  className="w-4 h-4"
                />
                <span>{key}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">組件狀態</h2>
          <div className="space-y-2">
            {Object.entries(componentStatuses).map(([name, { status, error }]) => (
              <ComponentStatus key={name} name={name} status={status} error={error} />
            ))}
          </div>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">診斷建議</h2>
        <div className="bg-gray-800 p-4 rounded space-y-2">
          <p>1. 逐個啟用組件開關</p>
          <p>2. 觀察哪個組件導致頁面卡死</p>
          <p>3. 檢查控制台錯誤信息</p>
          <p>4. 記錄問題組件和錯誤信息</p>
        </div>
      </div>
    </div>
  );
}

export default DiagnosticApp;