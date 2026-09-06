import { apiClient } from './client';

// POST /api/reports - multipart (photos[]), idempotent on localUuid.
// `photos` is an array of { uri, name, type } from expo-image-picker.
export async function submitReportOnline({ localUuid, type, severity, description, lng, lat, habitationId, reportedAt, photos = [] }) {
  const form = new FormData();
  form.append('localUuid', localUuid);
  form.append('type', type);
  form.append('severity', String(severity));
  if (description) form.append('description', description);
  form.append('lng', String(lng));
  form.append('lat', String(lat));
  if (habitationId) form.append('habitationId', habitationId);
  if (reportedAt) form.append('reportedAt', reportedAt);

  photos.forEach((photo, index) => {
    form.append('photos', {
      uri: photo.uri,
      name: photo.fileName || `photo-${index}.jpg`,
      type: photo.mimeType || 'image/jpeg'
    });
  });

  const { data } = await apiClient.post('/reports', form, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return data;
}

// GET /api/reports?type=&status=&mine=true
export async function listReports(params = {}) {
  const { data } = await apiClient.get('/reports', { params });
  return data;
}

export async function getReportDetail(id) {
  const { data } = await apiClient.get(`/reports/${id}`);
  return data;
}

// POST /api/reports/:id/verify - Volunteer/Officer/Admin only.
export async function verifyReport(id, { decision, notes, evidenceUrls }) {
  const { data } = await apiClient.post(`/reports/${id}/verify`, { decision, notes, evidenceUrls });
  return data;
}

export async function listVerifications(reportId) {
  const { data } = await apiClient.get(`/reports/${reportId}/verifications`);
  return data;
}
