import { Platform } from 'react-native';
import type { DriverIdentity } from '../api/client';

const KEY = 'arq.driver.session.v1';
export type SessionPersistence = 'persistent' | 'ephemeral';

// Never persist native bearer tokens without a secure-storage dependency. When
// browser storage is unavailable (SSR, privacy mode, or quota/security error),
// pairing still works for the current in-memory app session.
function browserSessionStorage(): Storage | null {
  if (Platform.OS !== 'web') return null;
  try {
    if (typeof window === 'undefined') return null;
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function isValidIdentity(value: unknown): value is DriverIdentity {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<DriverIdentity>;
  const expiresAt = typeof candidate.expires_at === 'string' ? Date.parse(candidate.expires_at) : NaN;
  return typeof candidate.token === 'string' && candidate.token.trim().length > 0 &&
    typeof candidate.driver_id === 'string' && candidate.driver_id.trim().length > 0 &&
    typeof candidate.driver_name === 'string' &&
    typeof candidate.vehicle_id === 'string' && candidate.vehicle_id.trim().length > 0 &&
    Number.isFinite(expiresAt) && expiresAt > Date.now();
}

export const sessionStore = {
  async load(): Promise<DriverIdentity | null> {
    const storage = browserSessionStorage();
    if (!storage) return null;
    try {
      const raw = storage.getItem(KEY);
      if (!raw) return null;
      const value: unknown = JSON.parse(raw);
      if (!isValidIdentity(value)) {
        try { storage.removeItem(KEY); } catch { /* Storage became unavailable. */ }
        return null;
      }
      return value;
    } catch {
      try { storage.removeItem(KEY); } catch { /* Storage became unavailable. */ }
      return null;
    }
  },
  async save(value: DriverIdentity): Promise<SessionPersistence> {
    const storage = browserSessionStorage();
    if (!storage) return 'ephemeral';
    try {
      storage.setItem(KEY, JSON.stringify(value));
      return 'persistent';
    } catch {
      // Avoid a stale session being restored on the next reload after a
      // failed write; callers keep the newly paired session in app memory.
      try { storage.removeItem(KEY); } catch { /* Storage may be fully blocked. */ }
      return 'ephemeral';
    }
  },
  async clear(): Promise<void> {
    const storage = browserSessionStorage();
    if (!storage) return;
    try { storage.removeItem(KEY); } catch { /* Clearing in-memory state remains safe. */ }
  },
};

export function routePairMatches(
  state: { driver_id: string; vehicle_id: string; route_version: number; manifest_revision: number },
  manifest: { driver_id: string; vehicle_id: string; route_version: number; version: number },
): boolean {
  return typeof state.driver_id === 'string' && state.driver_id.trim().length > 0 &&
    typeof state.vehicle_id === 'string' && state.vehicle_id.trim().length > 0 &&
    state.driver_id === manifest.driver_id && state.vehicle_id === manifest.vehicle_id &&
    Number.isSafeInteger(state.route_version) && state.route_version >= 0 &&
    Number.isSafeInteger(manifest.route_version) && manifest.route_version >= 0 &&
    Number.isSafeInteger(state.manifest_revision) && state.manifest_revision >= 0 &&
    Number.isSafeInteger(manifest.version) && manifest.version >= 0 &&
    state.route_version === manifest.route_version && state.manifest_revision === manifest.version;
}
