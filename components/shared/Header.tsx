'use client'

import React from 'react';
import { ChevronLeft, ChevronRight, User, LogOut, Settings } from 'lucide-react';
import { AppMode, ViewMode } from '@/types/index';

interface HeaderProps {
  appMode: AppMode;
  setAppMode: (mode: AppMode) => void;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  currentDate: Date;
  navigateDate: (direction: 'prev' | 'next') => void;
  goToToday: () => void;
  formatDateHeader: () => string;
  user: { email: string; name: string } | null;
  showUserMenu: boolean;
  setShowUserMenu: (show: boolean) => void;
  handleLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  appMode,
  setAppMode,
  viewMode,
  setViewMode,
  currentDate,
  navigateDate,
  goToToday,
  formatDateHeader,
  user,
  showUserMenu,
  setShowUserMenu,
  handleLogout,
}) => {
  return (
    <header className="sticky top-0 z-40 backdrop-blur-lg bg-black/50 border-b border-white/10">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Left side: App Mode switcher */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setAppMode("memo")}
              className={`px-4 py-2 text-sm font-semibold rounded-full transition-all ${
                appMode === "memo"
                  ? "bg-white text-black"
                  : "text-white/70 hover:bg-white/20"
              }`}
            >
              Memo
            </button>
            <button
              onClick={() => setAppMode("session")}
              className={`px-4 py-2 text-sm font-semibold rounded-full transition-all ${
                appMode === "session"
                  ? "bg-white text-black"
                  : "text-white/70 hover:bg-white/20"
              }`}
            >
              Session
            </button>
          </div>

          {/* Center: Date Navigation */}
          <div className="flex items-center gap-4">
            <button onClick={() => navigateDate('prev')} className="p-2 rounded-full hover:bg-white/20 transition-all">
              <ChevronLeft className="w-5 h-5 text-white" />
            </button>
            <div className="text-center">
              <h2 className="text-lg font-semibold text-white cursor-pointer" onClick={goToToday}>
                {formatDateHeader()}
              </h2>
              <div className="flex justify-center gap-2 mt-1">
                {['daily', 'weekly', 'monthly'].map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode as ViewMode)}
                    className={`px-2 py-0.5 text-xs rounded-full ${
                      viewMode === mode
                        ? 'bg-white/90 text-black'
                        : 'text-white/60 hover:bg-white/20'
                    }`}
                  >
                    {mode.charAt(0).toUpperCase() + mode.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <button onClick={() => navigateDate('next')} className="p-2 rounded-full hover:bg-white/20 transition-all">
              <ChevronRight className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* Right side: User Menu */}
          <div className="relative">
            <button onClick={() => setShowUserMenu(!showUserMenu)} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
              <User className="w-5 h-5 text-white" />
            </button>
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-lg py-1">
                <div className="px-4 py-2 text-sm text-white/80 border-b border-gray-700">
                  <p className="font-semibold">{user?.name}</p>
                  <p className="text-xs text-white/60">{user?.email}</p>
                </div>
                <a href="#" className="flex items-center gap-2 px-4 py-2 text-sm text-white/80 hover:bg-gray-700">
                  <Settings className="w-4 h-4" />
                  Settings
                </a>
                <button
                  onClick={handleLogout}
                  className="w-full text-left flex items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-gray-700"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
