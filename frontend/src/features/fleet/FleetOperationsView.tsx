import React, { useState, useMemo } from 'react';
import { PlanRun, Vehicle } from '../../types/api';
import {
  Truck,
  Phone,
  Search,
  ChevronRight,
  MapPin,
  X
} from 'lucide-react';

interface FleetOperationsViewProps {
  plan: PlanRun;
  selectedVehicleId?: string | null;
  searchQuery?: string;
  onSelectVehicleForMap?: (vehicleId: string) => void;
}

export const FleetOperationsView: React.FC<FleetOperationsViewProps> = ({
  plan,
  selectedVehicleId,
  searchQuery = '',
  onSelectVehicleForMap
}) => {
  const [localSearch, setLocalSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'at_risk' | 'delayed'>('all');
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(() => {
    if (selectedVehicleId) {
      return plan.vehicles.find((v) => v.id === selectedVehicleId) || null;
    }
    return null;
  });

  const effectiveSearch = searchQuery || localSearch;

  // Filter vehicles
  const filteredVehicles = useMemo(() => {
    return plan.vehicles.filter((v) => {
      const matchSearch =
        v.callsign.toLowerCase().includes(effectiveSearch.toLowerCase()) ||
        v.driver_name.toLowerCase().includes(effectiveSearch.toLowerCase()) ||
        v.vehicle_type.toLowerCase().includes(effectiveSearch.toLowerCase());
      const matchStatus = statusFilter === 'all' || v.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [plan.vehicles, effectiveSearch, statusFilter]);

  return (
    <div className="flex-1 flex overflow-hidden p-6 gap-6 select-none">
      {/* Left/Main Data Grid */}
      <div className="flex-1 flex flex-col glass-panel-strong rounded-3xl p-5 border border-white/80 shadow-lg overflow-hidden">
        {/* Top Header & Search Bar */}
        <div className="flex flex-wrap items-center justify-between pb-4 border-b border-black/5 gap-4">
          <div>
            <h2 className="text-lg font-extrabold text-[#15211D] tracking-tight">
              Fleet Operations & Telemetry
            </h2>
            <p className="text-xs text-[#68756F]">
              Monitoring {plan.vehicles.length} assigned units across {plan.scenario_name}
            </p>
          </div>

          {/* Search & Status Filters */}
          <div className="flex items-center space-x-2.5">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#68756F] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search callsign or driver…"
                value={effectiveSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs bg-white/90 border border-black/5 rounded-xl text-[#15211D] focus:outline-none focus:ring-1 focus:ring-[#205A46]"
              />
            </div>

            <div className="flex items-center space-x-1 bg-black/5 p-1 rounded-xl text-xs">
              {(['all', 'active', 'at_risk', 'delayed'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer capitalize text-[11px] ${
                    statusFilter === st
                      ? 'bg-white text-[#15211D] shadow-xs'
                      : 'text-[#68756F] hover:text-[#15211D]'
                  }`}
                >
                  {st.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Dense Table View */}
        <div className="flex-1 overflow-y-auto mt-4">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-black/5 text-[#929E99] text-[10px] uppercase font-bold tracking-wider">
                <th className="pb-2.5 font-bold">Vehicle Callsign</th>
                <th className="pb-2.5 font-bold">Driver Name</th>
                <th className="pb-2.5 font-bold">Status</th>
                <th className="pb-2.5 font-bold">Capacity Used</th>
                <th className="pb-2.5 font-bold">Stop Progress</th>
                <th className="pb-2.5 font-bold">ETA Deviation</th>
                <th className="pb-2.5 font-bold">Freshness</th>
                <th className="pb-2.5 text-right font-bold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {filteredVehicles.map((vehicle) => {
                const route = plan.routes.find((r) => r.id === vehicle.route_id);
                const isSelected = selectedVehicle?.id === vehicle.id;
                const capacityPct = Math.round((vehicle.used_capacity_kg / vehicle.capacity_kg) * 100);

                return (
                  <tr
                    key={vehicle.id}
                    onClick={() => setSelectedVehicle(vehicle)}
                    className={`hover:bg-white/80 transition-colors cursor-pointer ${
                      isSelected ? 'bg-white/90 font-medium' : ''
                    }`}
                  >
                    {/* Callsign & Type */}
                    <td className="py-3.5 pr-3">
                      <div className="flex items-center space-x-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: route?.color_token || '#2F5BEA' }}
                        />
                        <div>
                          <div className="font-extrabold text-[#15211D]">{vehicle.callsign}</div>
                          <div className="text-[11px] text-[#68756F]">{vehicle.vehicle_type}</div>
                        </div>
                      </div>
                    </td>

                    {/* Driver */}
                    <td className="py-3.5 pr-3">
                      <div className="font-semibold text-[#15211D]">{vehicle.driver_name}</div>
                      <div className="text-[10px] text-[#68756F] tabular-nums">{vehicle.phone}</div>
                    </td>

                    {/* Status Chip */}
                    <td className="py-3.5 pr-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          vehicle.status === 'active'
                            ? 'bg-[#E2F4EE] text-[#205A46]'
                            : vehicle.status === 'at_risk'
                            ? 'bg-[#FDF4EB] text-[#D78A45]'
                            : 'bg-[#FBECEB] text-[#C6534C]'
                        }`}
                      >
                        {vehicle.status.toUpperCase()}
                      </span>
                    </td>

                    {/* Capacity */}
                    <td className="py-3.5 pr-3 tabular-nums">
                      <div className="font-semibold text-[#15211D]">
                        {vehicle.used_capacity_kg} / {vehicle.capacity_kg} kg
                      </div>
                      <div className="w-24 h-1.5 bg-black/5 rounded-full mt-1 overflow-hidden">
                        <div
                          className="h-full bg-[#205A46] rounded-full"
                          style={{ width: `${capacityPct}%` }}
                        />
                      </div>
                    </td>

                    {/* Progress */}
                    <td className="py-3.5 pr-3 tabular-nums font-semibold text-[#15211D]">
                      {vehicle.completed_stops_count} / {vehicle.assigned_stops_count} stops
                    </td>

                    {/* ETA Deviation */}
                    <td className="py-3.5 pr-3 tabular-nums">
                      {vehicle.eta_deviation_minutes > 0 ? (
                        <span className="font-bold text-[#C6534C]">
                          +{vehicle.eta_deviation_minutes} min late
                        </span>
                      ) : vehicle.eta_deviation_minutes < 0 ? (
                        <span className="font-bold text-[#205A46]">
                          {Math.abs(vehicle.eta_deviation_minutes)} min early
                        </span>
                      ) : (
                        <span className="text-[#205A46] font-medium">On-Schedule</span>
                      )}
                    </td>

                    {/* Freshness */}
                    <td className="py-3.5 pr-3 tabular-nums text-[#68756F] text-[11px]">
                      Just now
                    </td>

                    {/* Action */}
                    <td className="py-3.5 text-right">
                      <ChevronRight className="w-4 h-4 text-[#929E99] inline-block" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Right Drawer: Vehicle Deep Detail */}
      {selectedVehicle && (
        <div className="w-96 glass-panel-strong rounded-3xl p-5 border border-white/80 shadow-2xl flex flex-col justify-between text-xs">
          <div>
            <div className="flex items-start justify-between pb-3 border-b border-black/5">
              <div>
                <span className="text-[10px] uppercase font-bold text-[#929E99]">
                  Vehicle Telemetry Dossier
                </span>
                <h3 className="text-base font-extrabold text-[#15211D]">
                  {selectedVehicle.callsign}
                </h3>
                <p className="text-[#68756F]">{selectedVehicle.vehicle_type}</p>
              </div>
              <button
                onClick={() => setSelectedVehicle(null)}
                className="p-1 rounded-xl hover:bg-black/5 text-[#68756F]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {/* Driver Contact */}
              <div className="p-3 bg-white/80 border border-black/5 rounded-2xl">
                <div className="text-[10px] uppercase font-bold text-[#929E99]">Assigned Driver</div>
                <div className="font-bold text-sm text-[#15211D] mt-0.5">
                  {selectedVehicle.driver_name}
                </div>
                <div className="text-[#205A46] font-semibold mt-1 flex items-center gap-1.5 tabular-nums">
                  <Phone className="w-3.5 h-3.5" />
                  {selectedVehicle.phone}
                </div>
              </div>

              {/* Real-time Telemetry */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-3 bg-white/80 border border-black/5 rounded-2xl">
                  <div className="text-[10px] uppercase font-bold text-[#929E99]">Battery / Fuel</div>
                  <div className="text-sm font-extrabold text-[#205A46] mt-0.5 tabular-nums">
                    {selectedVehicle.battery_or_fuel_pct}%
                  </div>
                </div>

                <div className="p-3 bg-white/80 border border-black/5 rounded-2xl">
                  <div className="text-[10px] uppercase font-bold text-[#929E99]">Speed</div>
                  <div className="text-sm font-extrabold text-[#15211D] mt-0.5 tabular-nums">
                    {selectedVehicle.speed_kmh || 35} km/h
                  </div>
                </div>
              </div>

              {/* Location Coordinates */}
              <div className="p-3 bg-white/80 border border-black/5 rounded-2xl">
                <div className="text-[10px] uppercase font-bold text-[#929E99] flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-[#205A46]" />
                  Last Known Position
                </div>
                <div className="font-mono text-xs text-[#15211D] mt-1 tabular-nums">
                  {selectedVehicle.current_lat
                    ? `${selectedVehicle.current_lat.toFixed(4)}°N, ${selectedVehicle.current_lng?.toFixed(4)}°E`
                    : `Grid X: ${selectedVehicle.current_x}, Y: ${selectedVehicle.current_y}`}
                </div>
              </div>
            </div>
          </div>

          {/* Action button */}
          <div className="pt-4 border-t border-black/5">
            <button
              onClick={() => {
                if (onSelectVehicleForMap) onSelectVehicleForMap(selectedVehicle.id);
              }}
              className="w-full py-2.5 bg-[#17231F] hover:bg-[#205A46] text-white rounded-2xl font-bold transition-all flex items-center justify-center space-x-2 cursor-pointer shadow-sm"
            >
              <Truck className="w-4 h-4" />
              <span>Locate on Command Center Map</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
