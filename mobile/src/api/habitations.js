import { apiClient } from './client';

// GET /api/habitations - Volunteer/Officer/Responder/Admin.
export async function listHabitations(params = {}) {
  const { data } = await apiClient.get('/habitations', { params });
  return data;
}
