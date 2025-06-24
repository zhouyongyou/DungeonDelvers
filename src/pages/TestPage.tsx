import React from 'react';

export const TestPage: React.FC = () => {
  return (
    <div className="w-full h-96 flex flex-col justify-center items-center bg-blue-200 border-4 border-dashed border-blue-500 rounded-2xl">
      <h1 className="text-5xl font-bold text-red-600">
        如果這段文字是紅色的...
      </h1>
      <p className="mt-4 text-2xl text-green-700">
        而且這個背景是藍色的...
      </p>
      <p className="mt-2 text-xl text-gray-800">
        那就代表我們的 Tailwind CSS 設定完全沒有問題！
      </p>
    </div>
  );
};
