// src/components/ui/TownBulletin.tsx

import React, { useState, useEffect } from 'react';
import { LoadingSpinner } from './LoadingSpinner';
import announcementsData from '../../api/announcements.json'; // 直接導入 JSON 檔案

interface Announcement {
  id: number;
  title: string;
  content: string;
  date: string;
  tag: string;
  tagColor: string;
}

export const TownBulletin: React.FC = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 模擬非同步載入
    setTimeout(() => {
      // 根據日期對公告進行排序
      const sortedAnnouncements = [...announcementsData].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setAnnouncements(sortedAnnouncements);
      setIsLoading(false);
    }, 500);
  }, []);

  return (
    <div className="card-bg p-4 md:p-6 rounded-2xl shadow-lg">
      <h3 className="section-title">城鎮告示板</h3>
      <div className="space-y-4 max-h-72 overflow-y-auto pr-2">
        {isLoading ? (
          <div className="flex justify-center items-center h-48">
            <LoadingSpinner />
          </div>
        ) : announcements.length > 0 ? (
          announcements.map((item) => (
            <div key={item.id} className="bg-black/10 dark:bg-gray-800/50 p-4 rounded-lg">
              <div className="flex justify-between items-start">
                <h4 className="font-bold text-base md:text-lg text-white mb-1">{item.title}</h4>
                <span 
                  className="text-xs font-semibold px-2 py-1 rounded-full"
                  style={{ backgroundColor: item.tagColor, color: '#fff' }}
                >
                  {item.tag}
                </span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{item.content}</p>
              <p className="text-xs text-right text-gray-500">{item.date}</p>
            </div>
          ))
        ) : (
          <p className="text-center text-gray-500 py-8">目前沒有新消息。</p>
        )}
      </div>
    </div>
  );
};
