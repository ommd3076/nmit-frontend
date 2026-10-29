import React, { useState, useEffect } from 'react';
import { HealthPill } from '../ui/HealthPill';
import { SystemHealth, PlanRun } from '../../types/api';
import { Clock, Layers, Bell, Search, Sparkles } from 'lucide-react';

interface NavbarProps {
  currentPlan: PlanRun;
  allPlans: PlanRun[];
  onSelectPlan: (planId: string) => void;
  health: SystemHealth | null;
  onRefreshHealth: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  activeJobsCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentPlan,
  allPlans,
  onSelectPlan,
  health,
  onRefreshHealth,
  searchQuery,
  onSearchChange,
  activeJobsCount
}) => {
  const [timeStr, setTimeStr] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString('en-IN', {
          timeZone: 'Asia/Kolkata',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        }) + ' IST'
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="h-16 px-6 glass-panel border-b border-black/5 flex items-center justify-between z-30 select-none">
      {/* Brand & Product Identity */}
      <div className="flex items-center space-x-6">
        <div className="flex items-baseline space-x-2">
          <span className="text-2xl font-black tracking-tight text-[#15211D]">
            <span className="text-[#205A46]">ar</span>Q
          </span>
          <span className="text-[10px] uppercase font-mono font-bold tracking-widest text-[#205A46] bg-[#E2F4EE] px-2.5 py-0.5 rounded-full border border-[#A8DBC9]">
            DISPATCH OS · QML-01
          </span>
        </div>

        {/* Scenario Switcher Dropdown */}
        <div className="relative flex items-center space-x-2 bg-white/70 border border-black/5 rounded-2xl px-3 py-1 text-xs shadow-xs">
          <Layers className="w-3.5 h-3.5 text-[#205A46]" />
          <select
            value={currentPlan.id}
            onChange={(e) => onSelectPlan(e.target.value)}
            className="bg-transparent font-medium text-[#15211D] focus:outline-none cursor-pointer pr-2"
          >
            {allPlans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.scenario_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Center Search Input */}
      <div className="flex-1 max-w-md mx-8 hidden md:block">
        <div className="relative">
          <Search className="w-4 h-4 text-[#68756F] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search vehicles, stops, waypoints, SLA deadlines…"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-12 py-1.5 text-xs rounded-full bg-white/80 border border-black/5 text-[#15211D] placeholder-[#68756F] focus:outline-none focus:ring-2 focus:ring-[#205A46]/20 focus:border-[#205A46] transition-all"
          />
          <kbd className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[9px] font-mono text-[#929E99] bg-black/5 px-1.5 py-0.5 rounded border border-black/5">
            /
          </kbd>
        </div>
      </div>

      {/* Right Controls: Clock, Active Jobs, Health */}
      <div className="flex items-center space-x-4">
        {/* Clock in IST */}
        <div className="hidden sm:flex items-center space-x-1.5 text-xs text-[#68756F] tabular-nums font-medium bg-white/50 px-2.5 py-1 rounded-full border border-black/5">
          <Clock className="w-3.5 h-3.5 text-[#205A46]" />
          <span>{timeStr || '14:40:00 IST'}</span>
        </div>

        {/* Solver Jobs Activity Trigger */}
        {activeJobsCount > 0 && (
          <div className="flex items-center space-x-1 px-2.5 py-1 bg-[#EFF4FF] border border-[#C7D7FE] rounded-full text-xs text-[#2F5BEA] font-semibold animate-pulse">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{activeJobsCount} Active Job</span>
          </div>
        )}

        {/* Backend & Solver Health Pill */}
        <HealthPill health={health} onRefresh={onRefreshHealth} />

        {/* Notification Bell */}
        <button
          className="relative glass-pill p-2 rounded-full text-[#15211D] hover:bg-white transition-all cursor-pointer"
          title="Audit Notifications"
        >
          <Bell className="w-4 h-4 text-[#15211D]" />
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#C6534C]" />
        </button>
      </div>
    </header>
  );
};
