import React, { useState } from 'react';
import type { ReactNode } from 'react';

interface AdminSectionProps {
  title: string;
  children: ReactNode;
  defaultExpanded?: boolean;
}

const AdminSection: React.FC<AdminSectionProps> = ({ title, children, defaultExpanded = true }) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className="card-bg p-6 rounded-2xl shadow-lg">
      <div className="flex items-center justify-between border-b border-gray-700 pb-2 mb-4">
        <h3 className="section-title">{title}</h3>
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