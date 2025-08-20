'use client'

import React, { useState, useEffect } from 'react';
import { PomodoroSession, ViewMode } from '@/types';
import { fetchDailySessionData, fetchWeeklySessionData, fetchMonthlySessionData, fetchCurrentSession, deleteSessionFromBackend, updateSessionReflection } from '@/lib/api';
import { SessionSummary } from './SessionSummary';
import { SessionCard } from './SessionCard';
import { CircularTimer } from '@/components/circular-timer'; // Assuming this is the timer component

interface SessionViewProps {
  viewMode: ViewMode;
  currentDate: Date;
  timeZone: string;
  locale: string;
}

export const SessionView: React.FC<SessionViewProps> = ({
  viewMode,
  currentDate,
  timeZone,
  locale,
}) => {
  const [sessions, setSessions] = useState<PomodoroSession[]>([]);
  const [weeklyData, setWeeklyData] = useState<{ [key: string]: PomodoroSession[] }>({});
  const [monthlyData, setMonthlyData] = useState<{ [key: string]: { session_count: number; total_focus_time: number } }>({});
  const [currentSession, setCurrentSession] = useState<PomodoroSession | null>(null);
  const [sessionReflections, setSessionReflections] = useState<{ [sessionId: string]: string }>({});

  const fetchSessionData = async () => {
    if (viewMode === 'daily') {
      const dailySessions = await fetchDailySessionData(currentDate, timeZone);
      setSessions(dailySessions);
    } else if (viewMode === 'weekly') {
      const weeklySessions = await fetchWeeklySessionData(currentDate, timeZone);
      setWeeklyData(weeklySessions);
      setSessions(Object.values(weeklySessions).flat());
    } else if (viewMode === 'monthly') {
      const monthlySessions = await fetchMonthlySessionData(currentDate, timeZone);
      setMonthlyData(monthlySessions);
      // For monthly view, we might not need to set individual sessions, just the aggregate data
      setSessions([]); 
    }
  };

  const loadCurrentSession = async () => {
    const session = await fetchCurrentSession();
    setCurrentSession(session);
  }

  useEffect(() => {
    fetchSessionData();
    loadCurrentSession();
  }, [viewMode, currentDate, timeZone]);

  const handleReflectionSubmit = async (sessionId: string) => {
    const reflection = sessionReflections[sessionId];
    if (!reflection?.trim()) return;

    await updateSessionReflection(sessionId, reflection.trim());
    setSessionReflections((prev) => {
      const newReflections = { ...prev };
      delete newReflections[sessionId];
      return newReflections;
    });
    fetchSessionData(); // Refresh data
  };

  const handleDeleteSession = async (sessionId: string) => {
    await deleteSessionFromBackend(sessionId);
    fetchSessionData(); // Refresh data
  }

  const renderSessionList = () => (
    <div className="space-y-6">
      {sessions.map((session) => (
        <SessionCard
          key={session.id}
          session={session}
          locale={locale}
          timeZone={timeZone}
          sessionReflections={sessionReflections}
          setSessionReflections={setSessionReflections}
          handleReflectionSubmit={handleReflectionSubmit}
          deleteSessionFromBackend={handleDeleteSession}
        />
      ))}
    </div>
  );

  const renderWeeklyView = () => {
    // ... implementation for weekly view
    return <div>Weekly Session View</div>
  }

  const renderMonthlyView = () => {
    // ... implementation for monthly view
    return <div>Monthly Session View</div>
  }

  return (
    <div>
      {/* This should be the Pomodoro Timer component */}
      {/* <CircularTimer ... /> */}
      
      <SessionSummary viewMode={viewMode} sessions={sessions} currentDate={currentDate} />

      {viewMode === 'daily' && renderSessionList()}
      {viewMode === 'weekly' && renderWeeklyView()}
      {viewMode === 'monthly' && renderMonthlyView()}
    </div>
  );
};
