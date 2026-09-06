import { apiClient } from './client';

// POST /api/sos - large SOS button -> live location capture (FR-03).
export async function triggerSosOnline({ lng, lat, accuracyMeters, message }) {
  const { data } = await apiClient.post('/sos', { lng, lat, accuracyMeters, message });
  return data;
}
