import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 只在非生產環境提供調試信息
  if (process.env.NODE_ENV === 'production' && !req.headers['x-debug-token']) {
    return res.status(404).json({ error: 'Not found' });
  }

  const alchemyKeys = Object.keys(process.env)
    .filter(key => key.includes('ALCHEMY'))
    .map(key => ({
      name: key,
      exists: !!process.env[key],
      length: process.env[key]?.length || 0,
      preview: process.env[key] ? `${process.env[key].substring(0, 5)}...${process.env[key].substring(process.env[key].length - 5)}` : 'undefined'
    }));

  const viteKeys = Object.keys(process.env)
    .filter(key => key.startsWith('VITE_'))
    .map(key => ({
      name: key,
      value: key === 'VITE_USE_RPC_PROXY' ? process.env[key] : 'hidden'
    }));

  res.status(200).json({
    status: 'debug',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'unknown',
    vercelEnv: process.env.VERCEL_ENV || 'unknown',
    alchemyKeys: {
      count: alchemyKeys.length,
      keys: alchemyKeys
    },
    viteConfig: {
      count: viteKeys.length,
      keys: viteKeys
    },
    rpcOptimized: {
      hasHandler: true,
      path: req.url,
      method: req.method
    }
  });
}