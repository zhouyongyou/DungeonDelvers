import React from 'react';
import type { ReactNode } from 'react';

interface AdminSectionProps {
  title: string;
  children: ReactNode;
}

const AdminSection: React.FC<AdminSectionProps> = ({ title, children }) => (
  <div className="card-bg p-6 rounded-2xl shadow-lg">
    <h3 className="section-title border-b border-gray-700 pb-2 mb-4">{title}</h3>
    <div className="space-y-4">{children}</div>
  </div>
);

export default AdminSection;