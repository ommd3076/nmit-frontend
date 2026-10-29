import React, { useState } from 'react';
import { SolverJob, SystemHealth } from '../../types/api';
import { DataBadge } from '../../components/ui/DataBadge';
import { apiClient } from '../../api/client';
import {
  Cpu,
  Play,
  XCircle,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Clock,
  Sparkles,
  Server
} from 'lucide-react';

interface JobsViewProps {
  jobs: SolverJob[];
  health: SystemHealth | null;
  onRefreshJobs: () => void;
}

export const JobsView: React.FC<JobsViewProps> = ({ jobs, health, onRefreshJobs }) => {
  const [cancellingJobId, setCancellingJobId] = useState<string | null>(null);

  const handleCancel = async (jobId: string) => {
    setCancellingJobId(jobId);
    await apiClient.cancelJob(jobId);
    setTimeout(() => {
      onRefreshJobs();
      setCancellingJobId(null);
    }, 800);
  };

  const activeSlots = health?.capacity.active_slots ?? 1;
  const maxSlots = health?.capacity.max_slots ?? 2;

  return (
    <div className="flex-1 flex flex-col overflow-y-auto p-6 gap-6 select-none text-xs">
      {/* Top Concurrency & Capacity Card */}
      <div className="glass-panel-strong rounded-3xl p-5 border border-white/80 shadow-lg">
        <div className="flex flex-wrap items-center justify-between pb-4 border-b border-black/5 gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <Cpu className="w-5 h-5 text-[#205A46]" />
              <h2 className="text-lg font-extrabold text-[#15211D] tracking-tight">
                Solver Concurrency & Job Pipeline
              </h2>
            </div>
            <p className="text-xs text-[#68756F] mt-1">
              Protected by FastAPI BoundedSemaphore(2) with SQLite WAL job persistence
            </p>
          </div>

          <div className="flex items-center space-x-4">
            {/* 2-Slot Visual Indicators */}
            <div className="flex items-center space-x-2 bg-white/80 border border-black/5 p-2 rounded-2xl">
              <span className="text-[10px] uppercase font-bold text-[#929E99]">
                Solver Slots ({activeSlots}/{maxSlots}):
              </span>
              <div className="flex space-x-1.5">
                {[0, 1].map((slotIdx) => {
                  const isOccupied = slotIdx < activeSlots;
                  return (
                    <div
                      key={slotIdx}
                      className={`w-4 h-4 rounded-md flex items-center justify-center font-bold text-[9px] ${
                        isOccupied
                          ? 'bg-[#205A46] text-white shadow-xs animate-pulse'
                          : 'bg-black/5 text-[#929E99]'
                      }`}
                    >
                      {slotIdx + 1}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* 429 Capacity Reached Guard Description */}
        <div className="mt-4 p-3 bg-white/80 border border-black/5 rounded-2xl flex items-center justify-between">
          <div className="flex items-center space-x-2 text-[#68756F]">
            <Server className="w-4 h-4 text-[#205A46]" />
            <span>
              If 2 solver jobs are running concurrently, incoming solve requests receive a <strong>429 capacity_reached</strong> with exponential backoff (2s → 4s → 8s).
            </span>
          </div>
          <span className="text-[11px] font-semibold text-[#205A46] bg-[#E2F4EE] px-2.5 py-0.5 rounded-full">
            Semaphore Guard Active
          </span>
        </div>
      </div>

      {/* Live Jobs Table */}
      <div className="glass-panel-strong rounded-3xl p-5 border border-white/80 shadow-lg">
        <div className="flex items-center justify-between pb-3 border-b border-black/5">
          <h3 className="font-extrabold text-sm text-[#15211D]">
            Job Queue & Execution History ({jobs.length})
          </h3>
          <button
            onClick={onRefreshJobs}
            className="px-3 py-1 bg-white/80 hover:bg-white border border-black/5 rounded-xl font-medium text-[#15211D] transition-colors cursor-pointer"
          >
            Poll State
          </button>
        </div>

        <div className="overflow-x-auto mt-3">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-black/5 text-[#929E99] text-[10px] uppercase font-bold tracking-wider">
                <th className="pb-2.5 font-bold">Job ID</th>
                <th className="pb-2.5 font-bold">Solver Architecture</th>
                <th className="pb-2.5 font-bold">Provenance</th>
                <th className="pb-2.5 font-bold">Progress</th>
                <th className="pb-2.5 font-bold">Elapsed Time</th>
                <th className="pb-2.5 font-bold">Status</th>
                <th className="pb-2.5 text-right font-bold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {jobs.map((job) => {
                const isRunning = job.status === 'running';
                const isCancelling = cancellingJobId === job.id;

                return (
                  <tr key={job.id} className="hover:bg-white/80 transition-colors">
                    {/* Job ID */}
                    <td className="py-3.5 pr-3 font-mono font-bold text-[#15211D]">
                      {job.id}
                    </td>

                    {/* Engine */}
                    <td className="py-3.5 pr-3 font-semibold text-[#15211D]">
                      {job.engine}
                    </td>

                    {/* Provenance */}
                    <td className="py-3.5 pr-3">
                      <DataBadge badge={job.provenance_badge} size="sm" />
                    </td>

                    {/* Progress Bar */}
                    <td className="py-3.5 pr-3 w-40">
                      <div className="flex items-center space-x-2">
                        <div className="flex-1 h-2 bg-black/5 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              job.status === 'succeeded'
                                ? 'bg-[#205A46]'
                                : job.status === 'cancelled'
                                ? 'bg-[#929E99]'
                                : 'bg-[#2F5BEA]'
                            }`}
                            style={{ width: `${job.progress_pct}%` }}
                          />
                        </div>
                        <span className="text-[10px] tabular-nums font-bold text-[#68756F]">
                          {job.progress_pct}%
                        </span>
                      </div>
                    </td>

                    {/* Elapsed */}
                    <td className="py-3.5 pr-3 tabular-nums font-mono text-[#68756F]">
                      {job.elapsed_seconds}s
                    </td>

                    {/* Status */}
                    <td className="py-3.5 pr-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          job.status === 'succeeded'
                            ? 'bg-[#E2F4EE] text-[#205A46]'
                            : job.status === 'running'
                            ? 'bg-[#EFF4FF] text-[#2F5BEA] animate-pulse'
                            : job.status === 'cancelled'
                            ? 'bg-black/5 text-[#68756F]'
                            : 'bg-[#FBECEB] text-[#C6534C]'
                        }`}
                      >
                        {job.status.toUpperCase()}
                      </span>
                    </td>

                    {/* Action */}
                    <td className="py-3.5 text-right">
                      {isRunning && (
                        <button
                          onClick={() => handleCancel(job.id)}
                          disabled={isCancelling}
                          className="px-2.5 py-1 bg-[#FBECEB] hover:bg-[#F2B8B5] text-[#C6534C] rounded-xl font-bold transition-all text-[11px] cursor-pointer"
                        >
                          {isCancelling ? 'Cancelling…' : 'Cancel'}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
