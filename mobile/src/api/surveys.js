import { apiClient } from './client';

// POST /api/surveys - structured vulnerability checklist (Volunteer only).
export async function submitSurveyOnline({ localUuid, habitationId, answers, lng, lat, notes, surveyedAt }) {
  const { data } = await apiClient.post('/surveys', {
    localUuid,
    habitationId,
    answers,
    lng,
    lat,
    notes,
    surveyedAt
  });
  return data;
}

export async function listSurveysForHabitation(habitationId) {
  const { data } = await apiClient.get(`/surveys/habitation/${habitationId}`);
  return data;
}
