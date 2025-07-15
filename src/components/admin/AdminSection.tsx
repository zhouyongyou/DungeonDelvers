import React, { useState, useEffect } from 'react';
import type { ReactNode } from 'react';

interface AdminSectionProps {
  title: string;
  children: ReactNode;
  defaultExpanded?: boolean;
  onExpand?: () => void;
  isLoading?: boolean;
}

const AdminSection: React.FC<AdminSectionProps> = ({ 
  title, 
  children, 
  defaultExpanded = false, // 默認收起
  onExpand,
  isLoading = false 
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [hasBeenExpanded, setHasBeenExpanded] = useState(defaultExpanded);

  useEffect(() => {
    if (isExpanded && !hasBeenExpanded) {
      setHasBeenExpanded(true);
      if (onExpand) {
        onExpand();
      }
    }
  }, [isExpanded, hasBeenExpanded, onExpand]);

  return (
    <div className="card-bg p-6 rounded-2xl shadow-lg">
      <div className="flex items-center justify-between border-b border-gray-700 pb-2 mb-4">
        <h3 className="section-title">
          {title}
          {isLoading && isExpanded && (
            <span className="ml-2 text-sm text-gray-400 animate-pulse">載入中...</span>
          )}
        </h3>
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-sm text-gray-400 hover:text-white transition-colors px-3 py-1 rounded hover:bg-gray-700"
        >
          {isExpanded ? '收起 ▲' : '展開 ▼'}
        </button>
      </div>
      {isExpanded && <div className="space-y-4">{children}</div>}
    </div>
  );
};

export default AdminSection;