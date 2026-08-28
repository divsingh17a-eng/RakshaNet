const Anthropic = require('@anthropic-ai/sdk');
const { Op, literal } = require('sequelize');
const env = require('../config/env');
const logger = require('../config/logger');
const { HazardReport, User, SafeSite } = require('../models/sql');
const { ROLES } = require('../config/constants');

/**
 * Real AI chatbot (Claude, via the Anthropic API) for the Citizen/Volunteer
 * mobile app. Feature-flagged like OTP/SMS-IVR: with no ANTHROPIC_API_KEY the
 * endpoint returns a clear "not configured" message instead of crashing or
 * faking a reply, matching the rest of the app's honesty-about-demo-data rule.
 *
 * Every answer is grounded in a CURRENT DATA block built from the real
 * database (the citizen's own reports, on-duty volunteer count, nearby safe
 * sites) - the model is instructed never to invent numbers beyond it.
 */

let client = null;
function getClient() {
  if (!env.anthropicApiKey) return null;
  if (!client) client = new Anthropic({ apiKey: env.anthropicApiKey });
  return client;
}

function isConfigured() {
  return Boolean(env.anthropicApiKey);
}

async function onDutyVolunteerCount(district) {
  const where = {
    role: ROLES.VOLUNTEER,
    [Op.and]: [literal(`"metadata"->>'isOnDuty' = 'true'`)]
  };
  if (district) where.district = district;
  return User.count({ where });
}

async function buildContext(user) {
  const lines = [];

  if (user.role === ROLES.CITIZEN) {
    const reports = await HazardReport.findAll({
      where: { reporterId: user.id },
      order: [['reportedAt', 'DESC']],
      limit: 5
    });
    if (reports.length === 0) {
      lines.push('This citizen has not submitted any hazard/vulnerability reports yet.');
    } else {
      lines.push("This citizen's recent reports:");
      for (const r of reports) {
        lines.push(`- ${r.type} report, severity ${r.severity}/5, status: ${r.status}, submitted ${r.reportedAt.toISOString().slice(0, 10)}`);
      }
    }
  }

  if (user.role === ROLES.VOLUNTEER) {
    const pendingCount = await HazardReport.count({ where: { status: 'submitted' } });
    lines.push(`You are speaking with a Volunteer (on duty: ${user.metadata?.isOnDuty ? 'yes' : 'no'}).`);
    lines.push(`Reports currently awaiting verification (Assigned Tasks & Missions queue): ${pendingCount}.`);
  }

  const onDuty = await onDutyVolunteerCount(user.district);
  lines.push(`Volunteers currently marked On Duty${user.district ? ` in ${user.district}` : ''}: ${onDuty}.`);

  const safeSites = await SafeSite.findAll({
    where: user.district ? { district: user.district } : {},
    limit: 5
  });
  if (safeSites.length > 0) {
    lines.push('Nearby safe sites:');
    for (const s of safeSites) {
      lines.push(`- ${s.name} (${s.type}), status: ${s.status}, occupancy ${s.occupiedCapacity}/${s.totalCapacity}`);
    }
  } else {
    lines.push('No safe sites are on record for this district yet.');
  }

  return lines.join('\n');
}

const SYSTEM_PROMPT = `You are the RakshaNet Assistant, a helpful in-app chatbot for a disaster-preparedness platform (Team Jeevan Setu, SIH 2026, PS 26191).

Rules:
- Only use the CURRENT DATA block appended below - never invent report statuses, volunteer counts, or shelter details beyond it.
- If asked something the data doesn't cover, say you don't have that information rather than guessing.
- For a real, life-threatening emergency, tell the user to use the app's SOS button or call the national emergency helpline 112 / disaster helpline 1077 - you are an information assistant, not a dispatcher, and must never claim to send help yourself.
- Keep answers short (2-4 sentences) - this renders as a mobile chat bubble, not an essay.
- Be calm, clear, and reassuring; avoid alarming language.`;

async function getChatResponse({ user, message, history = [] }) {
  const anthropic = getClient();
  if (!anthropic) {
    return {
      configured: false,
      reply: "The chatbot isn't set up in this environment yet (no API key configured). For anything urgent, use the SOS button or check the Alerts screen."
    };
  }

  const context = await buildContext(user);
  const messages = [...history, { role: 'user', content: message }];

  try {
    const response = await anthropic.messages.create({
      model: env.chatbotModel,
      max_tokens: 512,
      system: `${SYSTEM_PROMPT}\n\nCURRENT DATA:\n${context}`,
      messages
    });

    const textBlock = response.content.find((block) => block.type === 'text');
    return { configured: true, reply: textBlock?.text || "I'm not sure how to answer that." };
  } catch (err) {
    logger.error(`Chatbot request failed: ${err.message}`);
    if (err instanceof Anthropic.AuthenticationError) {
      return { configured: false, reply: 'The chatbot is misconfigured (invalid API key). Please contact an administrator.' };
    }
    if (err instanceof Anthropic.RateLimitError) {
      return { configured: true, reply: "I'm getting a lot of questions right now - please try again in a moment." };
    }
    return { configured: true, reply: 'Something went wrong answering that. Please try again, or use the SOS button for emergencies.' };
  }
}

module.exports = { isConfigured, getChatResponse };
