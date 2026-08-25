import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { ROLES, ROLE_LABELS, DASHBOARD_ROLES } from '../constants';

function randomToken(length = 8) {
  return Math.random().toString(36).slice(2, 2 + length);
}

function generateRandomAccount(role) {
  const suffix = randomToken(6);
  return {
    name: `Demo ${ROLE_LABELS[role]} ${suffix}`,
    email: `demo-${suffix}@rakshanet.local`,
    password: `Demo-${randomToken(10)}!`,
    role,
    district: 'Idukki',
    state: 'Kerala',
    organization: 'RakshaNet Demo'
  };
}

export default function LoginPage() {
  const login = useAuthStore((s) => s.login);
  const registerAndLogin = useAuthStore((s) => s.registerAndLogin);
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const location = useLocation();

  const [role, setRole] = useState(ROLES.DDMA_OFFICER);
  const [showManualLogin, setShowManualLogin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [lastGenerated, setLastGenerated] = useState(null);

  if (token && user) {
    const redirectTo = location.state?.from?.pathname || '/';
    return <Navigate to={redirectTo} replace />;
  }

  async function handleQuickStart() {
    setBusy(true);
    setError(null);
    const account = generateRandomAccount(role);
    try {
      await registerAndLogin(account);
      setLastGenerated(account);
      navigate(location.state?.from?.pathname || '/', { replace: true });
    } catch (err) {
      setError(err.message || 'Could not create a demo account');
    } finally {
      setBusy(false);
    }
  }

  async function handleManualSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(email.trim(), password);
      navigate(location.state?.from?.pathname || '/', { replace: true });
    } catch (err) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-2xl">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="mb-2 text-3xl" aria-hidden="true">🛡️</span>
          <h1 className="text-xl font-bold text-slate-900">RakshaNet</h1>
          <p className="text-xs text-slate-500">Command Center · SDMA/DDMA · NDRF · Admin</p>
        </div>

        <div className="space-y-3">
          <div>
            <label htmlFor="role" className="mb-1 block text-xs font-medium text-slate-600">
              Sign in as
            </label>
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              {DASHBOARD_ROLES.map((r) => (
                <option key={r} value={r}>{ROLE_LABELS[r]}</option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={handleQuickStart}
            disabled={busy}
            className="w-full rounded-md bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? 'Setting up your account…' : '🎲 Quick Start (random account, no typing)'}
          </button>
          <p className="text-center text-[11px] text-slate-400">
            Creates a fresh {ROLE_LABELS[role]} account with a random email/password and signs you in immediately.
          </p>
        </div>

        {error && (
          <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-xs font-medium text-red-700" role="alert">
            {error}
          </p>
        )}

        {lastGenerated && !error && (
          <div className="mt-4 rounded-md bg-emerald-50 px-3 py-2 text-[11px] text-emerald-800">
            Signed in as <span className="font-mono">{lastGenerated.email}</span>
          </div>
        )}

        <div className="mt-6 border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={() => setShowManualLogin((v) => !v)}
            className="w-full text-center text-xs font-medium text-slate-500 hover:text-slate-700"
          >
            {showManualLogin ? 'Hide' : 'Sign in to an existing account instead'}
          </button>

          {showManualLogin && (
            <form onSubmit={handleManualSubmit} className="mt-3 space-y-3">
              <div>
                <label htmlFor="email" className="mb-1 block text-xs font-medium text-slate-600">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="officer@rakshanet.demo"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>
              <div>
                <label htmlFor="password" className="mb-1 block text-xs font-medium text-slate-600">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>
              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busy ? 'Signing in…' : 'Sign in'}
              </button>
              <p className="rounded-md bg-slate-50 px-3 py-2 text-[11px] text-slate-500">
                Seeded demo accounts (password <code className="font-mono">RakshaNet@2026</code>):
                <br />
                admin@rakshanet.demo · officer@rakshanet.demo · responder@rakshanet.demo
              </p>
            </form>
          )}
        </div>

        <div className="mt-4 border-t border-slate-100 pt-4 text-center">
          <a href="/mobile-preview" className="text-[11px] font-medium text-slate-400 hover:text-slate-600">
            📱 Citizen or Volunteer? Try the mobile app →
          </a>
        </div>
      </div>
    </div>
  );
}
