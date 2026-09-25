import React, { Suspense, lazy, useState, useCallback, useEffect, useRef } from 'react';
import {
  LayoutGrid, Package, Map as MapIcon, ClipboardList, BarChart3,
  Settings as SettingsIcon, Bell, ScanLine, Menu, X,
  Plus, Building2, ChevronDown, Sparkles, WifiOff,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useDataStore } from './utils/dataStore';
import { isAIConfigured } from './utils/aiService';
import { STORAGE_KEYS, clearAllVWMS, loadJSON, saveJSON, shortId } from './utils/storage';
import { initializePlatform } from './utils/platform';
import type { Notification, Warehouse } from './types';

import SetupWizard from './components/SetupWizard';
const Dashboard = lazy(() => import('./components/Dashboard'));
const InventoryManager = lazy(() => import('./components/InventoryManager'));
const WarehouseMapView = lazy(() => import('./components/warehouse-designer/WarehouseDesigner'));
const SmartPullSystem = lazy(() => import('./components/SmartPullSystem'));
const ReportingModule = lazy(() => import('./components/ReportingModule'));
const ScannerOverlay = lazy(() => import('./components/ScannerOverlay'));
const NotificationCenter = lazy(() => import('./components/NotificationCenter'));
const SettingsPanel = lazy(() => import('./components/SettingsPanel'));

// =============================================================================
// App — top-level shell.
//   - Renders SetupWizard until first-run setup is complete.
//   - Side nav is dockable LEFT or RIGHT (settings.sidebarPosition).
//   - Mobile uses a hamburger drawer.
//   - Top bar shows brand, warehouse picker, notifications, scan, settings.
// =============================================================================

type Tab = 'dashboard' | 'inventory' | 'map' | 'pull' | 'analytics';

const NAV: { id: Tab; label: string; icon: LucideIcon }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutGrid },
  { id: 'inventory', label: 'Inventory', icon: Package },
  { id: 'map',       label: 'Layout',    icon: MapIcon },
  { id: 'pull',      label: 'Smart Pull', icon: ClipboardList },
  { id: 'analytics', label: 'Reports',   icon: BarChart3 },
];

const VALID_TABS = new Set<Tab>(NAV.map(item => item.id));

function loadInitialTab(): Tab {
  const storedTab = loadJSON<unknown>(STORAGE_KEYS.ACTIVE_TAB, 'dashboard');
  return typeof storedTab === 'string' && VALID_TABS.has(storedTab as Tab)
    ? storedTab as Tab
    : 'dashboard';
}

type ToastState = Pick<Notification, 'type' | 'title' | 'message'>;

const LoadingState: React.FC<{ label?: string }> = ({ label = 'Loading workspace' }) => (
  <div className="flex min-h-[16rem] items-center justify-center px-4 py-8">
    <div className="rounded-xl border border-[#b6aa9b] bg-[#ede6dc] px-5 py-4 text-center shadow-lg">
      <div className="text-[10px] font-black uppercase tracking-[0.28em] text-[#7d7569]">{label}</div>
      <div className="mt-2 text-sm text-[#5d564d]">Preparing the next screen…</div>
    </div>
  </div>
);

const App: React.FC = () => {
  const store = useDataStore();
  const [tab, setTab] = useState<Tab>(loadInitialTab);
  const [navOpen, setNavOpen] = useState(false);          // mobile nav drawer
  const [scannerOpen, setScannerOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [whPickerOpen, setWhPickerOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const [toast, setToast] = useState<ToastState | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const sidebarOnRight = store.settings.sidebarPosition === 'RIGHT';

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const root = document.getElementById('root');

    const prevHtml = {
      overflowX: html.style.overflowX,
      overflowY: html.style.overflowY,
      height: html.style.height,
      minHeight: html.style.minHeight,
      touchAction: html.style.touchAction,
      overscrollBehaviorY: html.style.overscrollBehaviorY,
      webkitOverflowScrolling: html.style.getPropertyValue('-webkit-overflow-scrolling'),
    };
    const prevBody = {
      overflowX: body.style.overflowX,
      overflowY: body.style.overflowY,
      height: body.style.height,
      minHeight: body.style.minHeight,
      touchAction: body.style.touchAction,
      overscrollBehaviorY: body.style.overscrollBehaviorY,
      webkitOverflowScrolling: body.style.getPropertyValue('-webkit-overflow-scrolling'),
    };
    const prevRoot = root
      ? {
          height: root.style.height,
          minHeight: root.style.minHeight,
          overflowX: root.style.overflowX,
          overflowY: root.style.overflowY,
          touchAction: root.style.touchAction,
          overscrollBehaviorY: root.style.overscrollBehaviorY,
          webkitOverflowScrolling: root.style.getPropertyValue('-webkit-overflow-scrolling'),
        }
      : null;

    html.style.overflowX = 'hidden';
    html.style.height = 'auto';
    html.style.minHeight = '100%';
    html.style.overflowY = 'auto';
    html.style.touchAction = 'pan-y';
    html.style.overscrollBehaviorY = 'auto';
    html.style.setProperty('-webkit-overflow-scrolling', 'touch');

    body.style.overflowX = 'hidden';
    body.style.height = 'auto';
    body.style.minHeight = '100vh';
    body.style.overflowY = 'auto';
    body.style.touchAction = 'pan-y';
    body.style.overscrollBehaviorY = 'auto';
    body.style.setProperty('-webkit-overflow-scrolling', 'touch');

    if (root) {
      root.style.height = 'auto';
      root.style.minHeight = '100vh';
      root.style.overflowX = 'hidden';
      root.style.overflowY = 'auto';
      root.style.touchAction = 'pan-y';
      root.style.overscrollBehaviorY = 'auto';
      root.style.setProperty('-webkit-overflow-scrolling', 'touch');
    }

    return () => {
      html.style.overflowX = prevHtml.overflowX;
      html.style.overflowY = prevHtml.overflowY;
      html.style.height = prevHtml.height;
      html.style.minHeight = prevHtml.minHeight;
      html.style.touchAction = prevHtml.touchAction;
      html.style.overscrollBehaviorY = prevHtml.overscrollBehaviorY;
      html.style.setProperty('-webkit-overflow-scrolling', prevHtml.webkitOverflowScrolling);

      body.style.overflowX = prevBody.overflowX;
      body.style.overflowY = prevBody.overflowY;
      body.style.height = prevBody.height;
      body.style.minHeight = prevBody.minHeight;
      body.style.touchAction = prevBody.touchAction;
      body.style.overscrollBehaviorY = prevBody.overscrollBehaviorY;
      body.style.setProperty('-webkit-overflow-scrolling', prevBody.webkitOverflowScrolling);

      if (root && prevRoot) {
        root.style.height = prevRoot.height;
        root.style.minHeight = prevRoot.minHeight;
        root.style.overflowX = prevRoot.overflowX;
        root.style.overflowY = prevRoot.overflowY;
        root.style.touchAction = prevRoot.touchAction;
        root.style.overscrollBehaviorY = prevRoot.overscrollBehaviorY;
        root.style.setProperty('-webkit-overflow-scrolling', prevRoot.webkitOverflowScrolling);
      }
    };
  }, []);

  useEffect(() => {
    saveJSON(STORAGE_KEYS.ACTIVE_TAB, tab);
  }, [tab]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    };
  }, []);

  const handleBackAction = useCallback(() => {
    if (settingsOpen) {
      setSettingsOpen(false);
      return true;
    }
    if (scannerOpen) {
      setScannerOpen(false);
      return true;
    }
    if (notifOpen) {
      setNotifOpen(false);
      return true;
    }
    if (whPickerOpen) {
      setWhPickerOpen(false);
      return true;
    }
    if (navOpen) {
      setNavOpen(false);
      return true;
    }

    const nestedBack = new Event('vwms:back', { cancelable: true });
    window.dispatchEvent(nestedBack);
    if (nestedBack.defaultPrevented) return true;

    if (tab !== 'dashboard') {
      setTab('dashboard');
      return true;
    }
    return false;
  }, [navOpen, notifOpen, scannerOpen, settingsOpen, tab, whPickerOpen]);

  useEffect(() => {
    let disposed = false;
    let disposePlatform = () => undefined;
    void initializePlatform({
      onBack: handleBackAction,
      onNetworkChange: setIsOnline,
    }).then(dispose => {
      if (disposed) dispose();
      else disposePlatform = dispose;
    });

    return () => {
      disposed = true;
      disposePlatform();
    };
  }, [handleBackAction]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && handleBackAction()) event.preventDefault();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleBackAction]);

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------
  const resetSetup = useCallback(() => {
    store.setSetupDone(false);
  }, [store]);

  const resetAll = useCallback(() => {
    clearAllVWMS();
    window.location.reload();
  }, []);

  const notify = useCallback((notification: Omit<Notification, 'id' | 'time' | 'unread'> & Partial<Pick<Notification, 'unread'>>) => {
    store.pushNotification(notification);
    setToast({
      type: notification.type,
      title: notification.title,
      message: notification.message,
    });
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(null), 3600);
  }, [store]);

  const addWarehouse = useCallback(() => {
    const wh: Warehouse = {
      id: shortId('wh'),
      name: `Warehouse ${store.warehouses.length + 1}`,
      location: '',
      createdAt: Date.now(),
    };
    store.setWarehouses(prev => [...prev, wh]);
    store.setSettings(s => ({ ...s, warehouseId: wh.id }));
    setWhPickerOpen(false);
    notify({ type: 'INFO', title: 'Warehouse created', message: wh.name });
  }, [notify, store]);

  const enterWarehouseExperience = useCallback(() => {
    saveJSON(STORAGE_KEYS.ACTIVE_TAB, 'map');
    setTab('map');
    setNavOpen(false);
    setScannerOpen(false);
    setNotifOpen(false);
    setSettingsOpen(false);
    setWhPickerOpen(false);
    store.setSetupDone(true);
  }, [store]);

  // -------------------------------------------------------------------------
  // First-run setup
  // -------------------------------------------------------------------------
  if (!store.setupDone) {
    return (
      <SetupWizard
        onComplete={({ warehouse, departments, brandName }) => {
          store.setWarehouses([warehouse]);
          store.setDepartments(departments);
          store.setSettings(s => ({ ...s, warehouseId: warehouse.id, brandName: brandName || s.brandName }));
          notify({
            type: 'SUCCESS',
            title: 'Setup complete',
            message: `${warehouse.name} is ready. Start by adding inventory or laying out your floor.`,
          });
          enterWarehouseExperience();
        }}
        onSkip={enterWarehouseExperience}
      />
    );
  }

  // -------------------------------------------------------------------------
  // Active warehouse
  // -------------------------------------------------------------------------
  const activeWarehouse = store.activeWarehouse;
  const activeWarehouseName = activeWarehouse?.name || 'Warehouse';
  const unreadCount = store.notifications.filter(n => n.unread).length;

  // -------------------------------------------------------------------------
  // Sidebar nav
  // -------------------------------------------------------------------------
  const sideNav = (
    <nav
      className="flex h-full w-full flex-col bg-[#ede6dc]"
      style={{ borderInlineEnd: !sidebarOnRight ? '1px solid #b6aa9b' : undefined, borderInlineStart: sidebarOnRight ? '1px solid #b6aa9b' : undefined }}
    >
      <div className="flex items-center justify-between gap-2 border-b border-[#b6aa9b] px-4 py-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#5d7f81] text-white">
            <Package size={18} />
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-bold text-[#2b2925]">{store.settings.brandName || 'VWMS'}</div>
            <div className="text-[10px] uppercase tracking-widest text-[#8a8174]">Warehouse OS</div>
          </div>
        </div>
        <button type="button"
          onClick={() => setNavOpen(false)}
          className="rounded p-1.5 text-[#7d7569] hover:bg-[#d1c8bb] hover:text-[#2b2925] lg:hidden"
          aria-label="Close menu"
        >
          <X size={16} />
        </button>
      </div>

      <ul className="flex-1 space-y-1 overflow-y-auto p-2">
        {NAV.map(item => {
          const Icon = item.icon;
          const isActive = tab === item.id;
          return (
            <li key={item.id}>
              <button type="button"
                onClick={() => { setTab(item.id); setNavOpen(false); }}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
                  isActive
                    ? 'bg-[#5d7f81] text-white'
                    : 'text-[#5f5950] hover:bg-[#dad1c5] hover:text-[#2b2925]'
                }`}
              >
                <Icon size={16} />
                <span>{item.label}</span>
              </button>
            </li>
          );
        })}
      </ul>

      {/* AI status */}
      <div className="border-t border-[#b6aa9b] p-3">
        <div className="flex items-center gap-2 rounded-lg bg-[#ddd5c8] px-3 py-2 text-[11px]">
          <Sparkles size={12} className={isAIConfigured() && store.settings.enableAI ? 'text-[#5d7f81]' : 'text-[#9a9184]'} />
          <span className={isAIConfigured() && store.settings.enableAI ? 'text-[#5d7f81]' : 'text-[#8a8174]'}>
            {isAIConfigured() && store.settings.enableAI ? 'AI Ready' : 'Heuristic Mode'}
          </span>
        </div>
      </div>

      {/* Bottom action: Settings */}
      <div className="border-t border-[#b6aa9b] p-2">
        <button type="button"
          onClick={() => { setSettingsOpen(true); setNavOpen(false); }}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-[#5f5950] transition hover:bg-[#dad1c5] hover:text-[#2b2925]"
        >
          <SettingsIcon size={16} />
          <span>Settings</span>
        </button>
      </div>
    </nav>
  );

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <div
      className="relative flex min-h-screen w-full overflow-x-hidden bg-[#ddd7cc] text-[#2b2925] lg:h-screen lg:overflow-hidden"
      style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y', overscrollBehaviorY: 'auto' }}
    >
      {/* Desktop sidebar — left dock */}
      {!sidebarOnRight && (
        <div className="hidden h-full w-60 shrink-0 xl:w-64 2xl:w-72 lg:block">{sideNav}</div>
      )}

      {/* Mobile drawer */}
      {navOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setNavOpen(false)}>
          <div className="absolute inset-0 bg-[#8f8679]/40" />
          <div
            className={`absolute top-0 ${sidebarOnRight ? 'right-0' : 'left-0'} h-full w-[min(18rem,88vw)]`}
            onClick={e => e.stopPropagation()}
          >
            {sideNav}
          </div>
        </div>
      )}

      {/* Main column */}
      <div className="flex min-h-screen min-w-0 flex-1 flex-col lg:h-full lg:min-h-0">
        {/* Top bar */}
        <header className="flex shrink-0 flex-wrap items-start justify-between gap-2 border-b border-[#b6aa9b] bg-[#ede6dc] px-3 py-3 sm:px-4 min-[769px]:items-center">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <button type="button"
              onClick={() => setNavOpen(true)}
              className="rounded p-2 text-[#7d7569] hover:bg-[#d1c8bb] hover:text-[#2b2925] lg:hidden"
              aria-label="Open menu"
            >
              <Menu size={18} />
            </button>

            {/* Warehouse picker */}
            <div className="relative min-w-0">
              <button type="button"
                onClick={() => setWhPickerOpen(o => !o)}
                className="flex w-full max-w-[min(18rem,70vw)] items-center gap-2 rounded-lg border border-[#bfb2a2] bg-[#ddd5c8] px-3 py-2 text-left transition hover:bg-[#d1c8bb] min-[481px]:w-auto"
              >
                <Building2 size={14} className="shrink-0 text-[#72695d]" />
                <div className="min-w-0">
                  <div className="text-[9px] font-black uppercase tracking-widest text-[#7d7569]">Active</div>
                  <div className="truncate text-sm font-semibold text-[#2b2925]">{activeWarehouseName}</div>
                </div>
                <ChevronDown size={14} className="shrink-0 text-[#72695d]" />
              </button>

              {whPickerOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setWhPickerOpen(false)} />
                  <div className="absolute left-0 top-full z-40 mt-1 w-[min(18rem,calc(100vw-2rem))] rounded-lg border border-[#b6aa9b] bg-[#ede6dc] p-1 shadow-2xl">
                    {store.warehouses.map(wh => (
                      <button type="button"
                        key={wh.id}
                        onClick={() => {
                          store.setSettings(s => ({ ...s, warehouseId: wh.id }));
                          setWhPickerOpen(false);
                        }}
                        className={`flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm transition ${
                          wh.id === store.settings.warehouseId
                            ? 'bg-[#5d7f81]/12 text-[#2b2925]'
                            : 'text-[#4f4a43] hover:bg-[#d8cfc2]'
                        }`}
                      >
                        <Building2 size={12} className="text-[#7d7569]" />
                        <span className="flex-1 truncate">{wh.name}</span>
                        {wh.id === store.settings.warehouseId && (
                          <span className="text-[10px] font-bold uppercase text-[#5d7f81]">Active</span>
                        )}
                      </button>
                    ))}
                    <div className="my-1 border-t border-[#b6aa9b]" />
                    <button type="button"
                      onClick={addWarehouse}
                      className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm text-[#5f5950] transition hover:bg-[#d8cfc2] hover:text-[#2b2925]"
                    >
                      <Plus size={12} />
                      <span>Add Warehouse</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Right-side icons */}
          <div className="ml-auto flex shrink-0 items-center gap-1">
            <IconBtn
              onClick={() => setScannerOpen(true)}
              icon={<ScanLine size={16} />}
              label="Scan"
            />
            <IconBtn
              onClick={() => setNotifOpen(true)}
              icon={<Bell size={16} />}
              label="Notifications"
              badge={unreadCount}
            />
            <IconBtn
              onClick={() => setSettingsOpen(true)}
              icon={<SettingsIcon size={16} />}
              label="Settings"
            />
          </div>
        </header>

        {!isOnline && (
          <div className="flex shrink-0 items-center justify-center gap-2 border-b border-amber-400/40 bg-amber-100 px-3 py-2 text-xs font-semibold text-amber-950" role="status">
            <WifiOff size={14} aria-hidden="true" />
            Offline mode: saved warehouse data remains available and changes will stay on this device.
          </div>
        )}

        {/* Main content */}
        <main
          data-scroll-region="app-main"
          className={`flex-1 overflow-visible lg:min-h-0 lg:overflow-x-hidden ${
            tab === 'map' ? 'lg:overflow-y-hidden' : 'lg:overflow-y-auto lg:overscroll-contain'
          }`}
          style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y', overscrollBehaviorY: 'auto' }}
        >
          <Suspense fallback={<LoadingState label="Loading screen" />}>
            {tab === 'dashboard' && (
              <Dashboard
                warehouseName={activeWarehouseName}
                inventory={store.inventory}
                racks={store.racks}
                orders={store.orders}
                departments={store.departments}
                settings={store.settings}
                onNavigate={(nextTab) => setTab(nextTab === 'analytics' ? 'analytics' : nextTab as Tab)}
              />
            )}
            {tab === 'inventory' && (
              <InventoryManager
                inventory={store.inventory}
                setInventory={store.setInventory}
                departments={store.departments}
                racks={store.racks}
                warehouseId={store.settings.warehouseId}
                settings={store.settings}
                onNotify={notify}
              />
            )}
            {tab === 'map' && (
              <WarehouseMapView
                racks={store.racks}
                setRacks={store.setRacks}
                inventory={store.inventory}
                departments={store.departments}
                warehouseId={store.settings.warehouseId}
                settings={store.settings}
                onSettingsChange={(patch) => store.setSettings(s => ({ ...s, ...patch }))}
                onNotify={notify}
              />
            )}
            {tab === 'pull' && (
              <SmartPullSystem
                inventory={store.inventory}
                setInventory={store.setInventory}
                orders={store.orders}
                setOrders={store.setOrders}
                racks={store.racks}
                departments={store.departments}
                warehouseId={store.settings.warehouseId}
                settings={store.settings}
                onNotify={notify}
              />
            )}
            {tab === 'analytics' && (
              <ReportingModule
                inventory={store.inventory}
                orders={store.orders}
                racks={store.racks}
                departments={store.departments}
                warehouseId={store.settings.warehouseId}
                warehouseName={activeWarehouseName}
                settings={store.settings}
                onNotify={notify}
              />
            )}
          </Suspense>
        </main>
      </div>

      {/* Desktop sidebar — right dock */}
      {sidebarOnRight && (
        <div className="hidden h-full w-60 shrink-0 xl:w-64 2xl:w-72 lg:block">{sideNav}</div>
      )}

      {/* Overlays */}
      {scannerOpen && (
        <Suspense fallback={<LoadingState label="Loading scanner" />}>
          <ScannerOverlay
            inventory={store.inventory}
            departments={store.departments}
            onClose={() => setScannerOpen(false)}
            onItemFound={() => {
              setScannerOpen(false);
              setTab('inventory');
            }}
          />
        </Suspense>
      )}
      {notifOpen && (
        <Suspense fallback={<LoadingState label="Loading notifications" />}>
          <NotificationCenter
            notifications={store.notifications}
            setNotifications={store.setNotifications}
            onClose={() => setNotifOpen(false)}
          />
        </Suspense>
      )}
      {settingsOpen && (
        <Suspense fallback={<LoadingState label="Loading settings" />}>
          <SettingsPanel
            settings={store.settings}
            setSettings={store.setSettings}
            departments={store.departments}
            setDepartments={store.setDepartments}
            warehouses={store.warehouses}
            setWarehouses={store.setWarehouses}
            onResetSetup={resetSetup}
            onResetAll={resetAll}
            onClose={() => setSettingsOpen(false)}
          />
        </Suspense>
      )}

      {toast && (
        <div
          className="fixed bottom-4 right-4 z-[230] max-w-[min(24rem,calc(100vw-2rem))] rounded-xl border border-[#b6aa9b] bg-[#f4f0e8] p-4 text-[#2b2925] shadow-2xl"
          role="status"
          aria-live="polite"
        >
          <div className="flex items-start gap-3">
            <div className={`mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full ${toast.type === 'ERROR' ? 'bg-red-500' : toast.type === 'WARNING' ? 'bg-amber-500' : toast.type === 'SUCCESS' ? 'bg-emerald-600' : 'bg-[#5d7f81]'}`} />
            <div className="min-w-0">
              <div className="text-xs font-black uppercase tracking-widest">{toast.title}</div>
              {toast.message && <div className="mt-1 text-sm leading-snug text-[#665e54]">{toast.message}</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const IconBtn: React.FC<{ onClick: () => void; icon: React.ReactNode; label: string; badge?: number }> = ({ onClick, icon, label, badge }) => (
  <button type="button"
    onClick={onClick}
    title={label}
    aria-label={label}
    className="relative flex h-9 w-9 items-center justify-center rounded-lg text-[#72695d] transition hover:bg-[#d1c8bb] hover:text-[#2b2925]"
  >
    {icon}
    {badge !== undefined && badge > 0 && (
      <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#5d7f81] px-1 text-[9px] font-bold text-white">
        {badge > 9 ? '9+' : badge}
      </span>
    )}
  </button>
);

export default App;
