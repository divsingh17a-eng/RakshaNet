const { sequelize } = require('../../config/postgres');

const User = require('./user.model');
const Habitation = require('./habitation.model');
const RiskScore = require('./riskScore.model');
const SafeSite = require('./safeSite.model');
const SiteResource = require('./siteResource.model');
const HazardReport = require('./hazardReport.model');
const ReportMedia = require('./reportMedia.model');
const ReportMessage = require('./reportMessage.model');
const Verification = require('./verification.model');
const Survey = require('./survey.model');
const RelocationPlan = require('./relocationPlan.model');
const RelocationAllocation = require('./relocationAllocation.model');
const Route = require('./route.model');
const ResponseTask = require('./responseTask.model');
const Alert = require('./alert.model');
const AuditLog = require('./auditLog.model');
const SosAlert = require('./sosAlert.model');

// --- Associations ---

Habitation.hasMany(RiskScore, { foreignKey: 'habitationId', as: 'riskScores' });
RiskScore.belongsTo(Habitation, { foreignKey: 'habitationId', as: 'habitation' });

SafeSite.hasMany(SiteResource, { foreignKey: 'siteId', as: 'resources' });
SiteResource.belongsTo(SafeSite, { foreignKey: 'siteId', as: 'site' });

Habitation.hasMany(HazardReport, { foreignKey: 'habitationId', as: 'hazardReports' });
HazardReport.belongsTo(Habitation, { foreignKey: 'habitationId', as: 'habitation' });
User.hasMany(HazardReport, { foreignKey: 'reporterId', as: 'hazardReports' });
HazardReport.belongsTo(User, { foreignKey: 'reporterId', as: 'reporter' });

HazardReport.hasMany(ReportMedia, { foreignKey: 'reportId', as: 'media' });
ReportMedia.belongsTo(HazardReport, { foreignKey: 'reportId', as: 'report' });

HazardReport.hasMany(ReportMessage, { foreignKey: 'reportId', as: 'messages' });
ReportMessage.belongsTo(HazardReport, { foreignKey: 'reportId', as: 'report' });
User.hasMany(ReportMessage, { foreignKey: 'senderId', as: 'reportMessages' });
ReportMessage.belongsTo(User, { foreignKey: 'senderId', as: 'sender' });

HazardReport.hasMany(Verification, { foreignKey: 'reportId', as: 'verifications' });
Verification.belongsTo(HazardReport, { foreignKey: 'reportId', as: 'report' });
User.hasMany(Verification, { foreignKey: 'volunteerId', as: 'verifications' });
Verification.belongsTo(User, { foreignKey: 'volunteerId', as: 'volunteer' });

Habitation.hasMany(Survey, { foreignKey: 'habitationId', as: 'surveys' });
Survey.belongsTo(Habitation, { foreignKey: 'habitationId', as: 'habitation' });
User.hasMany(Survey, { foreignKey: 'volunteerId', as: 'surveys' });
Survey.belongsTo(User, { foreignKey: 'volunteerId', as: 'volunteer' });

Habitation.hasMany(RelocationPlan, { foreignKey: 'habitationId', as: 'relocationPlans' });
RelocationPlan.belongsTo(Habitation, { foreignKey: 'habitationId', as: 'habitation' });
User.hasMany(RelocationPlan, { foreignKey: 'createdBy', as: 'createdPlans' });
User.hasMany(RelocationPlan, { foreignKey: 'approvedBy', as: 'approvedPlans' });
RelocationPlan.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });
RelocationPlan.belongsTo(User, { foreignKey: 'approvedBy', as: 'approver' });

RelocationPlan.hasMany(RelocationAllocation, { foreignKey: 'planId', as: 'allocations' });
RelocationAllocation.belongsTo(RelocationPlan, { foreignKey: 'planId', as: 'plan' });
SafeSite.hasMany(RelocationAllocation, { foreignKey: 'siteId', as: 'allocations' });
RelocationAllocation.belongsTo(SafeSite, { foreignKey: 'siteId', as: 'site' });
RelocationAllocation.belongsTo(Route, { foreignKey: 'routeId', as: 'route' });

Habitation.hasMany(Route, { foreignKey: 'sourceId', as: 'routes' });
Route.belongsTo(Habitation, { foreignKey: 'sourceId', as: 'source' });
SafeSite.hasMany(Route, { foreignKey: 'destinationId', as: 'routes' });
Route.belongsTo(SafeSite, { foreignKey: 'destinationId', as: 'destination' });
Route.belongsTo(Route, { foreignKey: 'alternateId', as: 'alternate' });

RelocationPlan.hasMany(ResponseTask, { foreignKey: 'planId', as: 'responseTasks' });
ResponseTask.belongsTo(RelocationPlan, { foreignKey: 'planId', as: 'plan' });
User.hasMany(ResponseTask, { foreignKey: 'responderId', as: 'responseTasks' });
ResponseTask.belongsTo(User, { foreignKey: 'responderId', as: 'responder' });

User.hasMany(SosAlert, { foreignKey: 'reporterId', as: 'sosAlerts' });
SosAlert.belongsTo(User, { foreignKey: 'reporterId', as: 'reporter' });

module.exports = {
  sequelize,
  User,
  Habitation,
  RiskScore,
  SafeSite,
  SiteResource,
  HazardReport,
  ReportMedia,
  ReportMessage,
  Verification,
  Survey,
  RelocationPlan,
  RelocationAllocation,
  Route,
  ResponseTask,
  Alert,
  AuditLog,
  SosAlert
};
