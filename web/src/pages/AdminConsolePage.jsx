import { useCallback, useState } from 'react';
import {
  listSafeSites, createSafeSite,
  listHabitations, createHabitation,
  listUsers, updateUserRole, setUserStatus
} from '../api/endpoints';
import { useApiQuery } from '../hooks/useApiQuery';
import { ErrorState, LoadingState } from '../components/common/QueryState';
import { ZoneBadge, DemoDataBadge } from '../components/common/Badge';
import { ROLES, ROLE_LABELS } from '../constants';
import { formatNumber, formatDate, titleCase } from '../utils/format';
import { useAuthStore } from '../store/authStore';

const TABS = [
  { key: 'sites', label: 'Shelters & Safe Sites', icon: '🏕️' },
  { key: 'zones', label: 'Habitations & Zones', icon: '🚩' },
  { key: 'people', label: 'Volunteers & Users', icon: '👥' }
];

export default function AdminConsolePage() {
  const [tab, setTab] = useState('sites');
  const user = useAuthStore((s) => s.user);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-slate-200 bg-white px-6 py-3">
        <h1 className="text-lg font-semibold text-slate-900">Admin Console</h1>
        <p className="text-xs text-slate-500">Manage shelters, risk zones, and people - every change here is audited and shows up on the Live Risk Map instantly.</p>
        <div className="mt-3 flex gap-1 border-b border-slate-200">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition ${
                tab === t.key ? 'border-brand-600 text-brand-700' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <span aria-hidden="true">{t.icon}</span> {t.label}
            </button>
          ))}
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-6">
        {tab === 'sites' && <ShelterManager />}
        {tab === 'zones' && <ZoneManager />}
        {tab === 'people' && <PeopleManager currentUser={user} />}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared bits
// ---------------------------------------------------------------------------

function Panel({ title, subtitle, children }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
      {subtitle && <p className="mb-3 text-xs text-slate-500">{subtitle}</p>}
      {!subtitle && <div className="mb-3" />}
      {children}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-600">{label}</span>
      {children}
    </label>
  );
}

const inputCls = 'w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm focus:border-brand-500 focus:outline-none';

function SubmitBanner({ banner }) {
  if (!banner) return null;
  return (
    <p className={`mt-2 text-xs font-semibold ${banner.tone === 'error' ? 'text-red-600' : 'text-emerald-700'}`}>
      {banner.text}
    </p>
  );
}

// ---------------------------------------------------------------------------
// Shelters & Safe Sites
// ---------------------------------------------------------------------------

const SITE_TYPES = ['shelter', 'relocation_site', 'relief_camp'];
const SITE_TYPE_LABELS = { shelter: 'Shelter', relocation_site: 'Relocation Site', relief_camp: 'Relief Camp' };

const EMPTY_SITE_FORM = {
  name: '', district: '', state: '', type: 'shelter', lng: '', lat: '',
  totalCapacity: '', safetyRating: '80', accessibilityRating: '70', powerBackup: false
};

function ShelterManager() {
  const fetcher = useCallback(() => listSafeSites(), []);
  const { data, status, error, reload } = useApiQuery(fetcher, []);
  const [form, setForm] = useState(EMPTY_SITE_FORM);
  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState(null);

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name || !form.district || !form.state || form.lng === '' || form.lat === '') {
      setBanner({ tone: 'error', text: 'Name, district, state, and coordinates are required.' });
      return;
    }
    setSaving(true);
    setBanner(null);
    try {
      await createSafeSite({
        name: form.name,
        district: form.district,
        state: form.state,
        type: form.type,
        lng: Number(form.lng),
        lat: Number(form.lat),
        totalCapacity: Number(form.totalCapacity) || 0,
        safetyRating: Number(form.safetyRating),
        accessibilityRating: Number(form.accessibilityRating),
        powerBackup: form.powerBackup
      });
      setForm(EMPTY_SITE_FORM);
      setBanner({ tone: 'success', text: `✓ ${form.name} added - now visible on the Live Risk Map.` });
      await reload();
    } catch (err) {
      setBanner({ tone: 'error', text: err.message || 'Failed to add shelter' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[380px_1fr]">
      <Panel title="Add Shelter / Safe Site" subtitle="Appears on the Live Risk Map immediately with 0 stock in every resource - set stock from the site's detail drawer or /resources.">
        <form onSubmit={handleSubmit} className="space-y-3">
          <Field label="Name"><input className={inputCls} value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Govt. High School Shelter" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="District"><input className={inputCls} value={form.district} onChange={(e) => set('district', e.target.value)} /></Field>
            <Field label="State"><input className={inputCls} value={form.state} onChange={(e) => set('state', e.target.value)} /></Field>
          </div>
          <Field label="Type">
            <select className={inputCls} value={form.type} onChange={(e) => set('type', e.target.value)}>
              {SITE_TYPES.map((t) => <option key={t} value={t}>{SITE_TYPE_LABELS[t]}</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Latitude"><input className={inputCls} type="number" step="any" value={form.lat} onChange={(e) => set('lat', e.target.value)} placeholder="26.9124" /></Field>
            <Field label="Longitude"><input className={inputCls} type="number" step="any" value={form.lng} onChange={(e) => set('lng', e.target.value)} placeholder="75.7873" /></Field>
          </div>
          <Field label="Total Capacity (people)"><input className={inputCls} type="number" min="0" value={form.totalCapacity} onChange={(e) => set('totalCapacity', e.target.value)} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Safety Rating (0-100)"><input className={inputCls} type="number" min="0" max="100" value={form.safetyRating} onChange={(e) => set('safetyRating', e.target.value)} /></Field>
            <Field label="Accessibility (0-100)"><input className={inputCls} type="number" min="0" max="100" value={form.accessibilityRating} onChange={(e) => set('accessibilityRating', e.target.value)} /></Field>
          </div>
          <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
            <input type="checkbox" className="h-3.5 w-3.5 accent-brand-600" checked={form.powerBackup} onChange={(e) => set('powerBackup', e.target.checked)} />
            Has power backup
          </label>
          <button type="submit" disabled={saving} className="w-full rounded-md bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60">
            {saving ? 'Adding…' : '+ Add Shelter'}
          </button>
          <SubmitBanner banner={banner} />
        </form>
      </Panel>

      <Panel title={`Shelters & Safe Sites${data?.safeSites ? ` (${data.safeSites.length})` : ''}`}>
        {status === 'loading' && <LoadingState label="Loading safe sites…" />}
        {status === 'error' && <ErrorState message={error?.message} onRetry={reload} />}
        {status === 'success' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2 pr-3 font-medium">Name</th>
                  <th className="py-2 pr-3 font-medium">Type</th>
                  <th className="py-2 pr-3 font-medium">District</th>
                  <th className="py-2 pr-3 font-medium">Occupancy</th>
                  <th className="py-2 pr-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.safeSites.map((s) => (
                  <tr key={s.id} className="border-b border-slate-100">
                    <td className="py-2 pr-3 font-medium text-slate-800">
                      {s.name} {s.isDemoData && <DemoDataBadge className="ml-1" />}
                    </td>
                    <td className="py-2 pr-3 text-slate-600">{SITE_TYPE_LABELS[s.type] || s.type}</td>
                    <td className="py-2 pr-3 text-slate-600">{s.district}, {s.state}</td>
                    <td className="py-2 pr-3 text-slate-600">{formatNumber(s.occupiedCapacity)} / {formatNumber(s.totalCapacity)}</td>
                    <td className="py-2 pr-3 capitalize text-slate-600">{s.status}</td>
                  </tr>
                ))}
                {data.safeSites.length === 0 && (
                  <tr><td colSpan={5} className="py-4 text-center text-slate-400">No shelters yet - add one on the left.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Habitations & Zones ("red zones" are computed, not hand-painted - see PRD
// no-black-box rule. Admin supplies the same real-world inputs the HVI
// engine already uses; the zone color comes out the other end explainably.)
// ---------------------------------------------------------------------------

const HOUSING_TYPES = ['kutcha', 'semi_pucca', 'pucca', 'mixed'];
const ROAD_QUALITY = ['good', 'moderate', 'poor', 'isolated'];

const EMPTY_HAB_FORM = {
  name: '', district: '', state: '', lng: '', lat: '',
  population: '', vulnerablePopulation: '', householdCount: '',
  housingType: 'mixed', roadAccessQuality: 'moderate', distanceToRoadKm: '0', historicalIncidentCount: '0'
};

function ZoneManager() {
  const fetcher = useCallback(() => listHabitations(), []);
  const { data, status, error, reload } = useApiQuery(fetcher, []);
  const [form, setForm] = useState(EMPTY_HAB_FORM);
  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState(null);

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name || !form.district || !form.state || form.lng === '' || form.lat === '') {
      setBanner({ tone: 'error', text: 'Name, district, state, and coordinates are required.' });
      return;
    }
    setSaving(true);
    setBanner(null);
    try {
      const res = await createHabitation({
        name: form.name,
        district: form.district,
        state: form.state,
        lng: Number(form.lng),
        lat: Number(form.lat),
        population: Number(form.population) || 0,
        vulnerablePopulation: Number(form.vulnerablePopulation) || 0,
        householdCount: Number(form.householdCount) || 0,
        housingType: form.housingType,
        roadAccessQuality: form.roadAccessQuality,
        distanceToRoadKm: Number(form.distanceToRoadKm) || 0,
        historicalIncidentCount: Number(form.historicalIncidentCount) || 0
      });
      setForm(EMPTY_HAB_FORM);
      setBanner({
        tone: 'success',
        text: `✓ ${form.name} added. Run "Recalculate Risk" on the Live Risk Map to compute its zone from these inputs.`
      });
      void res;
      await reload();
    } catch (err) {
      setBanner({ tone: 'error', text: err.message || 'Failed to add habitation' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[380px_1fr]">
      <Panel
        title="Add Habitation"
        subtitle={'Zone color (green → red) is never set by hand - it\'s computed from these real risk inputs, the same explainable HVI formula used everywhere else in RakshaNet.'}
      >
        <form onSubmit={handleSubmit} className="space-y-3">
          <Field label="Name"><input className={inputCls} value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Riverside Colony" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="District"><input className={inputCls} value={form.district} onChange={(e) => set('district', e.target.value)} /></Field>
            <Field label="State"><input className={inputCls} value={form.state} onChange={(e) => set('state', e.target.value)} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Latitude"><input className={inputCls} type="number" step="any" value={form.lat} onChange={(e) => set('lat', e.target.value)} /></Field>
            <Field label="Longitude"><input className={inputCls} type="number" step="any" value={form.lng} onChange={(e) => set('lng', e.target.value)} /></Field>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Population"><input className={inputCls} type="number" min="0" value={form.population} onChange={(e) => set('population', e.target.value)} /></Field>
            <Field label="Vulnerable"><input className={inputCls} type="number" min="0" value={form.vulnerablePopulation} onChange={(e) => set('vulnerablePopulation', e.target.value)} /></Field>
            <Field label="Households"><input className={inputCls} type="number" min="0" value={form.householdCount} onChange={(e) => set('householdCount', e.target.value)} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Housing Type">
              <select className={inputCls} value={form.housingType} onChange={(e) => set('housingType', e.target.value)}>
                {HOUSING_TYPES.map((t) => <option key={t} value={t}>{titleCase(t)}</option>)}
              </select>
            </Field>
            <Field label="Road Access">
              <select className={inputCls} value={form.roadAccessQuality} onChange={(e) => set('roadAccessQuality', e.target.value)}>
                {ROAD_QUALITY.map((t) => <option key={t} value={t}>{titleCase(t)}</option>)}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Distance to Road (km)"><input className={inputCls} type="number" min="0" step="any" value={form.distanceToRoadKm} onChange={(e) => set('distanceToRoadKm', e.target.value)} /></Field>
            <Field label="Past Incidents"><input className={inputCls} type="number" min="0" value={form.historicalIncidentCount} onChange={(e) => set('historicalIncidentCount', e.target.value)} /></Field>
          </div>
          <button type="submit" disabled={saving} className="w-full rounded-md bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60">
            {saving ? 'Adding…' : '+ Add Habitation'}
          </button>
          <SubmitBanner banner={banner} />
        </form>
      </Panel>

      <Panel title={`Habitations${data?.habitations ? ` (${data.habitations.length})` : ''}`} subtitle="Sorted by current HVI - highest risk first.">
        {status === 'loading' && <LoadingState label="Loading habitations…" />}
        {status === 'error' && <ErrorState message={error?.message} onRetry={reload} />}
        {status === 'success' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2 pr-3 font-medium">Name</th>
                  <th className="py-2 pr-3 font-medium">District</th>
                  <th className="py-2 pr-3 font-medium">Population</th>
                  <th className="py-2 pr-3 font-medium">HVI</th>
                  <th className="py-2 pr-3 font-medium">Zone</th>
                </tr>
              </thead>
              <tbody>
                {data.habitations.map((h) => (
                  <tr key={h.id} className="border-b border-slate-100">
                    <td className="py-2 pr-3 font-medium text-slate-800">
                      {h.name} {h.isDemoData && <DemoDataBadge className="ml-1" />}
                    </td>
                    <td className="py-2 pr-3 text-slate-600">{h.district}, {h.state}</td>
                    <td className="py-2 pr-3 text-slate-600">{formatNumber(h.population)}</td>
                    <td className="py-2 pr-3 text-slate-600">{h.currentHvi}</td>
                    <td className="py-2 pr-3"><ZoneBadge zone={h.currentZone} /></td>
                  </tr>
                ))}
                {data.habitations.length === 0 && (
                  <tr><td colSpan={5} className="py-4 text-center text-slate-400">No habitations yet - add one on the left.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Volunteers & Users
// ---------------------------------------------------------------------------

const ALL_ROLES = Object.values(ROLES);
const STATUSES = ['active', 'inactive', 'suspended'];
const STATUS_STYLES = {
  active: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  inactive: 'bg-slate-100 text-slate-700 border-slate-200',
  suspended: 'bg-red-100 text-red-800 border-red-200'
};

function PeopleManager({ currentUser }) {
  const isAdmin = currentUser?.role === ROLES.ADMIN;
  const [roleFilter, setRoleFilter] = useState('');
  const [districtFilter, setDistrictFilter] = useState('');
  const [rowBanner, setRowBanner] = useState(null); // { userId, tone, text }
  // The Command Center login's "Quick Start" button spins up throwaway
  // demo-*@rakshanet.local accounts so anyone can try a role instantly -
  // hidden here by default (server-filtered) so the real roster stays
  // readable after a long testing/demo session; never deleted, since real
  // verifications/plans/audit entries reference them.
  const [showTestAccounts, setShowTestAccounts] = useState(false);

  const fetcher = useCallback(
    () => listUsers({
      ...(roleFilter ? { role: roleFilter } : {}),
      ...(districtFilter ? { district: districtFilter } : {}),
      ...(showTestAccounts ? { includeTestAccounts: 'true' } : {}),
      limit: 200
    }),
    [roleFilter, districtFilter, showTestAccounts]
  );
  const { data, status, error, reload } = useApiQuery(fetcher, [roleFilter, districtFilter, showTestAccounts]);

  async function handleRoleChange(u, role) {
    if (role === u.role) return;
    try {
      await updateUserRole(u.id, role);
      setRowBanner({ userId: u.id, tone: 'success', text: `Role updated to ${ROLE_LABELS[role]}` });
      await reload();
    } catch (err) {
      setRowBanner({ userId: u.id, tone: 'error', text: err.message || 'Update failed' });
    }
  }

  async function handleStatusChange(u, statusValue) {
    if (statusValue === u.status) return;
    try {
      await setUserStatus(u.id, statusValue);
      setRowBanner({ userId: u.id, tone: 'success', text: `Status updated to ${statusValue}` });
      await reload();
    } catch (err) {
      setRowBanner({ userId: u.id, tone: 'error', text: err.message || 'Update failed' });
    }
  }

  if (!isAdmin) {
    return (
      <Panel title="Volunteers & Users" subtitle="Role and status changes are restricted to Administrators. Contact an admin to make changes.">
        <UserTable
          data={data} status={status} error={error} reload={reload}
          roleFilter={roleFilter} setRoleFilter={setRoleFilter}
          districtFilter={districtFilter} setDistrictFilter={setDistrictFilter}
          showTestAccounts={showTestAccounts} setShowTestAccounts={setShowTestAccounts}
          readOnly
        />
      </Panel>
    );
  }

  return (
    <Panel title="Volunteers & Users" subtitle="Change a person's role or activation status - every change is written to the Audit Log.">
      <UserTable
        data={data} status={status} error={error} reload={reload}
        roleFilter={roleFilter} setRoleFilter={setRoleFilter}
        districtFilter={districtFilter} setDistrictFilter={setDistrictFilter}
        showTestAccounts={showTestAccounts} setShowTestAccounts={setShowTestAccounts}
        onRoleChange={handleRoleChange}
        onStatusChange={handleStatusChange}
        rowBanner={rowBanner}
      />
    </Panel>
  );
}

function UserTable({
  data, status, error, reload, roleFilter, setRoleFilter, districtFilter, setDistrictFilter,
  showTestAccounts, setShowTestAccounts, onRoleChange, onStatusChange, rowBanner, readOnly
}) {
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <select className={`${inputCls} w-auto`} value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
          <option value="">All roles</option>
          {ALL_ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
        </select>
        <input
          className={`${inputCls} w-40`}
          placeholder="Filter by district"
          value={districtFilter}
          onChange={(e) => setDistrictFilter(e.target.value)}
        />
        {data?.pagination && <span className="text-xs text-slate-500">{data.pagination.total} total</span>}
        <label className="ml-auto flex items-center gap-1.5 text-xs font-medium text-slate-500">
          <input
            type="checkbox"
            className="h-3.5 w-3.5 accent-brand-600"
            checked={showTestAccounts}
            onChange={(e) => setShowTestAccounts(e.target.checked)}
          />
          {!showTestAccounts && data?.hiddenTestAccounts > 0
            ? `Show test accounts (${data.hiddenTestAccounts} hidden)`
            : 'Show test accounts'}
        </label>
      </div>

      {status === 'loading' && <LoadingState label="Loading users…" />}
      {status === 'error' && <ErrorState message={error?.message} onRetry={reload} />}
      {status === 'success' && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="py-2 pr-3 font-medium">Name</th>
                <th className="py-2 pr-3 font-medium">Phone</th>
                <th className="py-2 pr-3 font-medium">District</th>
                <th className="py-2 pr-3 font-medium">Role</th>
                <th className="py-2 pr-3 font-medium">On Duty</th>
                <th className="py-2 pr-3 font-medium">Status</th>
                <th className="py-2 pr-3 font-medium">Joined</th>
              </tr>
            </thead>
            <tbody>
              {data.users.map((u) => (
                <tr key={u.id} className="border-b border-slate-100 align-top">
                  <td className="py-2 pr-3 font-medium text-slate-800">{u.name}</td>
                  <td className="py-2 pr-3 text-slate-600">{u.phone || u.email || '—'}</td>
                  <td className="py-2 pr-3 text-slate-600">{u.district || '—'}</td>
                  <td className="py-2 pr-3">
                    {readOnly ? (
                      <span className="text-slate-700">{ROLE_LABELS[u.role]}</span>
                    ) : (
                      <select
                        className="rounded-md border border-slate-300 px-1.5 py-1 text-xs"
                        value={u.role}
                        onChange={(e) => onRoleChange(u, e.target.value)}
                      >
                        {ALL_ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                      </select>
                    )}
                  </td>
                  <td className="py-2 pr-3">
                    {u.role === ROLES.VOLUNTEER ? (
                      <span className={`inline-flex h-2 w-2 rounded-full ${u.metadata?.isOnDuty ? 'bg-emerald-500' : 'bg-slate-300'}`} title={u.metadata?.isOnDuty ? 'On duty' : 'Off duty'} />
                    ) : '—'}
                  </td>
                  <td className="py-2 pr-3">
                    {readOnly ? (
                      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${STATUS_STYLES[u.status] || STATUS_STYLES.inactive}`}>
                        {u.status}
                      </span>
                    ) : (
                      <select
                        className="rounded-md border border-slate-300 px-1.5 py-1 text-xs"
                        value={u.status}
                        onChange={(e) => onStatusChange(u, e.target.value)}
                      >
                        {STATUSES.map((s) => <option key={s} value={s}>{titleCase(s)}</option>)}
                      </select>
                    )}
                    {rowBanner?.userId === u.id && (
                      <p className={`mt-1 text-[11px] font-semibold ${rowBanner.tone === 'error' ? 'text-red-600' : 'text-emerald-700'}`}>{rowBanner.text}</p>
                    )}
                  </td>
                  <td className="py-2 pr-3 text-slate-500">{formatDate(u.createdAt)}</td>
                </tr>
              ))}
              {data.users.length === 0 && (
                <tr><td colSpan={7} className="py-4 text-center text-slate-400">No users match this filter.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
