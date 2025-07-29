import React from 'react';
import { AdminPage } from './AdminPage';
import { useAccount, useReadContract } from 'wagmi';
import { getContract } from '../config/contracts';
import { EmptyState } from '../components/ui/EmptyState';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

// 包裝 AdminPage，添加權限檢查
export const AdminPageFixed: React.FC = () => {
  const { address } = useAccount();
  const dungeonMasterContract = getContract('DUNGEONMASTER');

  // 檢查是否為管理員
  const { data: owner, isLoading } = useReadContract({
    address: dungeonMasterContract?.address,
    abi: dungeonMasterContract?.abi,
    functionName: 'owner',
    query: {
      enabled: !!address && !!dungeonMasterContract
    }
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  // 如果不是管理員，顯示提示
  if (owner && address && owner.toLowerCase() !== address.toLowerCase()) {
    return (
      <EmptyState 
        message="此頁面僅限合約管理員訪問" 
        subMessage={`當前管理員: ${owner}`}
      />
    );
  }

  // 是管理員，載入完整的 AdminPage
  return <AdminPage />;
};

export default AdminPageFixed;