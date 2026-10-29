import React from 'react';
import {
  Compass,
  Truck,
  Route as RouteIcon,
  ShieldAlert,
  BrainCircuit,
  Activity,
  Cpu
} from 'lucide-react';

export type NavView =
  | 'command'
  | 'fleet'
  | 'dispatch'
  | 'risk'
  | 'intelligence'
  | 'activity'
  | 'jobs';

interface SidebarRailProps {
  currentView: NavView;
  onSelectView: (view: NavView) => void;
  activeJobsCount?: number;
}

export const SidebarRail: React.FC<SidebarRailProps> = ({
  currentView,
  onSelectView,
  activeJobsCount = 0
}) => {
  const navItems: { id: NavView; label: string; icon: React.ReactNode; badge?: number }[] = [
    {
      id: 'command',
      label: 'Command Center',
      icon: <Compass className="w-5 h-5" />
    },
    {
      id: 'fleet',
      label: 'Fleet Operations',
      icon: <Truck className="w-5 h-5" />
    },
    {
      id: 'dispatch',
      label: 'Route Planning',
      icon: <RouteIcon className="w-5 h-5" />
    },
    {
      id: 'risk',
      label: 'SLA & Exposure',
      icon: <ShieldAlert className="w-5 h-5" />
    },
    {
      id: 'intelligence',
      label: 'QML Intelligence',
      icon: <BrainCircuit className="w-5 h-5" />
    },
    {
      id: 'activity',
      label: 'Audit Events',
      icon: <Activity className="w-5 h-5" />
    },
    {
      id: 'jobs',
      label: 'Solver Jobs',
      icon: <Cpu className="w-5 h-5" />,
      badge: activeJobsCount > 0 ? activeJobsCount : undefined
    }
  ];

  return (
    <aside className="w-18 md:w-56 h-[calc(100vh-4rem)] glass-panel border-r border-black/5 flex flex-col justify-between p-3 select-none z-20 shrink-0">
      <div className="space-y-1.5">
        <div className="hidden md:block px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-[#929E99]">
          Platform Views
        </div>

        {navItems.map((item) => {
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectView(item.id)}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-2xl text-xs font-semibold transition-all cursor-pointer ${
                isActive
                  ? 'bg-[#17231F] text-white shadow-sm'
                  : 'text-[#68756F] hover:bg-white/80 hover:text-[#15211D]'
              }`}
              title={item.label}
            >
              <span className={isActive ? 'text-[#A8DBC9]' : 'text-current'}>
                {item.icon}
              </span>
              <span className="hidden md:inline-block truncate flex-1 text-left">
                {item.label}
              </span>
              {item.badge !== undefined && (
                <span className="hidden md:inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-[#2F5BEA] text-white">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Bottom Summary Pill */}
      <div className="hidden md:block p-3 rounded-2xl bg-white/70 border border-black/5 text-xs text-[#68756F] space-y-1">
        <div className="text-[10px] font-bold uppercase tracking-wider text-[#929E99]">
          ArQ System Engine
        </div>
        <div className="text-[#15211D] font-medium flex items-center justify-between">
          <span>QML-01 · Opt 3.0</span>
          <span className="w-1.5 h-1.5 rounded-full bg-[#205A46]" />
        </div>
        <div className="text-[11px] text-[#929E99]">
          VQC statevector · QUBO
        </div>
      </div>
    </aside>
  );
};
