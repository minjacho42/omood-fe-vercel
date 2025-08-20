'use client'

import React, { useState, useEffect, useMemo } from 'react';
import { Memo, DailySummary, CategoryConfig, ViewMode } from '@/types';
import { fetchDailyMemos, fetchWeeklyMemos, fetchMonthlyMemos, fetchDailySummary } from '@/lib/api';
import { DailySummaryComponent } from './DailySummary';
import { MemoCard } from './MemoCard';
import { MemoInput } from './MemoInput';
import { MemoDetailView } from './MemoDetailView'; // I will create this later

interface MemoViewProps {
  viewMode: ViewMode;
  currentDate: Date;
  timeZone: string;
  categories: Record<string, CategoryConfig>;
  categoryFilter: string | null;
  searchQuery: string;
  locale: string;
}

export const MemoView: React.FC<MemoViewProps> = ({
  viewMode,
  currentDate,
  timeZone,
  categories,
  categoryFilter,
  searchQuery,
  locale,
}) => {
  const [memos, setMemos] = useState<Memo[]>([]);
  const [weeklyData, setWeeklyData] = useState<{ [key: string]: Memo[] }>({});
  const [monthlyData, setMonthlyData] = useState<{ [key: string]: { memo_count: number; has_summary: boolean } }>({});
  const [dailySummary, setDailySummary] = useState<DailySummary | null>(null);
  const [selectedMemo, setSelectedMemo] = useState<Memo | null>(null);
  const [expandedPreviews, setExpandedPreviews] = useState<string[]>([]);

  const fetchData = async () => {
    if (viewMode === 'daily') {
      const dailyMemos = await fetchDailyMemos(currentDate, timeZone);
      setMemos(dailyMemos);
      const summary = await fetchDailySummary(formatLocalDate(currentDate), timeZone);
      setDailySummary(summary);
    } else if (viewMode === 'weekly') {
      const weeklyMemos = await fetchWeeklyMemos(currentDate, timeZone);
      setWeeklyData(weeklyMemos);
    } else if (viewMode === 'monthly') {
      const monthlyMemos = await fetchMonthlyMemos(currentDate, timeZone);
      setMonthlyData(monthlyMemos);
    }
  };

  useEffect(() => {
    fetchData();
  }, [viewMode, currentDate, timeZone]);

  const filteredMemos = useMemo(() => {
    return memos.filter((memo) => {
      if (categoryFilter && memo.category !== categoryFilter) {
        return false;
      }
      if (searchQuery) {
        return (
          memo.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
          memo.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
        );
      }
      return true;
    });
  }, [memos, categoryFilter, searchQuery]);

  const formatLocalDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const handleMemoCreated = () => {
    fetchData();
  };

  const handleSelectMemo = (memo: Memo) => {
    setSelectedMemo(memo);
  };

  const handleCloseDetail = () => {
    setSelectedMemo(null);
  };

  const renderMemoList = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {filteredMemos.map((memo) => (
        <MemoCard
          key={memo.id}
          memo={memo}
          categories={categories}
          locale={locale}
          timeZone={timeZone}
          onSelectMemo={handleSelectMemo}
          expandedPreviews={expandedPreviews}
        />
      ))}
    </div>
  );

  const renderWeeklyView = () => {
    // ... implementation for weekly view
    return <div>Weekly View</div>
  }

  const renderMonthlyView = () => {
    // ... implementation for monthly view
    return <div>Monthly View</div>
  }

  return (
    <div>
      <MemoInput onMemoCreated={handleMemoCreated} categories={categories} />
      {viewMode === 'daily' && <DailySummaryComponent memos={memos} dailySummary={dailySummary} categories={categories} />}
      
      {viewMode === 'daily' && renderMemoList()}
      {viewMode === 'weekly' && renderWeeklyView()}
      {viewMode === 'monthly' && renderMonthlyView()}

      {selectedMemo && (
        <MemoDetailView
          memo={selectedMemo}
          onClose={handleCloseDetail}
          onUpdate={fetchData}
          onDelete={fetchData}
          categories={categories}
          locale={locale}
          timeZone={timeZone}
        />
      )}
    </div>
  );
};
