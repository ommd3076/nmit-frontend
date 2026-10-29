import React, { useState } from 'react';
import { OperationalEvent } from '../../types/api';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Info,
  RefreshCw,
  Search,
  User
} from 'lucide-react';

interface ActivityViewProps {
  events: OperationalEvent[];
  onRefresh?: () => void;
}

export const ActivityView: React.FC<ActivityViewProps> = ({ events, onRefresh }) => {
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [search, setSearch] = useState<string>('');

  const filteredEvents = events.filter((evt) => {
    const matchCategory = filterCategory === 'all' || evt.category === filterCategory;
    const matchSearch =
      evt.title.toLowerCase().includes(search.toLowerCase()) ||
      evt.description.toLowerCase().includes(search.toLowerCase()) ||
      evt.actor.toLowerCase().includes(search.toLowerCase());
    return matchCategory && matchSearch;
  });

  const getSeverityStyle = (sev: OperationalEvent['severity']) => {
    switch (sev) {
      case 'critical':
        return {
          bg: 'bg-[#FBECEB]',
          border: 'border-[#F2B8B5]',
          text: 'text-[#C6534C]',
          icon: <AlertTriangle className="w-4 h-4 text-[#C6534C]" />
        };
      case 'warning':
        return {
          bg: 'bg-[#FDF4EB]',
          border: 'border-[#FBD6B0]',
          text: 'text-[#D78A45]',
          icon: <AlertTriangle className="w-4 h-4 text-[#D78A45]" />
        };
      case 'success':
        return {
          bg: 'bg-[#E2F4EE]',
          border: 'border-[#A8DBC9]',
          text: 'text-[#205A46]',
          icon: <CheckCircle2 className="w-4 h-4 text-[#205A46]" />
        };
      case 'info':
      default:
        return {
          bg: 'bg-[#EFF4FF]',
          border: 'border-[#C7D7FE]',
          text: 'text-[#2F5BEA]',
          icon: <Info className="w-4 h-4 text-[#2F5BEA]" />
        };
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-y-auto p-6 gap-6 select-none text-xs">
      {/* Top Header Card */}
      <div className="glass-panel-strong rounded-3xl p-5 border border-white/80 shadow-lg">
        <div className="flex flex-wrap items-center justify-between pb-3 border-b border-black/5 gap-4">
          <div>
            <div className="text-[10px] uppercase font-mono tracking-wider text-[#77736D]">
              06 · DETERMINISTIC DISPATCH AUDIT LOG
            </div>
            <div className="flex items-center space-x-2 mt-0.5">
              <Activity className="w-5 h-5 text-[#205A46]" />
              <h2 className="text-lg font-extrabold text-[#15211D] tracking-tight">
                Operational Event Stream & Audit Trail
              </h2>
            </div>
            <p className="text-xs text-[#68756F] mt-1">
              Deterministic dispatch transitions, driver telemetry arrivals, and recovery events
            </p>
          </div>

          {/* Search & Refresh */}
          <div className="flex items-center space-x-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#68756F] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search audit trail…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs bg-white/90 border border-black/5 rounded-xl text-[#15211D] focus:outline-none"
              />
            </div>

            {onRefresh && (
              <button
                onClick={onRefresh}
                className="p-2 rounded-xl bg-white/80 hover:bg-white border border-black/5 text-[#15211D] transition-colors cursor-pointer"
                title="Refresh Events"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center space-x-2 mt-4 overflow-x-auto pb-1">
          {[
            { id: 'all', label: 'All Events' },
            { id: 'delay_alert', label: 'Delay Alerts' },
            { id: 'recovery', label: 'Recovery Re-plans' },
            { id: 'status_change', label: 'Stop Completions' },
            { id: 'assignment', label: 'Assignments' },
            { id: 'job_lifecycle', label: 'Solver Lifecycle' }
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setFilterCategory(cat.id)}
              className={`px-3 py-1.5 rounded-full font-medium transition-all cursor-pointer whitespace-nowrap text-[11px] ${
                filterCategory === cat.id
                  ? 'bg-[#17231F] text-white shadow-xs'
                  : 'bg-white/70 hover:bg-white text-[#68756F] border border-black/5'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Events Stream Feed */}
      <div className="glass-panel-strong rounded-3xl p-5 border border-white/80 shadow-lg space-y-3">
        {filteredEvents.length === 0 ? (
          <div className="text-center py-12 text-[#68756F] space-y-2">
            <Activity className="w-8 h-8 text-[#929E99] mx-auto" />
            <div className="font-bold text-sm text-[#15211D]">No operational events match this filter</div>
            <p className="text-[11px]">Clear search or switch category filter to inspect logs.</p>
          </div>
        ) : (
          filteredEvents.map((evt) => {
            const sev = getSeverityStyle(evt.severity);
            const timeFormatted = evt.timestamp.includes('T')
              ? evt.timestamp.split('T')[1].slice(0, 8) + ' IST'
              : evt.timestamp;

            return (
              <div
                key={evt.id}
                className="p-3.5 bg-white/85 border border-black/5 rounded-2xl flex items-start space-x-3.5 hover:bg-white transition-all shadow-xs"
              >
                {/* Severity Icon Pill */}
                <div className={`p-2 rounded-xl shrink-0 ${sev.bg} ${sev.border} border`}>
                  {sev.icon}
                </div>

                {/* Event Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between">
                    <h4 className="font-extrabold text-xs text-[#15211D]">
                      {evt.title}
                    </h4>
                    <span className="text-[11px] font-mono text-[#929E99] tabular-nums">
                      {timeFormatted}
                    </span>
                  </div>

                  <p className="text-[#68756F] text-[11px] mt-0.5 leading-relaxed">
                    {evt.description}
                  </p>

                  <div className="mt-2 flex items-center space-x-2 text-[10px] text-[#929E99]">
                    <span className="flex items-center gap-1 font-semibold text-[#15211D] bg-black/5 px-2 py-0.5 rounded-md">
                      <User className="w-3 h-3 text-[#205A46]" />
                      {evt.actor}
                    </span>
                    <span>·</span>
                    <span className="uppercase tracking-wider font-medium">
                      Category: {evt.category.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
