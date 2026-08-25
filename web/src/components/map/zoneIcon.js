import L from 'leaflet';
import { ZONE_COLOR_HEX } from '../../constants';

const iconCache = new Map();

/** Circular colored marker for a habitation, keyed by its risk zone. */
export function habitationIcon(zone) {
  const key = `hab-${zone}`;
  if (iconCache.has(key)) return iconCache.get(key);
  const color = ZONE_COLOR_HEX[zone] || '#64748b';
  const icon = L.divIcon({
    className: '',
    html: `<div style="
      width:18px;height:18px;border-radius:9999px;background:${color};
      border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.4);
    "></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9]
  });
  iconCache.set(key, icon);
  return icon;
}

/** Square marker for a safe site so it's visually distinct from habitations. */
export function safeSiteIcon() {
  const key = 'safe-site';
  if (iconCache.has(key)) return iconCache.get(key);
  const icon = L.divIcon({
    className: '',
    html: `<div style="
      width:16px;height:16px;background:#0f766e;border:2px solid white;
      box-shadow:0 1px 4px rgba(0,0,0,0.4);transform:rotate(45deg);
    "></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8]
  });
  iconCache.set(key, icon);
  return icon;
}

/** Small triangle marker for a hazard report pin. */
export function hazardIcon() {
  const key = 'hazard';
  if (iconCache.has(key)) return iconCache.get(key);
  const icon = L.divIcon({
    className: '',
    html: `<div style="
      width:0;height:0;border-left:7px solid transparent;border-right:7px solid transparent;
      border-bottom:12px solid #f97316;filter:drop-shadow(0 1px 2px rgba(0,0,0,0.5));
    "></div>`,
    iconSize: [14, 12],
    iconAnchor: [7, 12]
  });
  iconCache.set(key, icon);
  return icon;
}
