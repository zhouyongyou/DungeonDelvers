// 測試頁面：GraphQL Code Generator 功能驗證
import React from 'react';
import type { Page } from '../types/page';
import { TypedPlayerAnalytics } from '../components/test/TypedPlayerAnalytics';

const CodegenTestPage: Page = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* 頁面標題 */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent">
              GraphQL Code Generator 測試
            </h1>
            <p className="text-lg text-gray-300 mb-6">
              驗證類型安全的 GraphQL 查詢和自動生成的 TypeScript 類型
            </p>
            
            {/* 功能介紹 */}
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 mb-8">
              <h2 className="text-xl font-semibold mb-4 text-white">🚀 功能特點</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="bg-gray-700 p-4 rounded-lg">
                  <div className="text-blue-400 font-semibold mb-2">🛡️ 類型安全</div>
                  <div className="text-gray-300">
                    所有 GraphQL 查詢都有完整的 TypeScript 類型定義
                  </div>
                </div>
                <div className="bg-gray-700 p-4 rounded-lg">
                  <div className="text-green-400 font-semibold mb-2">⚡ 自動生成</div>
                  <div className="text-gray-300">
                    從實際的子圖 schema 自動生成類型，永遠保持同步
                  </div>
                </div>
                <div className="bg-gray-700 p-4 rounded-lg">
                  <div className="text-purple-400 font-semibold mb-2">💡 IDE 支援</div>
                  <div className="text-gray-300">
                    完整的自動補全、錯誤檢查和重構支援
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 測試組件 */}
          <TypedPlayerAnalytics />

          {/* 技術說明 */}
          <div className="mt-8 bg-gray-800 rounded-xl p-6 border border-gray-700">
            <h2 className="text-xl font-semibold mb-4 text-white">🔧 技術實現</h2>
            <div className="space-y-4 text-sm text-gray-300">
              <div>
                <span className="text-blue-400 font-semibold">Schema 來源:</span>
                <span className="ml-2 font-mono text-xs bg-gray-700 px-2 py-1 rounded">
                  去中心化 The Graph 網路端點
                </span>
              </div>
              <div>
                <span className="text-green-400 font-semibold">生成配置:</span>
                <span className="ml-2">TypeScript + TypeScript Operations</span>
              </div>
              <div>
                <span className="text-purple-400 font-semibold">查詢文件:</span>
                <span className="ml-2 font-mono text-xs bg-gray-700 px-2 py-1 rounded">
                  src/gql/player-analytics.graphql
                </span>
              </div>
              <div>
                <span className="text-orange-400 font-semibold">生成類型:</span>
                <span className="ml-2 font-mono text-xs bg-gray-700 px-2 py-1 rounded">
                  src/gql/generated.ts
                </span>
              </div>
            </div>

            <div className="mt-6 p-4 bg-green-900/20 border border-green-500/30 rounded-lg">
              <div className="text-green-400 font-semibold mb-2">✅ 驗證成功</div>
              <div className="text-sm text-gray-300">
                如果你能看到上方的玩家數據，就表示 GraphQL Code Generator 設置成功！
                <br />
                所有類型都是從實際的子圖 schema 自動生成，確保了完美的類型安全。
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

CodegenTestPage.displayName = 'CodegenTestPage';

export default CodegenTestPage;