import React from 'react';
import { LoadingSpinner } from '../ui/LoadingSpinner';

interface ReadOnlyRowProps {
  label: string;
  value?: string;
  isLoading?: boolean;
}

const ReadOnlyRow: React.FC<ReadOnlyRowProps> = ({ label, value, isLoading }) => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
    <label className="text-gray-300 md:col-span-1">{label}</label>
    <div className="font-mono text-sm bg-black/20 p-2 rounded md:col-span-2 break-all">
      {isLoading ? (
        <LoadingSpinner size="h-4 w-4" />
      ) : (
        <span className="text-cyan-400">{value ?? 'N/A'}</span>
      )}
    </div>
  </div>
);

export default ReadOnlyRow;