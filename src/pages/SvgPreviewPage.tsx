// src/pages/SvgPreviewPage.tsx
// SVG 預覽和診斷頁面

import React, { useState, useEffect } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { getContract } from '../config/contracts';
import { bsc } from 'wagmi/chains';
import { Buffer } from 'buffer';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

interface SvgPreviewProps {
  tokenId: string;
  contractType: 'hero' | 'relic' | 'party' | 'vip' | 'profile';
  chainId: number;
}

interface Metadata {
  name?: string;
  description?: string;
  image?: string;
  attributes?: Array<{ trait_type: string; value: string | number; display_type?: string }>;
}

interface ApiResponse {
  error?: string;
  [key: string]: unknown;
}

const SvgPreview: React.FC<SvgPreviewProps> = ({ tokenId, contractType, chainId }) => {
  const contract = getContract(chainId as 56, contractType === 'vip' ? 'vipStaking' : contractType === 'profile' ? 'playerProfile' : contractType);
  
  const { data: tokenURI, isLoading, isError, error } = useReadContract({
    ...contract,
    functionName: 'tokenURI',
    args: [BigInt(tokenId)],
    query: { 
      enabled: !!tokenId && !!contract && chainId === bsc.id 
    },
  });

  const [metadata, setMetadata] = useState<Metadata | null>(null);
  const [svgContent, setSvgContent] = useState<string>('');
  const [apiResponse, setApiResponse] = useState<ApiResponse | null>(null);

  // 解析 tokenURI
  useEffect(() => {
    if (!tokenURI) return;
    
    try {
      const uriString = typeof tokenURI === 'string' ? tokenURI : '';
      console.log(`${contractType} #${tokenId} tokenURI:`, uriString);
      
      let parsedMetadata = null;
      
      if (uriString.startsWith('data:application/json;base64,')) {
        const decodedUri = Buffer.from(uriString.substring('data:application/json;base64,'.length), 'base64').toString();
        parsedMetadata = JSON.parse(decodedUri);
      } else if (uriString.startsWith('http')) {
        // 如果是 HTTP URL，直接使用
        parsedMetadata = { image: uriString };
      } else {
        try {
          const decoded = Buffer.from(uriString, 'base64').toString();
          parsedMetadata = JSON.parse(decoded);
        } catch {
          console.error('無法解析 tokenURI:', uriString);
        }
      }
      
      setMetadata(parsedMetadata);
      
      if (parsedMetadata?.image) {
        if (parsedMetadata.image.startsWith('data:image/svg+xml;base64,')) {
          const svgBase64 = parsedMetadata.image.substring('data:image/svg+xml;base64,'.length);
          setSvgContent(Buffer.from(svgBase64, 'base64').toString());
        } else if (parsedMetadata.image.startsWith('data:image/svg+xml')) {
          setSvgContent(Buffer.from(parsedMetadata.image.substring('data:image/svg+xml;base64,'.length), 'base64').toString());
        }
      }
    } catch (e) {
      console.error(`解析 ${contractType} #${tokenId} 失敗:`, e);
    }
  }, [tokenURI, contractType, tokenId]);

  // 測試 API 端點
  const testApiEndpoint = async () => {
    if (!tokenURI || !tokenURI.toString().startsWith('http')) return;
    
    try {
      const response = await fetch(tokenURI.toString());
      const data = await response.json();
      setApiResponse(data);
      console.log(`API 回應 (${contractType} #${tokenId}):`, data);
    } catch (e) {
      console.error(`API 測試失敗 (${contractType} #${tokenId}):`, e);
      setApiResponse({ error: e instanceof Error ? e.message : String(e) });
    }
  };

  useEffect(() => {
    testApiEndpoint();
  }, [tokenURI, contractType, tokenId]);

  if (isLoading) return <div className="p-4 bg-gray-900/50 rounded-xl"><LoadingSpinner /></div>;
  if (isError) return <div className="p-4 bg-red-900/20 rounded-xl text-red-400">錯誤: {error?.message}</div>;

  return (
    <div className="space-y-4 p-4 bg-gray-900/30 rounded-xl">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">
          {contractType.toUpperCase()} #{tokenId}
        </h3>
        <div className="text-sm text-gray-400">
          {contract?.address}
        </div>
      </div>
      
      {/* TokenURI 顯示 */}
      <div className="bg-gray-800/50 p-3 rounded-lg">
        <div className="text-sm text-gray-300 mb-2">TokenURI:</div>
        <div className="text-xs text-gray-400 break-all font-mono">
          {tokenURI?.toString() || '無'}
        </div>
      </div>

      {/* Metadata 顯示 */}
      {metadata && (
        <div className="bg-gray-800/50 p-3 rounded-lg">
          <div className="text-sm text-gray-300 mb-2">Metadata:</div>
          <pre className="text-xs text-gray-400 overflow-auto max-h-32">
            {JSON.stringify(metadata, null, 2)}
          </pre>
        </div>
      )}

      {/* API 回應 */}
      {apiResponse && (
        <div className="bg-gray-800/50 p-3 rounded-lg">
          <div className="text-sm text-gray-300 mb-2">API 回應:</div>
          <pre className="text-xs text-gray-400 overflow-auto max-h-32">
            {JSON.stringify(apiResponse, null, 2)}
          </pre>
        </div>
      )}

      {/* SVG 預覽 */}
      <div className="bg-gray-800/50 p-3 rounded-lg">
        <div className="text-sm text-gray-300 mb-2">SVG 預覽:</div>
        {metadata?.image ? (
          <div className="aspect-square bg-white rounded-lg overflow-hidden">
            {metadata.image.startsWith('data:image/svg+xml;base64,') ? (
              <img 
                src={metadata.image} 
                alt={`${contractType} #${tokenId}`} 
                className="w-full h-full object-contain"
                onError={(e) => console.error('SVG 載入失敗:', e)}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-500">
                非 SVG 格式
              </div>
            )}
          </div>
        ) : (
          <div className="aspect-square bg-gray-700 rounded-lg flex items-center justify-center text-gray-500">
            無圖片
          </div>
        )}
      </div>

      {/* SVG 原始碼 */}
      {svgContent && (
        <div className="bg-gray-800/50 p-3 rounded-lg">
          <div className="text-sm text-gray-300 mb-2">SVG 原始碼:</div>
          <pre className="text-xs text-gray-400 overflow-auto max-h-32">
            {svgContent}
          </pre>
        </div>
      )}
    </div>
  );
};

const SvgPreviewPage: React.FC = () => {
  const { chainId } = useAccount();
  const [selectedType, setSelectedType] = useState<'hero' | 'relic' | 'party' | 'vip' | 'profile'>('hero');
  const [tokenIds, setTokenIds] = useState<string[]>(['1', '2', '3']);

  const addTokenId = () => {
    setTokenIds([...tokenIds, (tokenIds.length + 1).toString()]);
  };

  const removeTokenId = (index: number) => {
    setTokenIds(tokenIds.filter((_, i) => i !== index));
  };

  const updateTokenId = (index: number, value: string) => {
    const newTokenIds = [...tokenIds];
    newTokenIds[index] = value;
    setTokenIds(newTokenIds);
  };

  if (!chainId || chainId !== bsc.id) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center text-red-400">
          請連接到 BSC 主網以使用此功能
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-4">SVG 預覽和診斷工具</h1>
        <p className="text-gray-400">
          此工具可以幫助診斷 NFT SVG 顯示問題，包括 tokenURI 解析、metadata 檢查和 SVG 預覽。
        </p>
      </div>

      {/* 控制面板 */}
      <div className="mb-6 p-4 bg-gray-900/50 rounded-xl">
        <div className="flex flex-wrap gap-4 items-center">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">NFT 類型</label>
            <select 
              value={selectedType} 
              onChange={(e) => setSelectedType(e.target.value as 'hero' | 'relic' | 'party' | 'vip' | 'profile')}
              className="bg-gray-800 text-white px-3 py-2 rounded-lg border border-gray-600"
            >
              <option value="hero">Hero</option>
              <option value="relic">Relic</option>
              <option value="party">Party</option>
              <option value="vip">VIP</option>
              <option value="profile">Profile</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Token IDs</label>
            <div className="flex gap-2">
              {tokenIds.map((id, index) => (
                <div key={index} className="flex items-center gap-1">
                  <input
                    type="text"
                    value={id}
                    onChange={(e) => updateTokenId(index, e.target.value)}
                    className="w-16 bg-gray-800 text-white px-2 py-1 rounded border border-gray-600 text-center"
                  />
                  <button
                    onClick={() => removeTokenId(index)}
                    className="text-red-400 hover:text-red-300"
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                onClick={addTokenId}
                className="text-blue-400 hover:text-blue-300"
              >
                +
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* SVG 預覽列表 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {tokenIds.map((tokenId) => (
          <SvgPreview
            key={`${selectedType}-${tokenId}`}
            tokenId={tokenId}
            contractType={selectedType}
            chainId={chainId}
          />
        ))}
      </div>

      {/* 診斷資訊 */}
      <div className="mt-8 p-4 bg-blue-900/20 rounded-xl">
        <h3 className="text-lg font-semibold text-blue-300 mb-2">常見問題診斷</h3>
        <ul className="text-sm text-gray-300 space-y-1">
          <li>• <strong>TokenURI 為空:</strong> 合約 baseURI 未設定</li>
          <li>• <strong>API 回應錯誤:</strong> Metadata server 問題或端點錯誤</li>
          <li>• <strong>SVG 顯示失敗:</strong> SVG 格式錯誤或 base64 解碼問題</li>
          <li>• <strong>所有 NFT 顯示相同:</strong> Subgraph 未同步或 fallback 機制觸發</li>
        </ul>
      </div>
    </div>
  );
};

export default SvgPreviewPage; 