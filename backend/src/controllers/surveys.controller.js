const { Survey, Habitation } = require('../models/sql');
const { ApiError } = require('../middleware/errorHandler');
const { computeHviForHabitation } = require('../engines/riskHvi.engine');

// Weighted checklist -> 0-100 vulnerability score, folded into the
// habitation's housing/structural HVI factor (PRD sec.5).
function scoreChecklist(answers) {
  if (!Array.isArray(answers) || answers.length === 0) return null;

  let weightedSum = 0;
  let weightTotal = 0;
  for (const item of answers) {
    const weight = Number(item.weight) || 1;
    let normalized = 0;
    if (typeof item.answer === 'boolean') normalized = item.answer ? 100 : 0;
    else if (typeof item.answer === 'number') normalized = Math.max(0, Math.min(100, item.answer));
    else normalized = 50; // free-text answers contribute a neutral midpoint

    weightedSum += normalized * weight;
    weightTotal += weight;
  }
  return weightTotal > 0 ? Math.round((weightedSum / weightTotal) * 10) / 10 : null;
}

// POST /api/surveys - structured vulnerability checklist submission (FR-05).
async function submitSurvey(req, res, next) {
  const { localUuid, habitationId, answers, lng, lat, notes, surveyedAt } = req.body;
  if (!localUuid || !habitationId) {
    return next(new ApiError(400, 'localUuid and habitationId are required'));
  }

  const existing = await Survey.findOne({ where: { localUuid } });
  if (existing) return res.status(200).json({ success: true, survey: existing, deduped: true });

  const habitation = await Habitation.findByPk(habitationId);
  if (!habitation) throw new ApiError(404, 'Habitation not found');

  const parsedAnswers = typeof answers === 'string' ? JSON.parse(answers) : answers;
  const computedVulnerabilityScore = scoreChecklist(parsedAnswers);

  const survey = await Survey.create({
    localUuid,
    habitationId,
    volunteerId: req.user.id,
    answersJson: parsedAnswers || [],
    scoreInputs: { computedVulnerabilityScore },
    geotag: lng !== undefined && lat !== undefined ? { type: 'Point', coordinates: [Number(lng), Number(lat)] } : null,
    notes,
    status: 'submitted',
    surveyedAt: surveyedAt ? new Date(surveyedAt) : new Date()
  });

  // Immediately fold this survey's score into the habitation's HVI.
  const hviResult = await computeHviForHabitation(habitationId);
  survey.status = 'applied';
  survey.appliedAt = new Date();
  await survey.save();

  const io = req.app.get('io');
  if (io) io.emit('survey:submitted', { survey, hvi: hviResult });

  res.status(201).json({ success: true, survey, hvi: hviResult });
}

async function listSurveysForHabitation(req, res) {
  const surveys = await Survey.findAll({
    where: { habitationId: req.params.habitationId },
    order: [['surveyedAt', 'DESC']]
  });
  res.json({ success: true, surveys });
}

module.exports = { submitSurvey, listSurveysForHabitation };
