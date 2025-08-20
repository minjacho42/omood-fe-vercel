'use client'

import React from 'react';
import { Memo, CategoryConfig } from '@/types';

interface MemoDetailViewProps {
  memo: Memo;
  onClose: () => void;
  onUpdate: () => void;
  onDelete: () => void;
  categories: Record<string, CategoryConfig>;
  locale: string;
  timeZone: string;
}

export const MemoDetailView: React.FC<MemoDetailViewProps> = ({
  memo,
  onClose,
  onUpdate,
  onDelete,
  categories,
  locale,
  timeZone,
}) => {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-gray-800 w-full max-w-2xl rounded-2xl p-8">
        <h2 className="text-2xl font-bold text-white mb-4">{memo.content.substring(0, 20)}...</h2>
        <button onClick={onClose} className="absolute top-4 right-4 text-white">Close</button>
        {/* Full memo detail implementation will go here */}
      </div>
    </div>
  );
};
