import React from 'react';
import { useBreakpoint } from '../../hooks/useMobileOptimization';

interface Column<T> {
  key: string;
  header: string;
  render: (item: T) => React.ReactNode;
  mobileHidden?: boolean;
  width?: string;
}

interface MobileTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (item: T) => string;
  onRowClick?: (item: T) => void;
  emptyMessage?: string;
  loading?: boolean;
}

export function MobileTable<T>({
  data,
  columns,
  keyExtractor,
  onRowClick,
  emptyMessage = '沒有資料',
  loading = false,
}: MobileTableProps<T>) {
  const { isMobileBreakpoint } = useBreakpoint();

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        {emptyMessage}
      </div>
    );
  }

  // 移動端卡片視圖
  if (isMobileBreakpoint) {
    return (
      <div className="space-y-3">
        {data.map((item) => (
          <div
            key={keyExtractor(item)}
            onClick={() => onRowClick?.(item)}
            className={`
              bg-gray-800 rounded-lg p-4 space-y-2
              ${onRowClick ? 'active:bg-gray-700 cursor-pointer' : ''}
            `}
          >
            {columns
              .filter(col => !col.mobileHidden)
              .map((column) => (
                <div key={column.key} className="flex justify-between items-center">
                  <span className="text-sm text-gray-400">{column.header}</span>
                  <span className="text-sm font-medium text-white">
                    {column.render(item)}
                  </span>
                </div>
              ))}
          </div>
        ))}
      </div>
    );
  }

  // 桌面端表格視圖
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-700">
            {columns.map((column) => (
              <th
                key={column.key}
                className={`
                  text-left py-3 px-4 text-sm font-medium text-gray-300
                  ${column.width || ''}
                `}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((item) => (
            <tr
              key={keyExtractor(item)}
              onClick={() => onRowClick?.(item)}
              className={`
                border-b border-gray-800
                ${onRowClick ? 'hover:bg-gray-800/50 cursor-pointer' : ''}
              `}
            >
              {columns.map((column) => (
                <td key={column.key} className="py-3 px-4 text-sm">
                  {column.render(item)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// 響應式數據列表組件
interface DataListProps<T> {
  data: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  keyExtractor: (item: T) => string;
  loading?: boolean;
  emptyMessage?: string;
  horizontal?: boolean;
}

export function MobileDataList<T>({
  data,
  renderItem,
  keyExtractor,
  loading = false,
  emptyMessage = '沒有資料',
  horizontal = false,
}: DataListProps<T>) {
  const { isMobileBreakpoint } = useBreakpoint();

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        {emptyMessage}
      </div>
    );
  }

  if (horizontal && isMobileBreakpoint) {
    return (
      <div className="overflow-x-auto -mx-4 px-4">
        <div className="flex space-x-3 pb-2">
          {data.map((item, index) => (
            <div key={keyExtractor(item)} className="flex-shrink-0">
              {renderItem(item, index)}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`
      ${horizontal ? 'flex overflow-x-auto space-x-4 pb-2' : 'space-y-3'}
    `}>
      {data.map((item, index) => (
        <div key={keyExtractor(item)} className={horizontal ? 'flex-shrink-0' : ''}>
          {renderItem(item, index)}
        </div>
      ))}
    </div>
  );
}