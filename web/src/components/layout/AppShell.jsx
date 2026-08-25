import { NavLink, Outlet } from 'react-router-dom';
import clsx from 'clsx';
import { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useSocket, useSocketEvent } from '../../context/SocketContext';
import { ROLES, ROLE_LABELS } from '../../constants';

const NAV_ITEMS = [
  { to: '/', label: 'Overview', icon: '📊', end: true },
  { to: '/map', label: 'Live Risk Map', icon: '🗺️' },
  { to: '/sos', label: 'SOS Alerts', icon: '🆘' },
  { to: '/relocation', label: 'Relocation Planner', icon: '🚚' },
  { to: '/resources', label: 'Resource Monitor', icon: '📦' },
  { to: '/routes-response', label: 'Routes & Response', icon: '🚨' },
  { to: '/verification', label: 'Verification Queue', icon: '✅' },
  { to: '/reports', label: 'Reports & Export', icon: '📄' },
  { to: '/audit', label: 'Audit Log', icon: '🛡️', roles: [ROLES.ADMIN] }
];

export default function AppShell() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const { connected } = useSocket();
  const [liveEventCount, setLiveEventCount] = useState(0);

  // Lightweight "something happened" pulse in the topbar - individual pages
  // subscribe to the specific events they need to actually refresh their data.
  useSocketEvent('sos:new', () => setLiveEventCount((c) => c + 1));
  useSocketEvent('alert:new', () => setLiveEventCount((c) => c + 1));
  useSocketEvent('relocationPlan:updated', () => setLiveEventCount((c) => c + 1));
  useSocketEvent('safeSite:updated', () => setLiveEventCount((c) => c + 1));

  const visibleItems = NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(user?.role));

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-100">
      <aside className="flex w-60 flex-shrink-0 flex-col border-r border-slate-200 bg-slate-950 text-slate-100">
        <div className="flex items-center gap-2 px-5 py-5">
          <span className="text-xl">🛡️</span>
          <div>
            <p className="text-sm font-bold leading-tight">RakshaNet</p>
            <p className="text-[10px] uppercase tracking-wide text-slate-400">Command Center</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {visibleItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition',
                  isActive ? 'bg-brand-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                )
              }
            >
              <span aria-hidden="true">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-slate-800 px-4 py-3">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span
              className={clsx('h-2 w-2 rounded-full', connected ? 'bg-emerald-400' : 'bg-slate-500')}
              title={connected ? 'Live feed connected' : 'Live feed disconnected'}
            />
            {connected ? 'Live feed connected' : 'Live feed offline'}
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900">{user?.name}</p>
            <p className="truncate text-xs text-slate-500">
              {ROLE_LABELS[user?.role] || user?.role}
              {user?.district ? ` · ${user.district}` : ''}
            </p>
          </div>
          <div className="flex items-center gap-4">
            {liveEventCount > 0 && (
              <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700">
                {liveEventCount} live update{liveEventCount === 1 ? '' : 's'}
              </span>
            )}
            <button
              type="button"
              onClick={logout}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Log out
            </button>
          </div>
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
