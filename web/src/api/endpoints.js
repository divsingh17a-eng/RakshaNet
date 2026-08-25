import apiClient from './client';

/**
 * Thin wrappers around every REST endpoint this app calls, matching
 * docs/API.md exactly. Kept in one place so a controller-shape change only
 * needs updating here plus the page/component that reads the response.
 */

// --- Auth ---
export const login = (email, password) => apiClient.post('/auth/login', { email, password }).then((r) => r.data);
export const register = (payload) => apiClient.post('/auth/register', payload).then((r) => r.data);
export const getMe = () => apiClient.get('/me').then((r) => r.data);

// --- Dashboard ---
export const getDashboardSummary = (params = {}) => apiClient.get('/dashboard/summary', { params }).then((r) => r.data);

// --- Risk / Habitations ---
export const getRiskMap = (params = {}) => apiClient.get('/risk/map', { params }).then((r) => r.data);
export const recalculateRisk = () => apiClient.post('/risk/recalculate').then((r) => r.data);
export const recalculateHabitationRisk = (id) => apiClient.post(`/habitations/${id}/recalculate`).then((r) => r.data);
export const listHabitations = (params = {}) => apiClient.get('/habitations', { params }).then((r) => r.data);
export const getHabitation = (id) => apiClient.get(`/habitations/${id}`).then((r) => r.data);
export const updateHabitation = (id, body) => apiClient.patch(`/habitations/${id}`, body).then((r) => r.data);

// --- Safe sites & resources ---
export const listSafeSites = (params = {}) => apiClient.get('/safe-sites', { params }).then((r) => r.data);
export const getSafeSite = (id) => apiClient.get(`/safe-sites/${id}`).then((r) => r.data);
export const checkSiteCapacity = (id, incomingPopulation) =>
  apiClient.post(`/safe-sites/${id}/capacity-check`, { incomingPopulation }).then((r) => r.data);
export const getRedistributionSuggestions = (district) =>
  apiClient.get('/safe-sites/redistribution', { params: { district } }).then((r) => r.data);
export const getResourceMonitor = (params = {}) => apiClient.get('/resources', { params }).then((r) => r.data);

// --- Relocation ---
export const recommendRelocation = (habitationId, priorityPopulation) =>
  apiClient.post('/relocation/recommend', { habitationId, priorityPopulation }).then((r) => r.data);
export const createRelocationPlan = (habitationId, priorityPopulation) =>
  apiClient.post('/relocation/plans', { habitationId, priorityPopulation }).then((r) => r.data);
export const generateAllRelocationPlans = () => apiClient.post('/relocation/plans/generate-all').then((r) => r.data);
export const listRelocationPlans = (params = {}) => apiClient.get('/relocation/plans', { params }).then((r) => r.data);
export const getRelocationPlan = (id) => apiClient.get(`/relocation/plans/${id}`).then((r) => r.data);
export const decideRelocationPlan = (id, body) => apiClient.patch(`/relocation/plans/${id}`, body).then((r) => r.data);
export const recheckRelocationPlan = (id) => apiClient.get(`/relocation/plans/${id}/recheck`).then((r) => r.data);

// --- Routes & response ---
export const listRoutes = (params = {}) => apiClient.get('/routes', { params }).then((r) => r.data);
export const updateRouteStatus = (id, status) => apiClient.patch(`/routes/${id}/status`, { status }).then((r) => r.data);
export const listResponseTasks = (params = {}) => apiClient.get('/response/tasks', { params }).then((r) => r.data);
export const claimResponseTask = (id) => apiClient.post(`/response/tasks/${id}/claim`).then((r) => r.data);
export const updateResponseTask = (id, body) => apiClient.patch(`/response/tasks/${id}`, body).then((r) => r.data);

// --- Reports & verification ---
export const listReports = (params = {}) => apiClient.get('/reports', { params }).then((r) => r.data);
export const getReport = (id) => apiClient.get(`/reports/${id}`).then((r) => r.data);
export const verifyReport = (id, body) => apiClient.post(`/reports/${id}/verify`, body).then((r) => r.data);
export const listReportVerifications = (id) => apiClient.get(`/reports/${id}/verifications`).then((r) => r.data);

// --- SOS & alerts ---
export const listActiveSos = () => apiClient.get('/sos').then((r) => r.data);
export const updateSosStatus = (id, status) => apiClient.patch(`/sos/${id}/status`, { status }).then((r) => r.data);
export const listMyAlerts = (params = {}) => apiClient.get('/alerts', { params }).then((r) => r.data);
export const markAlertRead = (id) => apiClient.patch(`/alerts/${id}/read`).then((r) => r.data);

// --- Audit ---
export const getAuditLogs = (params = {}) => apiClient.get('/audit-logs', { params }).then((r) => r.data);

// --- Exports (authenticated file download) ---
const EXPORT_MIME = {
  csv: 'text/csv',
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  json: 'application/json'
};
const EXPORT_EXTENSION = { csv: 'csv', pdf: 'pdf', docx: 'docx', json: 'json' };

// The endpoint requires a Bearer token, so a plain <a href> link can't be
// used for the download - fetch as a blob (with the auth header the
// interceptor attaches) and trigger a client-side save instead.
export async function downloadRelocationReport(format = 'csv', status) {
  const params = { format, ...(status ? { status } : {}) };
  const response = await apiClient.get('/exports/relocation-report', {
    params,
    responseType: 'blob'
  });
  const blob = new Blob([response.data], { type: EXPORT_MIME[format] || 'application/octet-stream' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `rakshanet-relocation-report.${EXPORT_EXTENSION[format] || format}`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export const getSmsIvrStatus = () => apiClient.get('/sms-ivr/status').then((r) => r.data);
