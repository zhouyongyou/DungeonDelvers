// src/components/MintPrice.tsx

import { useQuery, gql } from '@apollo/client';

// 定義您的 GraphQL 查詢語句
// 這裡的 `config` 和 `mintPrice` 需對應您在 Subgraph 中定義的 Entity 和欄位
const GET_MINT_PRICE = gql`
  query GetMintPrice {
    config(id: "main-config") {
      id
      mintPrice
    }
  }
`;

const MintPrice = () => {
  // useQuery hook 會自動處理請求、載入、錯誤和資料更新
  const { loading, error, data } = useQuery(GET_MINT_PRICE);

  // 處理載入中狀態
  if (loading) {
    return <div>讀取價格中...</div>;
  }

  // 處理錯誤狀態
  if (error) {
    return <div style={{ color: 'red' }}>讀取失敗: {error.message}</div>;
  }

  // 從 data 中提取價格 (注意路徑可能因您的 schema 而異)
  // 這裡我們需要將價格從 wei 轉換為 ETH
  const priceInWei = data?.config?.mintPrice;
  const priceInEth = priceInWei ? parseFloat(priceInWei) / 1e18 : null;


  return (
    <div>
      <h2>當前鑄造價格</h2>
      <p>{priceInEth !== null ? `${priceInEth.toFixed(4)} ETH` : '暫無價格資訊'}</p>
    </div>
  );
};

export default MintPrice;