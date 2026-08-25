// Shared visual language for the RakshaNet mobile app. Risk-zone colors are
// imported from src/constants (mirrored from /shared/constants) so they
// never drift from the backend/web meaning of red/orange/yellow/green.
import { ZONE_COLOR_HEX } from '../constants';

export const colors = {
  primary: '#DC2626', // RakshaNet red - SOS, primary actions
  primaryDark: '#991B1B',
  secondary: '#1D4ED8', // volunteer / operational accent
  background: '#F8FAFC',
  surface: '#FFFFFF',
  border: '#E2E8F0',
  text: '#0F172A',
  textMuted: '#64748B',
  textOnPrimary: '#FFFFFF',
  success: '#16A34A',
  warning: '#CA8A04',
  danger: '#DC2626',
  info: '#2563EB',
  disabled: '#CBD5E1',
  overlay: 'rgba(15, 23, 42, 0.5)',
  zone: ZONE_COLOR_HEX
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 20,
  pill: 999
};

export const typography = {
  h1: { fontSize: 28, fontWeight: '800' },
  h2: { fontSize: 22, fontWeight: '700' },
  h3: { fontSize: 18, fontWeight: '700' },
  body: { fontSize: 16, fontWeight: '400' },
  bodyBold: { fontSize: 16, fontWeight: '600' },
  small: { fontSize: 13, fontWeight: '400' },
  caption: { fontSize: 12, fontWeight: '500' }
};
