import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { apiClient, describeApiError } from '../../api/client';
import { ZONE_COLOR_HEX, ZONE_LABELS } from '../../constants';
import { colors, radius, spacing, typography } from '../../theme/colors';
import { EmptyState, ErrorState, LoadingState } from '../../components/StateViews';
import Button from '../../components/Button';

const SAFE_SITE_COLOR = '#1D4ED8';
const REPORT_COLOR = '#7C3AED';

const INDIA_DEFAULT_CENTER = { lat: 20.5937, lng: 78.9629, zoom: 5 };

function coords(entity) {
  const c = entity?.location?.coordinates;
  if (!Array.isArray(c) || c.length < 2) return null;
  return { lat: c[1], lng: c[0] };
}

// Renders the map as a WebView running Leaflet + OpenStreetMap tiles instead
// of react-native-maps/Google Maps: Google requires a billing-enabled Cloud
// project and an API key just to render tiles, which is real friction for a
// free hackathon build. Leaflet + OSM needs neither - zero setup, zero cost,
// same pins-on-a-map result. Marker taps come back over postMessage and open
// the same detail modal react-native-maps would have.
export default function RiskMapView() {
  const [layers, setLayers] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [errorMessage, setErrorMessage] = useState('');
  const [selected, setSelected] = useState(null);

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      const { data } = await apiClient.get('/risk/map');
      setLayers(data.layers);
      setStatus('ready');
    } catch (err) {
      setErrorMessage(describeApiError(err).message);
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const habitations = layers?.habitations || [];
  const safeSites = layers?.safeSites || [];
  const hazardReports = layers?.hazardReports || [];

  const html = useMemo(() => buildMapHtml({ habitations, safeSites, hazardReports }), [habitations, safeSites, hazardReports]);

  const handleMessage = useCallback((event) => {
    try {
      const { kind, id } = JSON.parse(event.nativeEvent.data);
      const list = kind === 'habitation' ? habitations : kind === 'safeSite' ? safeSites : hazardReports;
      const data = list.find((item) => item.id === id);
      if (data) setSelected({ kind, data });
    } catch {
      // Ignore malformed messages - the map still works.
    }
  }, [habitations, safeSites, hazardReports]);

  if (status === 'loading') return <LoadingState label="Loading risk map..." />;
  if (status === 'error') return <ErrorState message={errorMessage} onRetry={load} />;

  const isEmpty = habitations.length === 0 && safeSites.length === 0 && hazardReports.length === 0;
  if (isEmpty) {
    return <EmptyState icon="🗺️" title="No map data yet" message="Habitations and safe sites will appear here once seeded." actionLabel="Retry" onAction={load} />;
  }

  return (
    <View style={styles.container}>
      <WebView
        source={{ html }}
        style={StyleSheet.absoluteFillObject}
        onMessage={handleMessage}
        originWhitelist={['*']}
      />

      <Legend />

      <Modal visible={!!selected} transparent animationType="fade" onRequestClose={() => setSelected(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setSelected(null)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <PinDetails item={selected} />
            <Button title="Close" variant="neutral" onPress={() => setSelected(null)} />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

// Builds a self-contained HTML document: Leaflet from a CDN, OpenStreetMap
// raster tiles (no key required), and one circle marker per entity colored
// to match the legend. Rebuilt only when the underlying data changes (see
// useMemo above), not on every render.
function buildMapHtml({ habitations, safeSites, hazardReports }) {
  const points = [
    ...habitations.map((h) => ({ ...coords(h), kind: 'habitation', id: h.id, color: ZONE_COLOR_HEX[h.currentZone] || ZONE_COLOR_HEX.green })),
    ...safeSites.map((s) => ({ ...coords(s), kind: 'safeSite', id: s.id, color: SAFE_SITE_COLOR })),
    ...hazardReports.map((r) => ({ ...coords(r), kind: 'report', id: r.id, color: REPORT_COLOR }))
  ].filter((p) => p.lat != null && p.lng != null);

  const first = points[0];
  const center = first ? { lat: first.lat, lng: first.lng, zoom: 9 } : INDIA_DEFAULT_CENTER;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body, #map { height: 100%; margin: 0; padding: 0; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    const points = ${JSON.stringify(points)};
    const map = L.map('map').setView([${center.lat}, ${center.lng}], ${center.zoom});
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    points.forEach((p) => {
      const marker = L.circleMarker([p.lat, p.lng], {
        radius: 9,
        color: '#FFFFFF',
        weight: 2,
        fillColor: p.color,
        fillOpacity: 0.9
      }).addTo(map);
      marker.on('click', () => {
        window.ReactNativeWebView.postMessage(JSON.stringify({ kind: p.kind, id: p.id }));
      });
    });
  </script>
</body>
</html>`;
}

function PinDetails({ item }) {
  if (!item) return null;
  if (item.kind === 'habitation') {
    const h = item.data;
    return (
      <View style={styles.modalBody}>
        <Text style={styles.modalTitle}>{h.name}</Text>
        <Text style={styles.modalSubtitle}>{h.district}, {h.state}</Text>
        <Row label="Zone" value={ZONE_LABELS[h.currentZone] || h.currentZone} color={ZONE_COLOR_HEX[h.currentZone]} />
        <Row label="HVI" value={`${Math.round(h.currentHvi ?? 0)} / 100`} />
        <Row label="Population" value={String(h.population ?? '-')} />
      </View>
    );
  }
  if (item.kind === 'safeSite') {
    const s = item.data;
    const available = Math.max((s.totalCapacity || 0) - (s.occupiedCapacity || 0), 0);
    return (
      <View style={styles.modalBody}>
        <Text style={styles.modalTitle}>{s.name}</Text>
        <Text style={styles.modalSubtitle}>Safe site - {s.type?.replace('_', ' ')}</Text>
        <Row label="Status" value={s.status} />
        <Row label="Capacity" value={`${s.occupiedCapacity ?? 0} / ${s.totalCapacity ?? 0} used`} />
        <Row label="Available" value={String(available)} />
      </View>
    );
  }
  if (item.kind === 'report') {
    const r = item.data;
    return (
      <View style={styles.modalBody}>
        <Text style={styles.modalTitle}>{r.type?.replace('_', ' ')}</Text>
        <Text style={styles.modalSubtitle}>Hazard report</Text>
        <Row label="Severity" value={`${r.severity} / 5`} />
        <Row label="Status" value={r.status?.replace(/_/g, ' ')} />
        {r.description ? <Text style={styles.description}>{r.description}</Text> : null}
      </View>
    );
  }
  return null;
}

function Row({ label, value, color }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, color && { color }]}>{value}</Text>
    </View>
  );
}

function Legend() {
  return (
    <View style={styles.legend}>
      {Object.entries(ZONE_COLOR_HEX).map(([zone, hex]) => (
        <View key={zone} style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: hex }]} />
          <Text style={styles.legendLabel}>{zone}</Text>
        </View>
      ))}
      <View style={styles.legendItem}>
        <View style={[styles.legendDot, { backgroundColor: SAFE_SITE_COLOR }]} />
        <Text style={styles.legendLabel}>site</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  legend: {
    position: 'absolute',
    bottom: spacing.md,
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.sm,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', marginRight: spacing.md, marginVertical: 2 },
  legendDot: { width: 10, height: 10, borderRadius: 5, marginRight: 4 },
  legendLabel: { ...typography.caption, color: colors.textMuted, textTransform: 'capitalize' },
  modalBackdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  modalCard: { backgroundColor: colors.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.lg },
  modalBody: { marginBottom: spacing.md },
  modalTitle: { ...typography.h3, color: colors.text, textTransform: 'capitalize' },
  modalSubtitle: { ...typography.small, color: colors.textMuted, marginBottom: spacing.sm, textTransform: 'capitalize' },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  rowLabel: { ...typography.small, color: colors.textMuted },
  rowValue: { ...typography.bodyBold, color: colors.text, textTransform: 'capitalize' },
  description: { ...typography.small, color: colors.text, marginTop: spacing.sm }
});
