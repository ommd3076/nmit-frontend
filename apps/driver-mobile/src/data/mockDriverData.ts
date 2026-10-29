export interface DriverStop {
  id: string;
  sequence: number;
  customerName: string;
  address: string;
  windowStart: string;
  windowEnd: string;
  eta: string;
  demandKg: number;
  status: 'completed' | 'in_transit' | 'pending' | 'at_risk';
  isLocked: boolean;
  notes?: string;
  contactName: string;
  contactPhone: string;
}

export interface DockChecklistItem {
  id: string;
  title: string;
  description: string;
  checked: boolean;
  category: 'safety' | 'cargo' | 'document';
}

export const DRIVER_PROFILE = {
  driverId: 'DRV-BLR-084',
  name: 'Ramesh Gowda',
  phone: '+91 98450 12345',
  vehicleCallsign: 'EV-ACE-01',
  vehicleModel: 'Tata Ace EV Pro (2026)',
  licenseNumber: 'KA-01-2022-009841',
  rating: 4.92,
  batteryPct: 82,
  currentPayloadKg: 420,
  maxPayloadKg: 500,
  speedKmh: 34,
  locationLabel: 'Indiranagar 100ft Rd, Bengaluru',
  todayEarningsInr: 2450,
  assumedRateLabel: 'assumed rate ₹83/$'
};

export const DRIVER_STOPS: DriverStop[] = [
  {
    id: 'stp-01',
    sequence: 1,
    customerName: 'HealthKart Fulfilment Hub',
    address: 'Indiranagar 12th Main, Bengaluru',
    windowStart: '14:00',
    windowEnd: '14:30',
    eta: '14:12 IST (simulated)',
    demandKg: 85,
    status: 'completed',
    isLocked: true,
    contactName: 'Anil Kumar',
    contactPhone: '+91 98765 11001'
  },
  {
    id: 'stp-02',
    sequence: 2,
    customerName: 'Apollo Pharmacy Regional Hub',
    address: 'Koramangala 4th Block, Bengaluru',
    windowStart: '14:30',
    windowEnd: '15:00',
    eta: '14:42 IST (simulated)',
    demandKg: 120,
    status: 'in_transit',
    isLocked: false,
    notes: 'Temperature-controlled cargo: keep sealed at 4°C',
    contactName: 'Priya Sharma',
    contactPhone: '+91 98765 11002'
  },
  {
    id: 'stp-03',
    sequence: 3,
    customerName: 'BigBasket Distribution Center',
    address: 'HSR Layout Sector 1, Bengaluru',
    windowStart: '15:15',
    windowEnd: '15:45',
    eta: '15:32 IST (simulated)',
    demandKg: 110,
    status: 'pending',
    isLocked: false,
    contactName: 'Suresh Babu',
    contactPhone: '+91 98765 11003'
  },
  {
    id: 'stp-04',
    sequence: 4,
    customerName: 'Croma Logistics Point',
    address: 'Bellandur EcoSpace, Bengaluru',
    windowStart: '16:00',
    windowEnd: '16:45',
    eta: '16:38 IST (simulated)',
    demandKg: 105,
    status: 'at_risk',
    isLocked: false,
    notes: 'Corridor congestion: Outer Ring Road bypass recommended',
    contactName: 'Deepak Rao',
    contactPhone: '+91 98765 11004'
  }
];

export const DOCK_CHECKLIST: DockChecklistItem[] = [
  {
    id: 'chk-1',
    title: 'Cold-Chain Temp Audit',
    description: 'Chamber temperature locked at 4.2°C (limit: 2°C - 8°C)',
    checked: true,
    category: 'cargo'
  },
  {
    id: 'chk-2',
    title: 'Pallet Tie-Down Straps',
    description: 'Cargo ratchet straps tensioned to 250 daN',
    checked: true,
    category: 'safety'
  },
  {
    id: 'chk-3',
    title: 'Electronic Gate Pass',
    description: 'QR Code #GP-2026-BLR-8921 scanned at Hub Gate 3',
    checked: true,
    category: 'document'
  },
  {
    id: 'chk-4',
    title: 'Battery Reserve Check',
    description: '82% SoC verified (>60% required for remaining shift)',
    checked: true,
    category: 'safety'
  },
  {
    id: 'chk-5',
    title: 'Tamper-Evident Cargo Seal',
    description: 'Seal #SEC-9941 intact across rear roller doors',
    checked: false,
    category: 'cargo'
  }
];
