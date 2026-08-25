**RAKSHANET**

**AI-BUILD-READY PRODUCT REQUIREMENTS DOCUMENT**

*AI-Driven Multi-Hazard Risk Zonation, Carrying Capacity Assessment &
Strategic Relocation*

**SIH 2026 • Problem Statement 26191 • Team Jeevan Setu**

**0. Instructions to the AI Coding Agent**

- Build a working, modular product—not static mock screens. Every
  visible primary action must work.

- Use the product name RakshaNet only. Never display “v2.0”.

- Use one React Native Expo mobile app with role-based Citizen and
  Volunteer dashboards; use a separate responsive web Command Center for
  authorities.

- Use PostgreSQL + PostGIS as the primary database. Add MongoDB only if
  genuinely useful; do not add complexity without value.

- Prefer deterministic, explainable risk and matching logic for the
  hackathon. Keep interfaces ready for future ML replacement.

- Use seeded demo data so the complete demo works without external
  government APIs.

- Never claim live government/satellite integration unless credentials
  and an actual integration exist. Clearly label sample/demo data.

- Do not allow AI to silently execute evacuation. Officer approval is
  mandatory.

- Do not hard-code dashboard KPIs; calculate them from the database.

- Keep secrets in environment variables and never commit credentials.

**1. Product Definition**

RakshaNet is a proactive disaster-risk intelligence and strategic
relocation platform. It connects citizen/field reports, hazard and GIS
information, habitation vulnerability, safe-site discovery,
carrying-capacity validation, strategic matching and relocation
monitoring.

The product answers: Where is the risk? Who is vulnerable? Where can
they safely go? Can that destination support them?

**REPORT → VERIFY → RISK → RED ZONE → SAFE SITE → CAPACITY → MATCH →
RELOCATE → MONITOR**

**2. Scope**

**2.1 In scope**

- Citizen hazard reporting and SOS.

- Volunteer verification and structured vulnerability surveys.

- Offline reporting with local queue and automatic synchronization.

- SMS/IVR low-connectivity reporting adapter.

- Multi-hazard risk scoring and Red/Orange/Yellow/Green zonation.

- Explainable Habitation Vulnerability Index (HVI).

- GIS map and habitation/safe-site visualization.

- Safe-site screening and carrying-capacity assessment.

- Capacity-aware site matching and split allocation.

- Immediate, Short-Term and Medium-Term relocation planning.

- Route status and alternate route/site suggestions.

- Officer review and human-in-the-loop approval.

- Response tracking, resources, reports and audit log.

**2.2 Out of scope**

- Guaranteed disaster prediction.

- Autonomous evacuation without officer approval.

- Training a production satellite AI model from scratch.

- Full live integration with every government system.

- Payments/billing and multi-tenant SaaS.

- App-store publication for the hackathon.

**3. Roles & Permissions**

| **Role** | **Interface** | **Main actions** |
|----|----|----|
| Citizen | Mobile Citizen Dashboard | SOS, report hazard/vulnerability, alerts, nearby risk, own reports |
| Volunteer / Field Worker | Mobile Volunteer Dashboard | Assigned tasks, verify reports, surveys, evidence, status updates |
| SDMA/DDMA Officer | Web Command Center | Risk/HVI review, safe-site approval, capacity, relocation approval/modification |
| NDRF / Response Team | Response view | Receive prioritized tasks, routes, Assigned/En Route/On Site/Resolved |
| Administrator | Web Admin | Users, roles, configuration, data sources, audit logs |

Citizen and Volunteer must remain in the same mobile application but
have different home screens, navigation and permissions. Citizens must
not see complex operational controls.

**4. Functional Requirements**

**FR-01 Authentication:** Phone OTP for citizens/volunteers; secure
officer/admin login; role middleware enforced on backend; seeded demo
accounts.

**FR-02 Citizen Reporting:** Hazard type, description, severity, GPS,
timestamp and media; validation; upload/sync status; retry.

**FR-03 SOS:** Large SOS button, location capture, confirmation,
high-priority command-center event.

**FR-04 Volunteer Verification:** Verified / Rejected / Needs More
Evidence / Duplicate; verifier, timestamp, notes and evidence stored.

**FR-05 Vulnerability Survey:** Structured habitation checklist, photos,
geotag, offline draft and submission.

**FR-06 Offline:** SQLite queue, local UUID, retry with backoff,
idempotent sync, visible Pending Sync state.

**FR-07 SMS/IVR:** Gateway/adapter converts low-connectivity reports
into the same backend report pipeline; source_channel recorded.

**FR-08 Risk Zonation:** 0–100 risk score, Red/Orange/Yellow/Green zone,
configurable thresholds, calculation timestamp and history.

**FR-09 HVI:** Explainable habitation-level score combining hazard and
vulnerability inputs; show contributing factors.

**FR-10 Safe Sites:** Candidate sites with coordinates,
total/occupied/available capacity, resources, accessibility and status.

**FR-11 Capacity:** Required vs available capacity; resource
sufficiency; Surplus/Adequate/Critical; shortfall calculation.

**FR-12 Strategic Matching:** Rank sites using safety, capacity fit,
accessibility, distance, resources and route reliability.

**FR-13 Relocation:** Immediate 0–72h, Short-Term 1–6m, Medium-Term
6–24m; plan states Draft/Pending Approval/Approved/In
Execution/Completed.

**FR-14 Routes:** Clear/Congested/Blocked/Unknown; distance/time;
alternate route/site recommendation.

**FR-15 Command Center:** Overview, map, critical habitations, safe
sites, relocation planner, resources, response and reports.

**FR-16 AI Recommendation:** Recommendation card with action, reasons,
site, capacity, shortfall, route and alternatives.

**FR-17 Human Approval:** Officer Approve / Modify / Reject;
modification/rejection reason required.

**FR-18 Monitoring:** Assigned → En Route → On Site → Resolved; update
occupancy/resources.

**FR-19 Audit:** Log privileged actions, actor, timestamp, entity,
before/after values.

**FR-20 Export:** Generate PDF/Word/CSV relocation/resource/action
report.

**5. HVI & Risk Engine**

Implement the first version as a transparent weighted scoring service.
Exact weights are configurable and stored with each calculation.

| **Factor** | **Default weight** | **Meaning** |
|----|----|----|
| Hazard exposure | 30% | Current multi-hazard exposure/severity |
| Population vulnerability | 25% | Population and vulnerable-group exposure |
| Housing/structural vulnerability | 20% | Housing/structural condition |
| Accessibility/infrastructure | 15% | Road access, infrastructure and isolation |
| Historical/environmental risk | 10% | Historical or environmental indicators |

Normalize every factor to 0–100. HVI = weighted sum, clamped to 0–100.
Store factor values, weights, model/scoring version and timestamp. Show
the top three contributing factors in the UI.

Suggested demo zone thresholds: 0–39 Green, 40–59 Yellow, 60–79 Orange,
80–100 Red. Make thresholds configurable.

Do not present HVI as a guaranteed prediction. It is a
risk/vulnerability decision-support score.

**6. Site Matching & Capacity Logic**

Suggested matching score: 30% Safety + 25% Capacity Fit + 15%
Accessibility + 15% Distance + 10% Resource Sufficiency + 5% Route
Reliability. All components are 0–100.

- Exclude unsafe sites.

- Prefer sites with enough available capacity.

- Penalize long distance, poor accessibility and unreliable routes.

- Return the top three candidates and their component scores.

- Display “Why this site?” using the highest-impact positive factors.

- If one site cannot accommodate the prioritized population, generate a
  split allocation.

- Do not change actual site occupancy until an officer approves the
  plan.

- Run a relocation stress test before approval to detect
  capacity/resource overload.

**7. Relocation Plan Data**

| **Field**                     | **Requirement**                          |
|-------------------------------|------------------------------------------|
| Source habitation             | Required                                 |
| Affected population           | Required                                 |
| Immediate-priority population | Required where different                 |
| HVI / zone                    | Required                                 |
| Urgency tier                  | Immediate / Short-Term / Medium-Term     |
| Destination site(s)           | One or multiple                          |
| Allocation                    | Population per destination               |
| Capacity check                | Required / Available / Shortfall         |
| Route                         | Distance, time, status                   |
| Resource impact               | Before/after capacity                    |
| Recommendation reasons        | Required                                 |
| Approval                      | Officer + timestamp                      |
| Execution status              | Assigned / En Route / On Site / Resolved |

**8. Database Model**

| **Entity** | **Important fields** |
|----|----|
| users | id, name, phone/email, role, status, created_at |
| hazard_reports | id, local_uuid, reporter_id, type, severity, description, lat, lng, status, source_channel, created_at |
| report_media | id, report_id, url, type, metadata |
| verifications | id, report_id, volunteer_id, decision, notes, created_at |
| surveys | id, habitation_id, volunteer_id, answers_json, score_inputs, status |
| habitations | id, name, district, lat, lng, population, vulnerable_population, geometry |
| risk_scores | id, habitation_id, risk_score, zone, hvi, factors_json, model_version, calculated_at |
| safe_sites | id, name, type, lat, lng, total_capacity, occupied_capacity, status |
| site_resources | id, site_id, resource_type, quantity, daily_need, unit |
| relocation_plans | id, habitation_id, priority_tier, priority_population, status, created_by, approved_by |
| relocation_allocations | id, plan_id, site_id, population, match_score, capacity_before, capacity_after |
| routes | id, source_id, destination_id, distance_km, duration_min, status, alternate_id |
| response_tasks | id, plan_id, responder_id, status, timestamps |
| alerts | id, audience, type, message, zone, created_at |
| audit_logs | id, actor_id, action, entity_type, entity_id, before_json, after_json, created_at |

**9. API Contract**

| **Method** | **Endpoint**              | **Purpose**             |
|------------|---------------------------|-------------------------|
| POST       | /api/auth/login           | Authenticate            |
| GET        | /api/me                   | Current user/role       |
| POST       | /api/reports              | Create report           |
| GET        | /api/reports              | List/filter reports     |
| GET        | /api/reports/:id          | Report detail           |
| POST       | /api/reports/:id/verify   | Volunteer verification  |
| POST       | /api/surveys              | Submit field survey     |
| GET        | /api/habitations          | List habitations        |
| GET        | /api/habitations/:id      | Habitation/HVI detail   |
| GET        | /api/risk/map             | Map layers              |
| POST       | /api/risk/recalculate     | Recalculate risk        |
| GET        | /api/safe-sites           | Candidate sites         |
| POST       | /api/relocation/recommend | Generate recommendation |
| POST       | /api/relocation/plans     | Create plan             |
| PATCH      | /api/relocation/plans/:id | Approve/modify/reject   |
| GET        | /api/routes               | Routes                  |
| PATCH      | /api/response/tasks/:id   | Response status         |
| GET        | /api/resources            | Resource monitor        |
| POST       | /api/sync                 | Offline synchronization |
| GET        | /api/audit-logs           | Audit log               |
| GET        | /api/dashboard/summary    | Computed KPIs           |

**10. Mobile UI**

**10.1 Citizen Dashboard**

- SOS

- Report Hazard

- Report Vulnerability

- My Reports

- Alerts

- Nearby Risk Map

- Profile/Settings

**10.2 Volunteer Dashboard**

- Assigned Tasks

- Nearby Reports

- Verify Report

- Field Survey

- Risk Map

- Task Status

- Task History

The Volunteer dashboard should be operational and task-focused. It
should not expose authority-only relocation approval controls.

**11. Web Command Center**

- Overview: Critical Habitations, Red Zones, Vulnerable Population,
  Available Relocation Capacity, Critical Resource Gaps, Pending
  Verification.

- Live Risk Map: hazard filters, risk zones, habitation pins, safe-site
  pins and route overlays.

- Habitation Detail: HVI, risk drivers, history, population, reports and
  recommended action.

- Safe Site Detail: total/occupied/available capacity, resource status,
  accessibility and suitability.

- Relocation Planner: ranked plans, site match, split allocation,
  capacity check and approval.

- AI Recommendation Card: “Recommended Action”, reasons, selected site,
  alternatives, capacity and route.

- Resources: stock, daily requirement, days of coverage and
  Surplus/Adequate/Critical status.

- Routes & Response: status and responder state.

- Reports & Export: PDF/Word/CSV.

- Audit Log: all privileged decisions.

**12. UI/UX Rules**

- Risk colors must mean the same thing everywhere.

- Citizen UI: minimal text, large buttons, simple language.

- Volunteer UI: task and evidence focused.

- Command Center: map-first and information-dense, but use side
  panels/context drawers where possible.

- Every data-driven screen needs loading, empty, error and success
  states.

- Offline records show Pending Sync until confirmed.

- Do not make non-functional controls look clickable.

- Show Demo Data wherever sample datasets are used.

- Do not display unexplained AI scores.

**13. Technology Stack**

| **Layer**            | **Technology**                                     |
|----------------------|----------------------------------------------------|
| Mobile               | React Native + Expo                                |
| Web                  | React.js + Vite + Tailwind CSS                     |
| Maps                 | Leaflet.js and/or Google Maps JS API               |
| Offline              | SQLite via expo-sqlite                             |
| Backend              | Node.js + Express.js                               |
| Realtime             | Socket.io                                          |
| Auth                 | JWT + phone OTP via Firebase Auth or Twilio Verify |
| Database             | PostgreSQL + PostGIS                               |
| Optional document DB | MongoDB Atlas                                      |
| Media                | Cloudinary or AWS S3                               |
| Messaging            | Twilio/Exotel + Firebase Cloud Messaging           |
| Risk/GIS             | PostGIS + transparent scoring service              |

Do not add TensorFlow/PyTorch unless a real model is implemented. The
hackathon version can use a transparent scoring service and optional
pretrained image/duplicate detection.

**14. Repository Structure**

- /mobile — React Native Expo app

- /web — React/Vite/Tailwind Command Center

- /backend — Node/Express API

- /shared — types, validation schemas, constants

- /database — migrations and seed scripts

- /docs — PRD/API/demo documentation

- /tests — unit/integration/e2e tests

**15. Offline + SMS/IVR Flow**

**ONLINE → REPORT → API → VERIFY → RISK**

**OFFLINE → LOCAL SQLITE → AUTO-SYNC → API → VERIFY → RISK**

**SMS/IVR → GATEWAY ADAPTER → REPORT API → VERIFY → RISK**

- Use local UUID/idempotency to prevent duplicates.

- Retry failed syncs with backoff.

- Keep pending reports after app restart.

- Record source_channel = APP / OFFLINE_APP / SMS / IVR.

- No separate sync screen is required.

**16. Seeded Demo Data**

- At least 6 habitations with different HVI values/zones.

- At least 4 safe sites with different capacity/resource profiles.

- At least 8 hazard reports.

- Demo accounts for Citizen, Volunteer, Officer, Responder and Admin.

- One successful single-site relocation scenario.

- One capacity-shortfall scenario that triggers split allocation.

- One blocked/congested route scenario.

- One pending offline report.

- One critical resource-gap scenario.

All demo totals must be mathematically consistent. If six HVI scores are
visible, the average must match those six scores. If 765 people are
affected but 180 are prioritized for immediate relocation, the UI must
explicitly show both numbers.

**17. High-Impact Judge Demo**

1.  Citizen submits a hazard report with GPS/photo.

2.  Volunteer verifies it.

3.  Command Center shows the habitation as high risk.

4.  Open HVI and show the contributing factors.

5.  Open safe sites and compare candidates.

6.  Run relocation recommendation.

7.  Show capacity shortfall and split allocation.

8.  Show route status/alternate route.

9.  Officer approves the plan.

10. Responder updates Assigned → En Route → On Site → Resolved.

11. Return to dashboard and show updated capacity/resources.

**18. Security**

- Backend-enforced RBAC; never rely only on hidden UI controls.

- HTTPS in deployment.

- Secrets in environment variables.

- Input validation on every API.

- File type/size validation.

- Audit privileged actions.

- Limit exposure of personal information.

- Do not commit .env or credentials.

**19. Testing**

| **Area** | **Minimum tests** |
|----|----|
| Risk/HVI | Weighted score, normalization, zone thresholds, factor explanation |
| Capacity | Available capacity, shortfall, resource status |
| Matching | Ranking, unsafe-site exclusion, split allocation |
| Permissions | Citizen/Volunteer/Officer/Responder/Admin access |
| Offline | Create offline, persist, restart app, sync, retry, idempotency |
| Workflow | Report → Verify → Risk; Recommend → Approve → Dispatch |
| UI | Loading, empty, error, success and offline states |
| Data consistency | KPIs and averages match seeded records |

**20. Acceptance Criteria / Definition of Done**

- Clean project setup and documented start/deploy commands.

- All five roles authenticate and receive correct permissions.

- Citizen and Volunteer dashboards are different.

- Citizen reporting works online and offline.

- Offline reports survive app restart and sync later.

- SMS/IVR adapter/mock works or is cleanly feature-flagged if
  credentials are unavailable.

- Risk/HVI is calculated from seeded data and is explainable.

- GIS displays zones, habitations and safe sites.

- Safe-site capacity is dynamic.

- Split allocation works.

- AI recommendation explains why a site/action was selected.

- Officer approval/modification/rejection works.

- Response status works.

- Resource and occupancy values update after approved movement.

- Export works.

- Audit logs work.

- No visible “v2.0” branding remains.

- No dashboard KPI is hard-coded.

- Critical paths are tested.

**21. Deployment**

- GitHub: source control and deployment trigger.

- Backend: Render/Railway or equivalent managed Node host.

- Web: Vercel/Netlify or equivalent.

- PostgreSQL/PostGIS: Supabase/Neon or equivalent.

- MongoDB Atlas only if used.

- Media: Cloudinary/S3.

- Mobile: Expo Go for fastest demo or EAS APK.

- No Docker required for the hackathon.

**22. Environment Variables**

| **Variable**                   | **Use**               |
|--------------------------------|-----------------------|
| DATABASE_URL                   | PostgreSQL connection |
| MONGODB_URI                    | Optional MongoDB      |
| JWT_SECRET                     | JWT signing           |
| API_BASE_URL                   | Backend URL           |
| MAPS_API_KEY                   | Maps/geocoding        |
| TWILIO_SID / TWILIO_AUTH_TOKEN | Optional SMS/IVR      |
| FIREBASE_CONFIG                | Push notifications    |
| MEDIA_STORAGE_KEY              | Media provider        |

Provide .env.example. Never commit real values.

**23. Build Order**

| **Phase** | **Build**                                                     |
|-----------|---------------------------------------------------------------|
| P0-1      | Repo scaffold, auth, roles, DB schema, migrations, seed data  |
| P0-2      | Citizen/Volunteer mobile UI + reporting + SOS                 |
| P0-3      | Offline queue + sync                                          |
| P0-4      | Volunteer verification + survey                               |
| P0-5      | Risk/HVI + GIS                                                |
| P0-6      | Safe sites + capacity                                         |
| P0-7      | Matching + relocation planner                                 |
| P0-8      | Officer approval + response tracking                          |
| P1        | Resources, audit, reports, SMS/IVR, optional image checks     |
| P0 final  | Testing, data consistency, polish, deployment, demo rehearsal |

**24. Copy-Paste Prompt for an AI Coding Agent**

Build RakshaNet from this PRD. Inspect the repository first and preserve
working code. Implement a functional React Native Expo mobile app,
React/Vite/Tailwind Command Center and Node/Express backend with
PostgreSQL/PostGIS. Use role-based access for Citizen, Volunteer,
Officer, Responder and Admin. Citizens and Volunteers share the same
mobile app but have different dashboards.

Implement the complete flow: REPORT → VERIFY → RISK → RED ZONE → SAFE
SITE → CAPACITY → MATCH → RELOCATE → MONITOR. Implement offline SQLite
reporting with automatic sync and an SMS/IVR adapter feeding the same
report pipeline. Implement transparent 0–100 HVI/risk scoring with
configurable weights and visible contributing factors. Implement
safe-site capacity, resource status, split allocation, site matching,
route status, relocation tiers, AI-assisted recommendations and human
officer approval.

Seed deterministic demo data and calculate all dashboard metrics from
the database. Include one successful relocation and one
capacity-shortfall/split-allocation scenario. Every primary UI action
must work. Add loading/error/empty/offline states, validation, RBAC,
audit logs and tests. Do not expose secrets. Do not claim live external
integrations unless configured. Do not display “v2.0”.

Before finishing, run the tests, seed the database, verify the
end-to-end demo flow, check that all dashboard numbers are consistent,
and provide exact local setup and deployment commands.

**25. Alignment With the Supplied PRD**

The supplied PRD establishes the original problem, goals, roles and core
functional modules for ground intelligence, multi-hazard risk zonation,
carrying capacity and the command center. fileciteturn1file0L23-L61
It also specifies HVI, capacity/resource status, relocation tiers,
report export and offline/SMS/IVR requirements.
fileciteturn1file0L65-L95 This document expands those requirements
into implementation-level specifications for an AI coding agent; the
additional algorithms, schemas, API contracts, acceptance criteria and
build phases are explicit implementation recommendations rather than
claims that they were all present in the original PRD.
