// src/components/ui/EmptyState.tsx

import React, { type ReactNode } from 'react';

// ★ 修正：擴充 props 型別，使其可以接收 children
interface EmptyStateProps {
  message: string;
  children?: ReactNode; // 允許傳入子元件
}

export const EmptyState: React.FC<EmptyStateProps> = ({ message, children }) => (
  <div className="text-center py-10 px-4 card-bg rounded-xl">
    <p className="text-gray-500 mb-4">{message}</p>
    {/* ★ 修正：渲染傳入的 children */}
    {children}
  </div>
);
