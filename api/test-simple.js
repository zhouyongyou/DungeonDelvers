// 簡單的測試端點，用 JavaScript 而不是 TypeScript
export default function handler(req, res) {
  const envKeys = Object.keys(process.env)
    .filter(key => key.includes('ALCHEMY') || key.includes('VITE_'))
    .sort();

  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url,
    envCount: envKeys.length,
    envKeys: envKeys,
    // 顯示 API key 的存在狀態（不顯示值）
    alchemyKeys: {
      ALCHEMY_API_KEY_1: !!process.env.ALCHEMY_API_KEY_1,
      ALCHEMY_API_KEY_2: !!process.env.ALCHEMY_API_KEY_2,
      ALCHEMY_API_KEY_3: !!process.env.ALCHEMY_API_KEY_3,
      ALCHEMY_API_KEY_4: !!process.env.ALCHEMY_API_KEY_4,
      ALCHEMY_API_KEY_5: !!process.env.ALCHEMY_API_KEY_5,
      VITE_ALCHEMY_KEY_PUBLIC: !!process.env.VITE_ALCHEMY_KEY_PUBLIC,
    },
    viteConfig: {
      VITE_USE_RPC_PROXY: process.env.VITE_USE_RPC_PROXY || 'not set'
    }
  });
}