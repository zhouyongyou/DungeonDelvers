// 手機版數據卡片組件 - 用於替代表格在手機上的顯示
import React from 'react';

interface DataItem {
  label: string;
  value: React.ReactNode;
  highlight?: boolean;
  className?: string;
}

interface MobileDataCardProps {
  title?: React.ReactNode;
  data: DataItem[];
  actions?: React.ReactNode;
  className?: string;
  variant?: 'default' | 'compact';
}

export const MobileDataCard: React.FC<MobileDataCardProps> = ({
  title,
  data,
  actions,
  className = '',
  variant = 'default'
}) => {
  const spacing = variant === 'compact' ? 'space-y-1' : 'space-y-2';
  const padding = variant === 'compact' ? 'p-3' : 'p-4';
  
  return (
    <div className={`bg-gray-800 rounded-lg ${padding} ${className}`}>
      {title && (
        <div className="font-semibold text-white mb-3 text-sm">
          {title}
        </div>
      )}
      
      <div className={spacing}>
        {data.map((item, index) => (
          <div 
            key={index}
            className={`flex justify-between items-center ${item.className || ''}`}
          >
            <span className="text-gray-400 text-sm">{item.label}</span>
            <span className={`text-sm ${
              item.highlight ? 'text-yellow-400 font-semibold' : 'text-white'
            }`}>
              {item.value}
            </span>
          </div>
        ))}
      </div>
      
      {actions && (
        <div className="mt-3 pt-3 border-t border-gray-700">
          {actions}
        </div>
      )}
    </div>
  );
};

// 橫向滾動的數據卡片組
interface MobileDataCardGroupProps {
  cards: Array<{
    id: string | number;
    title?: React.ReactNode;
    data: DataItem[];
    actions?: React.ReactNode;
  }>;
  className?: string;
}

export const MobileDataCardGroup: React.FC<MobileDataCardGroupProps> = ({
  cards,
  className = ''
}) => {
  return (
    <div className={`overflow-x-auto -mx-4 px-4 ${className}`}>
      <div className="flex space-x-3 pb-2">
        {cards.map((card) => (
          <div key={card.id} className="flex-shrink-0 w-72">
            <MobileDataCard
              title={card.title}
              data={card.data}
              actions={card.actions}
              variant="compact"
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default MobileDataCard;