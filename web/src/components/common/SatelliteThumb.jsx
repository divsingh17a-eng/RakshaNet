import { MapContainer, TileLayer } from 'react-leaflet';

/**
 * Real satellite/aerial imagery (Esri World Imagery - a genuine free public
 * tile service, no API key, no fabricated "AI analysis") centered on a
 * report's coordinates, so a volunteer/officer can visually cross-check what
 * a report claims against an actual overhead photo of that location before
 * deciding Verified/Rejected/Needs Evidence/Duplicate.
 *
 * Deliberately just an image, not a claim of automated detection - the PRD
 * (sec.0) is explicit that live satellite integration must not be implied
 * unless it's real, and there is no ML model here doing the "verifying";
 * the human still makes the call.
 */
export default function SatelliteThumb({ lat, lng, zoom = 17, height = 160 }) {
  if (lat === undefined || lng === undefined) return null;

  return (
    <div className="relative overflow-hidden rounded-lg border border-slate-200" style={{ height }}>
      <MapContainer
        center={[lat, lng]}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
        scrollWheelZoom={false}
      >
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          attribution="Tiles &copy; Esri"
          maxZoom={19}
        />
      </MapContainer>
      {/* The report's exact coordinate is always the map center by construction - a plain
          crosshair overlay (not a Leaflet marker) is enough to point it out. */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 z-[500] h-4 w-4 -translate-x-1/2 -translate-y-1/2">
        <div className="absolute inset-0 rounded-full border-2 border-red-500" />
        <div className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-red-500" />
      </div>
    </div>
  );
}
