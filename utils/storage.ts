import { logger } from './logger';

export const STORAGE_KEYS = {
  SETUP_DONE: 'vwms.setupDone',
  ACTIVE_TAB: 'vwms.activeTab',
  SETTINGS: 'vwms.settings',
  WAREHOUSES: 'vwms.warehouses',
  DEPARTMENTS: 'vwms.departments',
  RACKS: 'vwms.racks',          // keyed Record<warehouseId, Rack[]>
  FLOOR_PLANS: 'vwms.floorPlans', // keyed Record<warehouseId, WarehouseFloorPlan>
  INVENTORY: 'vwms.inventory',   // Record<warehouseId, InventoryItem[]>
  ORDERS: 'vwms.orders',         // Record<warehouseId, Order[]>
  NOTIFICATIONS: 'vwms.notifications',
} as const;

/**
 * Safely reads and parses JSON from localStorage.
 */
export function loadJSON<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    if (parsed === null || parsed === undefined) return fallback;
    return parsed as T;
  } catch (err) {
    logger.warn(`Failed to read storage key "${key}"`, err);
    return fallback;
  }
}

/**
 * Safely serializes and persists JSON to localStorage.
 */
export function saveJSON(key: string, data: unknown): boolean {
  if (typeof window === 'undefined') return false;
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (err) {
    logger.warn(`Failed to write storage key "${key}"`, err);
    return false;
  }
}

/**
 * Removes a single localStorage key if browser storage is available.
 */
export function removeKey(key: string): void {
  try { localStorage.removeItem(key); } catch { /* noop */ }
}

/**
 * Clears every VWMS-owned key from localStorage.
 */
export function clearAllVWMS(): void {
  try {
    Object.values(STORAGE_KEYS).forEach(k => localStorage.removeItem(k));
  } catch { /* noop */ }
}

/**
 * Generates a short readable id such as "rk-7a3f".
 */
export function shortId(prefix = 'id'): string {
  const randomPart = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID().slice(0, 6)
    : Math.random().toString(36).slice(2, 8);
  return `${prefix}-${randomPart}`;
}

/**
 * Triggers a client-side file download for exported content.
 */
export function downloadFile(filename: string, content: string, mime = 'text/plain'): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function escapeCsvValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  const normalized = String(value);
  const safe = /^[=+\-@]/.test(normalized) ? `'${normalized}` : normalized;
  return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/**
 * Converts rows of plain objects to CSV while guarding against spreadsheet formula injection.
 */
export function toCSV<T extends Record<string, unknown>>(rows: T[], columns?: (keyof T)[]): string {
  if (rows.length === 0) return '';
  const cols = columns ?? (Object.keys(rows[0]) as (keyof T)[]);
  const header = cols.join(',');
  const body = rows.map((row) => cols.map((column) => escapeCsvValue(row[column])).join(',')).join('\n');
  return `${header}\n${body}`;
}
