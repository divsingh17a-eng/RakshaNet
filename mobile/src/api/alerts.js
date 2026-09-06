import { apiClient } from './client';

export async function listAlerts() {
  const { data } = await apiClient.get('/alerts');
  return data;
}

export async function markAlertRead(id) {
  const { data } = await apiClient.patch(`/alerts/${id}/read`);
  return data;
}
