import React from 'react';
import { Bell, X, Trash2, CheckCheck, Info, CheckCircle2, AlertTriangle, AlertCircle, Sparkles } from 'lucide-react';
import type { Notification } from '../types';

// =============================================================================
// NotificationCenter — slide-out panel showing recent activity.
// Notifications come from the dataStore (pushed by every component).
// =============================================================================

interface NotificationCenterProps {
  notifications: Notification[];
  setNotifications: React.Dispatch<React.SetStateAction<Notification[]>>;
  onClose: () => void;
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({ notifications, setNotifications, onClose }) => {
  const unreadCount = notifications.filter(n => n.unread).length;

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, unread: false })));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const dismiss = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const markRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, unread: false } : n));
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div
        className="relative flex h-full w-full max-w-md flex-col border-l border-[#2a2d31] bg-[#0f1113]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#2a2d31] px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-600/10 text-red-500">
              <Bell size={18} />
            </div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Inbox</div>
              <h2 className="text-lg font-bold text-white">
                Notifications
                {unreadCount > 0 && (
                  <span className="ml-2 rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold">{unreadCount}</span>
                )}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Actions */}
        {notifications.length > 0 && (
          <div className="flex items-center gap-2 border-b border-[#2a2d31] px-4 py-2">
            <button
              onClick={markAllRead}
              disabled={unreadCount === 0}
              className="flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-semibold text-zinc-300 transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <CheckCheck size={12} /> Mark all read
            </button>
            <button
              onClick={clearAll}
              className="flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-semibold text-zinc-300 transition hover:bg-zinc-800"
            >
              <Trash2 size={12} /> Clear all
            </button>
          </div>
        )}

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center px-8 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-800 text-zinc-500">
                <Bell size={20} />
              </div>
              <div className="mb-1 text-sm font-semibold text-white">No notifications yet</div>
              <div className="text-xs text-zinc-500">
                You'll see activity here as you import inventory, build pull plans, and process orders.
              </div>
            </div>
          ) : (
            <div className="divide-y divide-[#2a2d31]">
              {notifications.map(n => (
                <NotificationRow key={n.id} notification={n} onDismiss={() => dismiss(n.id)} onClick={() => markRead(n.id)} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const NotificationRow: React.FC<{
  notification: Notification;
  onDismiss: () => void;
  onClick: () => void;
}> = ({ notification, onDismiss, onClick }) => {
  const { icon, color } = TYPE_META[notification.type];
  const timeAgo = formatTimeAgo(notification.time);

  return (
    <div
      className={`group relative px-4 py-3 transition hover:bg-[#16181a] ${notification.unread ? 'bg-[#16181a]' : ''}`}
      onClick={onClick}
    >
      <div className="flex gap-3">
        <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded ${color}`}>
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="text-sm font-semibold text-white">{notification.title}</div>
            {notification.unread && (
              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-red-500" aria-label="Unread" />
            )}
          </div>
          <div className="mt-0.5 text-xs text-zinc-400">{notification.message}</div>
          <div className="mt-1 text-[10px] uppercase tracking-wider text-zinc-500">{timeAgo}</div>
        </div>
        <button
          onClick={e => { e.stopPropagation(); onDismiss(); }}
          className="opacity-0 group-hover:opacity-100 rounded p-1 text-zinc-500 hover:bg-zinc-800 hover:text-white"
          aria-label="Dismiss"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
};

const TYPE_META: Record<Notification['type'], { icon: React.ReactNode; color: string }> = {
  INFO: { icon: <Info size={14} />, color: 'bg-blue-600/15 text-blue-400' },
  SUCCESS: { icon: <CheckCircle2 size={14} />, color: 'bg-green-600/15 text-green-400' },
  WARNING: { icon: <AlertTriangle size={14} />, color: 'bg-yellow-600/15 text-yellow-400' },
  ERROR: { icon: <AlertCircle size={14} />, color: 'bg-red-600/15 text-red-400' },
  AI: { icon: <Sparkles size={14} />, color: 'bg-purple-600/15 text-purple-400' },
};

function formatTimeAgo(t: number): string {
  const diff = Date.now() - t;
  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  if (diff < 7 * 86_400_000) return `${Math.floor(diff / 86_400_000)}d ago`;
  return new Date(t).toLocaleDateString();
}

export default NotificationCenter;
