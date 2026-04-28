import React, { useState, useCallback, useEffect } from 'react';
import {
  LayoutGrid, Package, Map as MapIcon, ClipboardList, BarChart3,
  Settings as SettingsIcon, Bell, ScanLine, Menu, X,
  Plus, Building2, ChevronDown, Sparkles,
} from 'lucide-react';
import { useDataStore } from './utils/dataStore';
import { isAIConfigured } from './utils/aiService';
import { clearAllVWMS, shortId } from './utils/storage';
import type { Warehouse } from './types';

import SetupWizard from './components/SetupWizard';
import Dashboard from './components/Dashboard';
import InventoryManager from './components/InventoryManager';
import WarehouseMapView from './components/WarehouseMapView';
import SmartPullSystem from './components/SmartPullSystem';
import ReportingModule from './components/ReportingModule';
import ScannerOverlay from './components/ScannerOverlay';
import NotificationCenter from './components/NotificationCenter';
import SettingsPanel from './components/SettingsPanel';

// =============================================================================
// App — top-level shell.
//   - Renders SetupWizard until first-run setup is complete.
//   - Side nav is dockable LEFT or RIGHT (settings.sidebarPosition).
//   - Mobile uses a hamburger drawer.
//   - Top bar shows brand, warehouse picker, notifications, scan, settings.
// =============================================================================

type Tab = 'dashboard' | 'inventory' | 'map' | 'pull' | 'analytics';

const NAV: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutGrid },
  { id: 'inventory', label: 'Inventory', icon: Package },
  { id: 'map',       label: 'Layout',    icon: MapIcon },
  { id: 'pull',      label: 'Smart Pull', icon: ClipboardList },
  { id: 'analytics', label: 'Reports',   icon: BarChart3 },
];

const App: React.FC = () => {
  const store = useDataStore();
  const [tab, setTab] = useState<Tab>('dashboard');
  const [navOpen, setNavOpen] = useState(false);          // mobile nav drawer
  const [scannerOpen, setScannerOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [whPickerOpen, setWhPickerOpen] = useState(false);

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
    store.pushNotification({ type: 'INFO', title: 'Warehouse created', message: wh.name });
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
          store.setSetupDone(true);
          store.pushNotification({
            type: 'SUCCESS',
            title: 'Setup complete',
            message: `${warehouse.name} is ready. Start by adding inventory or laying out your floor.`,
          });
        }}
        onSkip={() => store.setSetupDone(true)}
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
        <button
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
              <button
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
        <button
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
        <div className="hidden h-full w-60 shrink-0 lg:block">{sideNav}</div>
      )}

      {/* Mobile drawer */}
      {navOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setNavOpen(false)}>
          <div className="absolute inset-0 bg-[#8f8679]/40" />
          <div
            className={`absolute top-0 ${sidebarOnRight ? 'right-0' : 'left-0'} h-full w-72 max-w-[85vw]`}
            onClick={e => e.stopPropagation()}
          >
            {sideNav}
          </div>
        </div>
      )}

      {/* Main column */}
      <div className="flex min-h-screen flex-1 flex-col lg:h-full lg:min-h-0">
        {/* Top bar */}
        <header className="flex shrink-0 items-center justify-between gap-2 border-b border-[#b6aa9b] bg-[#ede6dc] px-3 py-3 sm:px-4">
          <div className="flex min-w-0 items-center gap-2">
            <button
              onClick={() => setNavOpen(true)}
              className="rounded p-2 text-[#7d7569] hover:bg-[#d1c8bb] hover:text-[#2b2925] lg:hidden"
              aria-label="Open menu"
            >
              <Menu size={18} />
            </button>

            {/* Warehouse picker */}
            <div className="relative min-w-0">
              <button
                onClick={() => setWhPickerOpen(o => !o)}
                className="flex max-w-full items-center gap-2 rounded-lg border border-[#bfb2a2] bg-[#ddd5c8] px-3 py-2 text-left transition hover:bg-[#d1c8bb]"
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
                  <div className="absolute left-0 top-full z-40 mt-1 w-64 rounded-lg border border-[#b6aa9b] bg-[#ede6dc] p-1 shadow-2xl">
                    {store.warehouses.map(wh => (
                      <button
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
                    <button
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
          <div className="flex items-center gap-1">
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

        {/* Main content */}
        <main
          className="flex-1 overflow-visible lg:overflow-x-hidden lg:overflow-y-auto"
          style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y', overscrollBehaviorY: 'auto' }}
        >
          {tab === 'dashboard' && (
            <Dashboard
              warehouseName={activeWarehouseName}
              inventory={store.inventory}
              racks={store.racks}
              orders={store.orders}
              departments={store.departments}
              settings={store.settings}
              onNavigate={(t) => setTab(t === 'analytics' ? 'analytics' : t as Tab)}
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
              onNotify={store.pushNotification}
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
              onNotify={store.pushNotification}
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
              onNotify={store.pushNotification}
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
              onNotify={store.pushNotification}
            />
          )}
        </main>
      </div>

      {/* Desktop sidebar — right dock */}
      {sidebarOnRight && (
        <div className="hidden h-full w-60 shrink-0 lg:block">{sideNav}</div>
      )}

      {/* Overlays */}
      {scannerOpen && (
        <ScannerOverlay
          inventory={store.inventory}
          departments={store.departments}
          onClose={() => setScannerOpen(false)}
          onItemFound={() => {
            setScannerOpen(false);
            setTab('inventory');
          }}
        />
      )}
      {notifOpen && (
        <NotificationCenter
          notifications={store.notifications}
          setNotifications={store.setNotifications}
          onClose={() => setNotifOpen(false)}
        />
      )}
      {settingsOpen && (
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
      )}
    </div>
  );
};

const IconBtn: React.FC<{ onClick: () => void; icon: React.ReactNode; label: string; badge?: number }> = ({ onClick, icon, label, badge }) => (
  <button
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
