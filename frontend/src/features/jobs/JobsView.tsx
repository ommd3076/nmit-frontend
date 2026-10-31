import React, { useState } from 'react';
import { SolverJob, SystemHealth } from '../../types/api';
import { DataBadge } from '../../components/ui/DataBadge';
import { apiClient } from '../../api/client';
import {
  Cpu,
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

  const activeSlots = health?.capacity?.active_slots ?? 0;
  const maxSlots = health?.capacity?.max_slots ?? 2;

  return (
    <div className="flex-1 flex flex-col overflow-y-auto p-6 gap-6 select-none text-xs">
      {/* Top Concurrency & Capacity Card */}
      <div className="bg-white rounded-3xl p-6 border border-[#EAE6DF] shadow-xs">
        <div className="flex flex-wrap items-center justify-between pb-4 border-b border-[#EAE6DF] gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <Cpu className="w-5 h-5 text-[#1E5A44]" />
              <h2 className="text-xl font-bold text-[#141F1A] tracking-tight">
                Solver Concurrency & Job Pipeline
              </h2>
            </div>
            <p className="text-xs text-[#7D8D85] mt-1">
              Protected by FastAPI BoundedSemaphore(2) with SQLite WAL job persistence
            </p>
          </div>

          <div className="flex items-center space-x-4">
            {/* 2-Slot Visual Indicators */}
            <div className="flex items-center space-x-2 bg-[#F5F3ED] border border-[#E5E0D8] p-2 rounded-full px-3">
              <span className="text-[10px] uppercase font-bold text-[#7D8D85]">
                Solver Slots ({activeSlots}/{maxSlots}):
              </span>
              <div className="flex space-x-1.5">
                {[0, 1].map((slotIdx) => {
                  const isOccupied = slotIdx < activeSlots;
                  return (
                    <div
                      key={slotIdx}
                      className={`w-4 h-4 rounded-full flex items-center justify-center font-bold text-[9px] ${
                        isOccupied
                          ? 'bg-[#1E5A44] text-white shadow-xs animate-pulse'
                          : 'bg-[#E5E0D8] text-[#7D8D85]'
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
        <div className="mt-4 p-3.5 bg-[#F5F3ED]/70 border border-[#E5E0D8] rounded-2xl flex items-center justify-between">
          <div className="flex items-center space-x-2 text-[#4D5C54]">
            <Server className="w-4 h-4 text-[#1E5A44]" />
            <span>
              If 2 solver jobs are running concurrently, incoming solve requests receive a <strong>429 capacity_reached</strong> with exponential backoff (2s → 4s → 8s).
            </span>
          </div>
          <span className="text-[11px] font-semibold text-[#1E5A44] bg-[#E8F5EE] border border-[#A8DBC9] px-3 py-0.5 rounded-full shadow-xs">
            Semaphore Guard Active
          </span>
        </div>
      </div>

      {/* Live Jobs Table */}
      <div className="bg-white rounded-3xl p-6 border border-[#EAE6DF] shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-[#EAE6DF]">
          <h3 className="font-bold text-base text-[#141F1A]">
            Job Queue & Execution History ({jobs.length})
          </h3>
          <button
            onClick={onRefreshJobs}
            className="px-3.5 py-1.5 bg-[#F5F3ED] hover:bg-black/5 border border-[#E5E0D8] rounded-full font-semibold text-[#141F1A] transition-all cursor-pointer"
          >
            Poll State
          </button>
        </div>

        <div className="overflow-x-auto mt-3">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#EAE6DF] text-[#7D8D85] text-[10px] uppercase font-bold tracking-wider">
                <th className="pb-3 font-bold">Job ID</th>
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

                    {/* Progress Indicator */}
                    <td className="py-3.5 pr-3 w-40">
                      {job.progress_pct !== null && job.progress_pct !== undefined ? (
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
                          <span className="text-[10px] tabular-nums font-semibold text-[#68756F]">
                            {job.progress_pct}%
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <div className="flex-1 h-2 bg-black/5 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                job.status === 'succeeded'
                                  ? 'w-full bg-[#205A46]'
                                  : job.status === 'running'
                                  ? 'w-1/2 bg-[#2F5BEA] animate-pulse'
                                  : 'w-0 bg-[#929E99]'
                              }`}
                            />
                          </div>
                          <span className="text-[10px] font-medium text-[#68756F] capitalize">
                            {job.status === 'succeeded' ? '100%' : job.status === 'running' ? 'Active' : '—'}
                          </span>
                        </div>
                      )}
                    </td>

                    {/* Elapsed */}
                    <td className="py-3.5 pr-3 tabular-nums font-mono text-[#68756F]">
                      {job.elapsed_seconds !== null && job.elapsed_seconds !== undefined
                        ? `${job.elapsed_seconds.toFixed(1)}s`
                        : '—'}
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
