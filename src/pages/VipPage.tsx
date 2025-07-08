VIP 偵錯版本

// src/pages/VipPage.tsx

import { useVipStatus } from '@/hooks/useVipStatus';
import { NftMetadata } from '@/types/nft';
import { useMemo, useEffect } from 'react'; // 引入 useEffect
import PageLoader from '@/components/ui/LoadingSpinner';

// ... 其他 imports ...

const VipPage = () => {
  const { data: vipStatus, isLoading, error } = useVipStatus();

  if (isLoading) {
    return <PageLoader />;
  }

  if (error || !vipStatus || !vipStatus.hasVip) {
    return (
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-4">VIP Club</h2>
        <p>您尚未擁有 VIP 卡，或載入您的 VIP 狀態時發生錯誤。</p>
        <p className="text-sm text-gray-400 mt-2">{error?.message}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 flex flex-col items-center">
      <h1 className="text-3xl font-bold mb-6">VIP Club</h1>
      <p className="mb-8 text-center text-gray-400">這是您專屬的 VIP 卡，它會根據您質押的 $SOUL 價值提供遊戲內加成。</p>
      
      <VipCardDisplay metadata={vipStatus.metadata} />

      <div className="mt-8 p-6 bg-gray-800/50 rounded-lg shadow-lg w-full max-w-md">
        <h3 className="text-xl font-bold mb-4">當前狀態</h3>
        <div className="space-y-2">
          <p><strong>VIP 等級:</strong> {vipStatus.level}</p>
          <p><strong>成功率加成:</strong> +{vipStatus.level}%</p>
          <p><strong>質押的 $SOUL 價值:</strong> ${vipStatus.stakedValueUSD.toFixed(2)} USD</p>
        </div>
      </div>
    </div>
  );
};

const VipCardDisplay = ({ metadata }: { metadata: NftMetadata | null }) => {
  
  // ★★★【偵錯點】★★★
  // 我們在這裡加入一個 useEffect，它會在 metadata 變動時，
  // 將接收到的原始 metadata 印在瀏覽器的 console 中。
  useEffect(() => {
    console.log("收到的 VIP 卡 metadata:", metadata);
    if (metadata) {
      console.log("收到的 metadata.image 欄位:", metadata.image);
    }
  }, [metadata]);


  const svgImage = useMemo(() => {
    if (!metadata?.image) {
      console.log("無法生成 SVG：metadata 或 metadata.image 不存在。");
      return null;
    }
    try {
      const base64String = metadata.image.split(',')[1];
      if (!base64String) {
        console.log("無法生成 SVG：無法從 image 欄位中提取 Base64 字串。");
        return null;
      }
      return atob(base64String);
    } catch (error) {
      console.error("解析 VIP 卡 SVG 失敗:", error);
      return null;
    }
  }, [metadata]);

  if (!svgImage) {
    return (
      <div className="w-full max-w-md aspect-square bg-gray-700 rounded-lg flex items-center justify-center">
        <p className="text-gray-400">正在載入 VIP 卡片...</p>
      </div>
    );
  }

  return (
    <div
      className="w-full max-w-md aspect-square"
      dangerouslySetInnerHTML={{ __html: svgImage }}
    />
  );
};

export default VipPage;

