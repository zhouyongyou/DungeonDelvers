import React from 'react';
import { ActionButton } from './ActionButton';

interface EmptyStateProps {
  message: string;
  buttonText?: string;
  onButtonClick?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ message, buttonText, onButtonClick }) => (
  <div className="text-center py-10 px-4 card-bg rounded-xl">
    <p className="text-gray-500 mb-4">{message}</p>
    {buttonText && onButtonClick && (
       <ActionButton onClick={onButtonClick} className="px-6 py-2 rounded-lg">
         {buttonText}
       </ActionButton>
    )}
  </div>
);