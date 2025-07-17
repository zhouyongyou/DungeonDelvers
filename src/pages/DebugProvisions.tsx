// 臨時診斷頁面
import React, { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { debugProvisionsPurchase } from '../utils/debugProvisions';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

const DebugProvisions: React.FC = () => {
  const { address } = useAccount();
  const [debugging, setDebugging] = useState(false);
  const [result, setResult] = useState<string>('');

  const runDebug = async () => {
    if (!address) return;
    
    setDebugging(true);
    setResult('');
    
    // 捕獲 console.log 輸出
    const logs: string[] = [];
    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;
    
    console.log = (...args) => {
      logs.push(args.join(' '));
      originalLog(...args);
    };
    console.warn = (...args) => {
      logs.push('⚠️ ' + args.join(' '));
      originalWarn(...args);
    };
    console.error = (...args) => {
      logs.push('❌ ' + args.join(' '));
      originalError(...args);
    };
    
    try {
      await debugProvisionsPurchase(1n, address, 1);
      setResult(logs.join('\n'));
    } catch (error) {
      setResult('診斷過程發生錯誤: ' + error);
    } finally {
      console.log = originalLog;
      console.warn = originalWarn;
      console.error = originalError;
      setDebugging(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">儲備購買診斷工具</h2>
      
      <div className="mb-4">
        <button
          onClick={runDebug}
          disabled={debugging || !address}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {debugging ? <LoadingSpinner size="h-4 w-4" /> : '運行診斷'}
        </button>
        {!address && <p className="text-red-500 mt-2">請先連接錢包</p>}
      </div>
      
      {result && (
        <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
          {result}
        </pre>
      )}
    </div>
  );
};

export default DebugProvisions;