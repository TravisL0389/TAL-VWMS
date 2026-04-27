// =============================================================================
// Storage helpers — single source of truth for what we persist locally.
// All keys are namespaced under "vwms." so they don't collide with anything
// else on the same origin.
// =============================================================================

export const STORAGE_KEYS = {
  SETUP_DONE: 'vwms.setupDone',
  SETTINGS: 'vwms.settings',
  WAREHOUSES: 'vwms.warehouses',
  DEPARTMENTS: 'vwms.departments',
  RACKS: 'vwms.racks',          // keyed Record<warehouseId, Rack[]>
  INVENTORY: 'vwms.inventory',   // Record<warehouseId, InventoryItem[]>
  ORDERS: 'vwms.orders',         // Record<warehouseId, Order[]>
  NOTIFICATIONS: 'vwms.notifications',
} as const;

export function loadJSON<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    if (parsed === null || parsed === undefined) return fallback;
    return parsed as T;
  } catch (err) {
    console.warn(`[storage] failed to read ${key}:`, err);
    return fallback;
  }
}

export function saveJSON(key: string, data: unknown): boolean {
  if (typeof window === 'undefined') return false;
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (err) {
    console.warn(`[storage] failed to write ${key}:`, err);
    return false;
  }
}

export function removeKey(key: string): void {
  try { localStorage.removeItem(key); } catch { /* noop */ }
}

export function clearAllVWMS(): void {
  try {
    Object.values(STORAGE_KEYS).forEach(k => localStorage.removeItem(k));
  } catch { /* noop */ }
}

// Generate a short, readable id like "rk-7a3f"
export function shortId(prefix = 'id'): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 6)}${Date.now().toString(36).slice(-2)}`;
}

// Download helper used by export buttons
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

// Convert array of plain objects to CSV
export function toCSV<T extends Record<string, any>>(rows: T[], columns?: (keyof T)[]): string {
  if (rows.length === 0) return '';
  const cols = columns ?? (Object.keys(rows[0]) as (keyof T)[]);
  const escape = (v: any) => {
    if (v === null || v === undefined) return '';
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = cols.join(',');
  const body = rows.map(r => cols.map(c => escape(r[c])).join(',')).join('\n');
  return `${header}\n${body}`;
}
