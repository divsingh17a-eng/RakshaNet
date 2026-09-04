import { useCallback, useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { getRiskMap, recalculateRisk } from '../api/endpoints';
import { useApiQuery } from '../hooks/useApiQuery';
import { useSocketEvent } from '../context/SocketContext';
import { habitationIcon, safeSiteIcon, hazardIcon } from '../components/map/zoneIcon';
import { ErrorState, LoadingState } from '../components/common/QueryState';
import { ZoneBadge, DemoDataBadge } from '../components/common/Badge';
import HabitationDrawer from '../components/habitation/HabitationDrawer';
import SafeSiteDrawer from '../components/safeSite/SafeSiteDrawer';
import { HAZARD_TYPES, HAZARD_TYPE_LABELS, ZONE_COLOR_HEX } from '../constants';
import { formatNumber } from '../utils/format';

const INDIA_CENTER = [20.5937, 78.9629];

// MapContainer's `center`/`zoom` props are only read once, at mount - they
// are NOT reactive, so they can't be used to recenter the map once the API
// data (which arrives asynchronously) is known. This child component uses
// the imperative Leaflet map instance instead, and fits the view once the
// first batch of markers is known.
//
// Deliberately fits ONLY ONCE (guarded by hasFit): habitations/safeSites
// arrays get a new reference on every live reload (recalculate, socket
// events like risk:recalculated/safeSite:updated from any user), and
// re-fitting on every one of those would yank an officer's view back out
// to "fit everything" mid-use, discarding wherever they'd manually panned
// or zoomed to.
function FitDataBounds({ habitations, safeSites }) {
  const map = useMap();
  const hasFit = useRef(false);

  useEffect(() => {
    if (hasFit.current) return;
    const points = [...(habitations || []), ...(safeSites || [])]
      .map((entity) => entity.location?.coordinates)
      .filter(Boolean)
      .map(([lng, lat]) => [lat, lng]);

    if (points.length === 0) return;
    hasFit.current = true;
    if (points.length === 1) {
      map.setView(points[0], 11);
      return;
    }
    map.fitBounds(L.latLngBounds(points), { padding: [48, 48], maxZoom: 12 });
  }, [habitations, safeSites, map]);

  return null;
}

export default function RiskMapPage() {
  const [hazardType, setHazardType] = useState('');
  const [selectedHabitationId, setSelectedHabitationId] = useState(null);
  const [selectedSiteId, setSelectedSiteId] = useState(null);
  const [showHabitations, setShowHabitations] = useState(true);
  const [showSafeSites, setShowSafeSites] = useState(true);
  const [showHazards, setShowHazards] = useState(true);
  const [satelliteView, setSatelliteView] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [recalcMessage, setRecalcMessage] = useState(null);

  const fetcher = useCallback(() => getRiskMap(hazardType ? { hazardType } : {}), [hazardType]);
  const { data, status, error, reload } = useApiQuery(fetcher, [hazardType]);

  useSocketEvent('risk:recalculated', reload);
  useSocketEvent('safeSite:updated', reload);
  useSocketEvent('report:new', reload);
  useSocketEvent('report:verified', reload);

  async function handleRecalculateAll() {
    if (recalculating) return; // prevent duplicate simultaneous requests
    setRecalculating(true);
    setRecalcMessage(null);
    try {
      const res = await recalculateRisk();
      await reload(); // real DB values, not a client-side guess
      setRecalcMessage({ tone: 'success', text: `✓ Recalculated ${res.count} habitation${res.count === 1 ? '' : 's'}` });
      setTimeout(() => setRecalcMessage(null), 4000);
    } catch (err) {
      setRecalcMessage({ tone: 'error', text: err.message || 'Recalculation failed' });
    } finally {
      setRecalculating(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-6 py-3">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Live Risk Map</h1>
          <p className="text-xs text-slate-500">Habitations, safe sites, and hazard reports - colors mean the same thing everywhere.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {data?.demoData && <DemoDataBadge />}
          {recalcMessage && (
            <span className={`text-xs font-semibold ${recalcMessage.tone === 'error' ? 'text-red-600' : 'text-emerald-700'}`}>
              {recalcMessage.text}
            </span>
          )}
          <button
            type="button"
            onClick={handleRecalculateAll}
            disabled={recalculating}
            className="flex items-center gap-1.5 rounded-md border border-brand-200 bg-brand-50 px-2.5 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-100 disabled:cursor-not-allowed disabled:opacity-60"
            title="Recompute HVI/risk/zone for every habitation from current live data"
          >
            {recalculating ? (
              <>
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-brand-400 border-t-transparent" />
                Recalculating…
              </>
            ) : (
              <>↻ Recalculate Risk</>
            )}
          </button>
          <select
            value={hazardType}
            onChange={(e) => setHazardType(e.target.value)}
            className="rounded-md border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:border-brand-500 focus:outline-none"
          >
            <option value="">All hazard types</option>
            {Object.values(HAZARD_TYPES).map((t) => (
              <option key={t} value={t}>{HAZARD_TYPE_LABELS[t]}</option>
            ))}
          </select>
          <LayerToggle label="Habitations" checked={showHabitations} onChange={setShowHabitations} />
          <LayerToggle label="Safe Sites" checked={showSafeSites} onChange={setShowSafeSites} />
          <LayerToggle label="Hazard Reports" checked={showHazards} onChange={setShowHazards} />
          <div className="flex overflow-hidden rounded-md border border-slate-300 text-xs font-medium">
            <button
              type="button"
              onClick={() => setSatelliteView(false)}
              className={`px-2.5 py-1.5 ${!satelliteView ? 'bg-brand-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
            >
              🗺️ Street
            </button>
            <button
              type="button"
              onClick={() => setSatelliteView(true)}
              className={`px-2.5 py-1.5 ${satelliteView ? 'bg-brand-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
            >
              🛰️ Satellite
            </button>
          </div>
        </div>
      </div>

      <div className="relative min-h-0 flex-1">
        {status === 'loading' && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70">
            <LoadingState label="Loading map layers…" />
          </div>
        )}
        {status === 'error' && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white">
            <ErrorState message={error?.message} onRetry={reload} />
          </div>
        )}

        <MapContainer center={INDIA_CENTER} zoom={5} className="h-full w-full">
          {satelliteView ? (
            <TileLayer
              attribution="Tiles &copy; Esri"
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              maxZoom={19}
            />
          ) : (
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
          )}

          <FitDataBounds habitations={data?.layers?.habitations} safeSites={data?.layers?.safeSites} />

          {showHabitations && data?.layers?.habitations?.map((h) => {
            if (!h.location?.coordinates) return null;
            const [lng, lat] = h.location.coordinates;
            return (
              <Marker key={h.id} position={[lat, lng]} icon={habitationIcon(h.currentZone)}>
                <Popup>
                  <div className="min-w-[180px] text-sm">
                    <p className="font-semibold">{h.name}</p>
                    <p className="mb-1 text-xs text-slate-500">{h.district}, {h.state}</p>
                    <div className="mb-2 flex items-center gap-2">
                      <ZoneBadge zone={h.currentZone} />
                      <span className="text-xs">HVI {h.currentHvi}</span>
                    </div>
                    <p className="mb-2 text-xs">Population: {formatNumber(h.population)}</p>
                    <button
                      type="button"
                      onClick={() => setSelectedHabitationId(h.id)}
                      className="rounded-md bg-brand-600 px-2 py-1 text-xs font-semibold text-white hover:bg-brand-700"
                    >
                      View details
                    </button>
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {showSafeSites && data?.layers?.safeSites?.map((s) => {
            if (!s.location?.coordinates) return null;
            const [lng, lat] = s.location.coordinates;
            return (
              <Marker key={s.id} position={[lat, lng]} icon={safeSiteIcon()}>
                <Popup>
                  <div className="min-w-[180px] text-sm">
                    <p className="font-semibold">{s.name}</p>
                    <p className="mb-2 text-xs text-slate-500">{s.district}, {s.state}</p>
                    <p className="mb-2 text-xs">
                      Occupied {formatNumber(s.occupiedCapacity)} / {formatNumber(s.totalCapacity)}
                    </p>
                    <button
                      type="button"
                      onClick={() => setSelectedSiteId(s.id)}
                      className="rounded-md bg-teal-700 px-2 py-1 text-xs font-semibold text-white hover:bg-teal-800"
                    >
                      View details
                    </button>
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {showHazards && data?.layers?.hazardReports?.map((r) => {
            if (!r.location?.coordinates) return null;
            const [lng, lat] = r.location.coordinates;
            return (
              <Marker key={r.id} position={[lat, lng]} icon={hazardIcon()}>
                <Popup>
                  <div className="min-w-[160px] text-sm">
                    <p className="font-semibold">{HAZARD_TYPE_LABELS[r.type] || r.type}</p>
                    <p className="text-xs text-slate-500">Severity {r.severity}/5 · {r.status}</p>
                    {r.description && <p className="mt-1 text-xs">{r.description}</p>}
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>

        <div className="pointer-events-none absolute bottom-4 left-4 z-[400] rounded-lg bg-white/95 px-3 py-2 text-[11px] shadow">
          <p className="mb-1 font-semibold text-slate-600">Zone legend</p>
          {Object.entries(ZONE_COLOR_HEX).map(([zone, hex]) => (
            <div key={zone} className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: hex }} />
              <span className="capitalize text-slate-600">{zone}</span>
            </div>
          ))}
        </div>
      </div>

      <HabitationDrawer
        habitationId={selectedHabitationId}
        open={Boolean(selectedHabitationId)}
        onClose={() => setSelectedHabitationId(null)}
      />
      <SafeSiteDrawer siteId={selectedSiteId} open={Boolean(selectedSiteId)} onClose={() => setSelectedSiteId(null)} />
    </div>
  );
}

function LayerToggle({ label, checked, onChange }) {
  return (
    <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-3.5 w-3.5 accent-brand-600" />
      {label}
    </label>
  );
}
