import React from 'react';
import { useAccount, useClient, useSwitchChain } from 'wagmi';
import { bsc, bscTestnet } from 'wagmi/chains';
import { ActionButton } from '../ui/ActionButton';

export const Footer: React.FC = () => {
  const { chain } = useAccount();
  const client = useClient();
  const { chains, switchChain, isPending } = useSwitchChain();

  const rpcUrl = client?.chain.rpcUrls.default.http[0] ?? 'N/A';
  
  const handleSwitchNetwork = () => {
    if (!switchChain) return;
    const targetChainId = chain?.id === bsc.id ? bscTestnet.id : bsc.id;
    switchChain({ chainId: targetChainId });
  };
  
  return (
    <footer className="bg-[#1F1D36] text-gray-300 mt-auto">
      <div className="bg-gray-800 text-white text-xs">
        <div className="container mx-auto px-4 py-1 flex justify-between items-center text-xs">
          <span>
            網路: <span className={`font-bold ${chain?.nativeCurrency.name === 'BNB' ? 'text-yellow-400' : 'text-green-400'}`}>
              {chain?.name ?? '未連接'}
            </span>
          </span>
          {/* 【細節還原】顯示當前節點 URL */}
          <span className="hidden md:inline-block truncate">
            當前節點: {rpcUrl}
          </span>
          <span>狀態: <span className="text-green-400">●</span> 正常</span>
          {/* 【細節還原】新增網路切換按鈕 */}
          <ActionButton onClick={handleSwitchNetwork} isLoading={isPending} className="px-2 py-0.5 h-5 text-xs rounded-md !bg-sky-600 hover:!bg-sky-700">
            切換網路
          </ActionButton>
        </div>
      </div>

      <div className="container mx-auto text-center py-4">
        <div className="flex justify-center items-center gap-4 mb-4">
          <a href="https://twitter.com/your-twitter-handle" target="_blank" rel="noreferrer" className="flex items-center justify-center w-8 h-8 bg-[#1DA1F2] rounded-full transition-transform hover:scale-110" aria-label="Twitter"><svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.71v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84"></path></svg></a>
          <a href="https://t.me/soulshard_BSC" target="_blank" rel="noreferrer" className="w-8 h-8 transition-transform hover:scale-110" aria-label="Telegram"><svg viewBox="0 0 240 240"><defs><linearGradient id="telegram-gradient" x1="120" y1="240" x2="120" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#1d93d2"/><stop offset="1" stop-color="#38b0e3"/></linearGradient></defs><circle cx="120" cy="120" r="120" fill="url(#telegram-gradient)"/><path d="M81.229,128.772l14.237,39.406s1.78,3.687,3.686,3.687,30.255-29.492,30.255-29.492l31.525-60.89L81.737,118.6Z" fill="#c8daea"/><path d="M100.106,138.878l-2.733,29.046s-1.144,8.9,7.754,0,17.415-15.763,17.415-15.763" fill="#a9c6d8"/><path d="M81.486,130.178,52.2,120.636s-3.5-1.42-2.373-4.64c.232-.664.7-1.229,2.1-2.2,6.489-4.523,120.106-45.36,120.106-45.36s3.208-1.081,5.1-.362a2.766,2.766,0,0,1,1.885,2.055,9.357,9.357,0,0,1,.254,2.585c-.009.752-.1,1.449-.169,2.542-.692,11.165-21.4,94.493-21.4,94.493s-1.239,4.876-5.678,5.043A8.13,8.13,0,0,1,146.1,172.5c-8.711-7.493-38.819-27.727-45.472-32.177a1.27,1.27,0,0,1-.546-.9c-.093-.469.417-1.05.417-1.05s52.426-46.6,53.821-51.492c.108-.379-.3-.566-.848-.4-3.482,1.281-63.844,39.4-70.506,43.607A3.21,3.21,0,0,1,81.486,130.178Z" fill="#fff"/></svg></a>
          <a href="https://dexscreener.com/bsc/YOUR_TOKEN_PAIR_ADDRESS" target="_blank" rel="noreferrer" className="flex items-center justify-center w-8 h-8 bg-gray-800 rounded-full transition-transform hover:scale-110 p-1.5" aria-label="DexScreener"><svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" fill="#fff" fill-rule="evenodd" viewBox="0 0 252 300"><path d="M151.818 106.866c9.177-4.576 20.854-11.312 32.545-20.541 2.465 5.119 2.735 9.586 1.465 13.193-.9 2.542-2.596 4.753-4.826 6.512-2.415 1.901-5.431 3.285-8.765 4.033-6.326 1.425-13.712.593-20.419-3.197m1.591 46.886l12.148 7.017c-24.804 13.902-31.547 39.716-39.557 64.859-8.009-25.143-14.753-50.957-39.556-64.859l12.148-7.017a5.95 5.95 0 003.84-5.845c-1.113-23.547 5.245-33.96 13.821-40.498 3.076-2.342 6.434-3.518 9.747-3.518s6.671 1.176 9.748 3.518c8.576 6.538 14.934 16.951 13.821 40.498a5.95 5.95 0 003.84 5.845zM126 0c14.042.377 28.119 3.103 40.336 8.406 8.46 3.677 16.354 8.534 23.502 14.342 3.228 2.622 5.886 5.155 8.814 8.071 7.897.273 19.438-8.5 24.796-16.709-9.221 30.23-51.299 65.929-80.43 79.589-.012-.005-.02-.012-.029-.018-5.228-3.992-11.108-5.988-16.989-5.988s-11.76 1.996-16.988 5.988c-.009.005-.017.014-.029.018-29.132-13.66-71.209-49.359-80.43-79.589 5.357 8.209 16.898 16.982 24.795 16.709 2.929-2.915 5.587-5.449 8.814-8.071C69.31 16.94 77.204 12.083 85.664 8.406 97.882 3.103 111.959.377 126 0m-25.818 106.866c-9.176-4.576-20.854-11.312-32.544-20.541-2.465 5.119-2.735 9.586-1.466 13.193.901 2.542 2.597 4.753 4.826 6.512 2.416 1.901 5.432 3.285 8.766 4.033 6.326 1.425 13.711.593 20.418-3.197"></path><path d="M197.167 75.016c6.436-6.495 12.107-13.684 16.667-20.099l2.316 4.359c7.456 14.917 11.33 29.774 11.33 46.494l-.016 26.532.14 13.754c.54 33.766 7.846 67.929 24.396 99.193l-34.627-27.922-24.501 39.759-25.74-24.231L126 299.604l-41.132-66.748-25.739 24.231-24.501-39.759L0 245.25c16.55-31.264 23.856-65.427 24.397-99.193l.14-13.754-.016-26.532c0-16.721 3.873-31.578 11.331-46.494l2.315-4.359c4.56 6.415 10.23 13.603 16.667 20.099l-2.01 4.175c-3.905 8.109-5.198 17.176-2.156 25.799 1.961 5.554 5.54 10.317 10.154 13.953 4.48 3.531 9.782 5.911 15.333 7.161 3.616.814 7.3 1.149 10.96 1.035-.854 4.841-1.227 9.862-1.251 14.978L53.2 160.984l25.206 14.129a41.926 41.926 0 015.734 3.869c20.781 18.658 33.275 73.855 41.861 100.816 8.587-26.961 21.08-82.158 41.862-100.816a41.865 41.865 0 015.734-3.869l25.206-14.129-32.665-18.866c-.024-5.116-.397-10.137-1.251-14.978 3.66.114 7.344-.221 10.96-1.035 5.551-1.25 10.854-3.63 15.333-7.161 4.613-3.636 8.193-8.399 10.153-13.953 3.043-8.623 1.749-17.689-2.155-25.799l-2.01-4.175z"></path></svg></a>
          <a href="https://four.meme/" target="_blank" rel="noreferrer" className="flex items-center justify-center w-8 h-8 bg-gray-800 rounded-full transition-transform hover:scale-110" aria-label="FOUR MEME"><img src="https://www.soulshard.fun/assets/images/FOUR-logo4.png" alt="FOUR MEME Logo" className="w-7 h-7 rounded-full"/></a>
          <a href="https://pancakeswap.finance/" target="_blank" rel="noreferrer" className="flex items-center justify-center w-8 h-8 rounded-full transition-transform hover:scale-110" aria-label="PancakeSwap"><svg width="100%" height="100%" viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="48" cy="48" r="48" fill="url(#paint0_linear_10493:36952)"></circle><path fill-rule="evenodd" clip-rule="evenodd" d="M47.8581 79.8749C38.5164 79.8678 30.9915 77.6262 25.7338 73.5999C20.413 69.5252 17.5903 63.7429 17.5903 57.2001C17.5903 50.8957 20.4068 46.3497 23.5936 43.2769C26.0911 40.8688 28.8471 39.3265 30.7661 38.4394C30.3322 37.1076 29.7907 35.364 29.3063 33.5632C28.6582 31.1534 28.0223 28.3261 28.0223 26.2543C28.0223 23.802 28.557 21.3392 29.9986 19.4255C31.5217 17.4037 33.8146 16.3206 36.5731 16.3206C38.7289 16.3206 40.5593 17.1202 41.9922 18.4998C43.3619 19.8184 44.2735 21.5697 44.9029 23.3952C46.0089 26.6029 46.4396 30.633 46.5604 34.6548H49.2026C49.3234 30.633 49.754 26.6029 50.8601 23.3952C51.4895 21.5697 52.4011 19.8184 53.7708 18.4998C55.2037 17.1202 57.034 16.3206 59.1899 16.3206C61.9484 16.3206 64.2413 17.4037 65.7644 19.4255C67.206 21.3392 67.7407 23.802 67.7407 26.2543C67.7407 28.3261 67.1048 31.1534 66.4566 33.5632C65.9722 35.364 65.4308 37.1076 64.9968 38.4394C66.9159 39.3265 69.6719 40.8688 72.1693 43.2769C75.3562 46.3497 78.1726 50.8957 78.1726 57.2001C78.1726 63.7429 75.35 69.5252 70.0292 73.5999C64.7715 77.6262 57.2466 79.8678 47.9049 79.8749H47.8581Z" fill="#633001"></path><path d="M36.573 18.6528C32.5327 18.6528 30.6729 21.6977 30.6729 25.9088C30.6729 29.2559 32.8339 35.9594 33.7205 38.569C33.9199 39.1559 33.6065 39.799 33.0351 40.0266C29.797 41.3164 20.241 46.039 20.241 56.8546C20.241 68.2477 29.952 76.838 47.86 76.8516C47.8671 76.8516 47.8742 76.8516 47.8814 76.8516C47.8885 76.8516 47.8956 76.8516 47.9028 76.8516C65.8107 76.838 75.5218 68.2477 75.5218 56.8546C75.5218 46.039 65.9658 41.3164 62.7277 40.0266C62.1562 39.799 61.8429 39.1559 62.0423 38.569C62.9289 35.9594 65.0898 29.2559 65.0898 25.9088C65.0898 21.6977 63.23 18.6528 59.1898 18.6528C53.374 18.6528 51.9243 26.9751 51.8209 35.907C51.814 36.5033 51.3368 36.9871 50.7465 36.9871H45.0163C44.4259 36.9871 43.9488 36.5033 43.9419 35.907C43.8385 26.9751 42.3887 18.6528 36.573 18.6528Z" fill="#D1884F"></path><path d="M47.9028 73.202C34.7449 73.202 20.2637 66.0868 20.241 56.8762C20.241 56.8906 20.241 56.905 20.241 56.9193C20.241 68.3216 29.9675 76.9164 47.9028 76.9164C65.838 76.9164 75.5645 68.3216 75.5645 56.9193C75.5645 56.905 75.5645 56.8906 75.5645 56.8762C75.5418 66.0868 61.0607 73.202 47.9028 73.202Z" fill="#FEDC90"></path><path d="M40.5919 54.0472C40.5919 57.1569 39.1371 58.7765 37.3426 58.7765C35.548 58.7765 34.0933 57.1569 34.0933 54.0472C34.0933 50.9375 35.548 49.3179 37.3426 49.3179C39.1371 49.3179 40.5919 50.9375 40.5919 54.0472Z" fill="#633001"></path><path d="M61.7122 54.0472C61.7122 57.1569 60.2575 58.7765 58.4629 58.7765C56.6684 58.7765 55.2136 57.1569 55.2136 54.0472C55.2136 50.9375 56.6684 49.3179 58.4629 49.3179C60.2575 49.3179 61.7122 50.9375 61.7122 54.0472Z" fill="#633001"></path><defs><linearGradient id="paint0_linear_10493:36952" x1="48" y1="0" x2="48" y2="96" gradientUnits="userSpaceOnUse"><stop stop-color="#53DEE9"></stop><stop offset="1" stop-color="#1FC7D4"></stop></linearGradient></defs></svg></a>
          {/* 【細節還原】新增 GitBook 圖示 (暫用文字替代) */}
          <a href="YOUR_GITBOOK_URL" target="_blank" rel="noreferrer" className="flex items-center justify-center w-8 h-8 bg-gray-600 rounded-full transition-transform hover:scale-110" aria-label="GitBook">
            <span className="font-bold text-lg">G</span>
          </a>
        </div>
        <p className="text-xs">&copy; {new Date().getFullYear()} Dungeon Delvers. All Rights Reserved.</p>
      </div>
    </footer>
  );
};