import React from 'react';
import { ActionButton } from '../ui/ActionButton';

interface SimpleSettingRowProps {
  title: string;
  description: string;
  currentValue: string;
  inputValue: string;
  onInputChange: (value: string) => void;
  onSet: () => void;
  placeholder?: string;
  inputType?: string;
  step?: string;
}

const SimpleSettingRow: React.FC<SimpleSettingRowProps> = ({
  title,
  description,
  currentValue,
  inputValue,
  onInputChange,
  onSet,
  placeholder = '輸入新值',
  inputType = 'text',
  step
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
      <div className="text-gray-300 md:col-span-1">
        <div className="font-medium">{title}</div>
        <div className="text-sm text-gray-400">{description}</div>
      </div>
      <div className="font-mono text-sm bg-black/20 p-2 rounded md:col-span-1 break-all">
        當前值: <span className="text-yellow-400">{currentValue}</span>
      </div>
      <div className="flex flex-col sm:flex-row gap-2 md:col-span-1">
        <input
          type={inputType}
          value={inputValue}
          onChange={(e) => onInputChange(e.target.value)}
          placeholder={placeholder}
          step={step}
          className="input-field flex-1"
        />
        <ActionButton
          onClick={onSet}
          className="h-10 w-full sm:w-24"
        >
          更新
        </ActionButton>
      </div>
    </div>
  );
};

export default SimpleSettingRow;