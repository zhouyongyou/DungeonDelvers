// api/metadata/[...params].ts - Vercel Edge Function
// 路徑: /api/metadata/{contractAddress}/{tokenId}
// 或: /api/metadata/{contractAddress}/{tokenId}/svg

import { handleMetadataRequest } from '../../src/api/metadata-generator';

export const config = {
  runtime: 'edge',
};

export default async function handler(request: Request) {
  // 添加 CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  // 處理 OPTIONS 請求
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers });
  }

  // 處理 GET 請求
  if (request.method === 'GET') {
    const response = await handleMetadataRequest(request);
    
    // 添加 CORS headers 到響應
    const newHeaders = new Headers(response.headers);
    Object.entries(headers).forEach(([key, value]) => {
      newHeaders.set(key, value);
    });

    return new Response(response.body, {
      status: response.status,
      headers: newHeaders,
    });
  }

  return new Response('Method not allowed', { 
    status: 405, 
    headers 
  });
}