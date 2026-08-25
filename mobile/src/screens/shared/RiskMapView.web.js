import React, { useCallback, useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { apiClient, describeApiError } from '../../api/client';
import { ZONE_COLOR_HEX, ZONE_LABELS } from '../../constants';
import { colors, radius, spacing, typography } from '../../theme/colors';
import { EmptyState, ErrorState, LoadingState } from '../../components/StateViews';
import Button from '../../components/Button';

const SAFE_SITE_COLOR = '#1D4ED8';
const REPORT_COLOR = '#7C3AED';

// `react-native-maps` has no web implementation (it crashes react-native-web
// at import time with "codegenNativeComponent is not a function"). Metro
// picks this .web.js file automatically for web builds instead of the
// MapView-based RiskMapView.js, so the native app is completely unaffected -
// this is a browser-preview-only fallback: the same data as a list instead
// of pins on a map.
export default function RiskMapView() {
  const [layers, setLayers] = useState(null);
  const [status, setStatus] = useState('loading');
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

  return (
    <View style={styles.container}>
      <View style={styles.banner}>
        <Text style={styles.bannerText}>
          🌐 Browser preview: showing the map layers as a list (the interactive map needs the native app).
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {habitations.length > 0 && (
          <Section title={`Habitations (${habitations.length})`}>
            {habitations.map((h) => (
              <ListRow
                key={`hab-${h.id}`}
                dotColor={ZONE_COLOR_HEX[h.currentZone] || ZONE_COLOR_HEX.green}
                title={h.name}
                subtitle={`${h.district}, ${h.state} · HVI ${Math.round(h.currentHvi ?? 0)}`}
                onPress={() => setSelected({ kind: 'habitation', data: h })}
              />
            ))}
          </Section>
        )}

        {safeSites.length > 0 && (
          <Section title={`Safe sites (${safeSites.length})`}>
            {safeSites.map((s) => (
              <ListRow
                key={`site-${s.id}`}
                dotColor={SAFE_SITE_COLOR}
                title={s.name}
                subtitle={`${s.occupiedCapacity ?? 0} / ${s.totalCapacity ?? 0} occupied`}
                onPress={() => setSelected({ kind: 'safeSite', data: s })}
              />
            ))}
          </Section>
        )}

        {hazardReports.length > 0 && (
          <Section title={`Hazard reports (${hazardReports.length})`}>
            {hazardReports.map((r) => (
              <ListRow
                key={`report-${r.id}`}
                dotColor={REPORT_COLOR}
                title={(r.type || '').replace('_', ' ')}
                subtitle={`Severity ${r.severity} / 5 · ${(r.status || '').replace(/_/g, ' ')}`}
                onPress={() => setSelected({ kind: 'report', data: r })}
              />
            ))}
          </Section>
        )}
      </ScrollView>

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

function Section({ title, children }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function ListRow({ dotColor, title, subtitle, onPress }) {
  return (
    <Pressable style={styles.listRow} onPress={onPress}>
      <View style={[styles.dot, { backgroundColor: dotColor }]} />
      <View style={styles.listRowText}>
        <Text style={styles.listRowTitle} numberOfLines={1}>{title}</Text>
        <Text style={styles.listRowSubtitle} numberOfLines={1}>{subtitle}</Text>
      </View>
    </Pressable>
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

const styles = StyleSheet.create({
  container: { flex: 1 },
  banner: { backgroundColor: '#EFF6FF', padding: spacing.sm, borderBottomWidth: 1, borderBottomColor: '#DBEAFE' },
  bannerText: { ...typography.caption, color: '#1D4ED8' },
  list: { padding: spacing.md },
  section: { marginBottom: spacing.lg },
  sectionTitle: { ...typography.bodyBold, color: colors.text, marginBottom: spacing.xs },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.xs
  },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: spacing.sm },
  listRowText: { flex: 1 },
  listRowTitle: { ...typography.bodyBold, color: colors.text, textTransform: 'capitalize' },
  listRowSubtitle: { ...typography.small, color: colors.textMuted, textTransform: 'capitalize' },
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
