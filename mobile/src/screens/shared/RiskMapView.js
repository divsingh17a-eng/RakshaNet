import React, { useCallback, useEffect, useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { apiClient, describeApiError } from '../../api/client';
import { ZONE_COLOR_HEX, ZONE_LABELS } from '../../constants';
import { colors, radius, spacing, typography } from '../../theme/colors';
import { EmptyState, ErrorState, LoadingState } from '../../components/StateViews';
import Button from '../../components/Button';

const SAFE_SITE_COLOR = '#1D4ED8';
const REPORT_COLOR = '#7C3AED';

const INDIA_DEFAULT_REGION = {
  latitude: 20.5937,
  longitude: 78.9629,
  latitudeDelta: 8,
  longitudeDelta: 8
};

function coords(entity) {
  const c = entity?.location?.coordinates;
  if (!Array.isArray(c) || c.length < 2) return null;
  return { latitude: c[1], longitude: c[0] };
}

// Read-only risk map shared by Citizen ("Nearby Risk Map") and Volunteer
// ("Risk Map") - deliberately has no operational controls (relocation
// approval etc. is web Command Center / officer-only per PRD sec.10).
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

  if (status === 'loading') return <LoadingState label="Loading risk map..." />;
  if (status === 'error') return <ErrorState message={errorMessage} onRetry={load} />;

  const habitations = layers?.habitations || [];
  const safeSites = layers?.safeSites || [];
  const hazardReports = layers?.hazardReports || [];
  const isEmpty = habitations.length === 0 && safeSites.length === 0 && hazardReports.length === 0;

  if (isEmpty) {
    return <EmptyState icon="🗺️" title="No map data yet" message="Habitations and safe sites will appear here once seeded." actionLabel="Retry" onAction={load} />;
  }

  const firstPoint = coords(habitations[0]) || coords(safeSites[0]) || coords(hazardReports[0]);
  const initialRegion = firstPoint ? { ...firstPoint, latitudeDelta: 1.2, longitudeDelta: 1.2 } : INDIA_DEFAULT_REGION;

  return (
    <View style={styles.container}>
      <MapView
        style={StyleSheet.absoluteFillObject}
        initialRegion={initialRegion}
        showsUserLocation
        showsMyLocationButton={Platform.OS === 'android'}
      >
        {habitations.map((h) => {
          const c = coords(h);
          if (!c) return null;
          const color = ZONE_COLOR_HEX[h.currentZone] || ZONE_COLOR_HEX.green;
          return (
            <Marker
              key={`hab-${h.id}`}
              coordinate={c}
              pinColor={color}
              onPress={() => setSelected({ kind: 'habitation', data: h })}
            />
          );
        })}
        {safeSites.map((s) => {
          const c = coords(s);
          if (!c) return null;
          return (
            <Marker
              key={`site-${s.id}`}
              coordinate={c}
              pinColor={SAFE_SITE_COLOR}
              onPress={() => setSelected({ kind: 'safeSite', data: s })}
            />
          );
        })}
        {hazardReports.map((r) => {
          const c = coords(r);
          if (!c) return null;
          return (
            <Marker
              key={`report-${r.id}`}
              coordinate={c}
              pinColor={REPORT_COLOR}
              onPress={() => setSelected({ kind: 'report', data: r })}
            />
          );
        })}
      </MapView>

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
