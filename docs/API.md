# RakshaNet API Reference

Base URL: `{API_BASE_URL}/api` (default local: `http://localhost:4000/api`)

All endpoints except `/auth/*`, `/sms-ivr/*`, and `/health` require `Authorization: Bearer <token>`.
Role checks are enforced server-side in every route (`backend/src/middleware/auth.js`) — never rely
on the client hiding a control.

## Auth

| Method | Endpoint | Who | Purpose |
|---|---|---|---|
| POST | `/auth/otp/request` | Citizen/Volunteer | Send an OTP to a phone number (self-registers as Citizen on first use) |
| POST | `/auth/otp/verify` | Citizen/Volunteer | Verify OTP, returns JWT |
| POST | `/auth/login` | Officer/Responder/Admin | Email + password login, returns JWT |
| POST | `/auth/register` | Admin-created | Create an Officer/Responder/Admin account |
| GET | `/me` | Any authenticated user | Current user + role |

## Reports & Verification

| Method | Endpoint | Who | Purpose |
|---|---|---|---|
| POST | `/reports` | Citizen/Volunteer | Submit a hazard report (multipart, `photos[]`) |
| GET | `/reports` | Any | List/filter reports (`?type=`, `?status=`, `?mine=true`) |
| GET | `/reports/:id` | Any | Report detail + media |
| POST | `/reports/:id/verify` | Volunteer/Officer/Admin | Verified / Rejected / Needs More Evidence / Duplicate |
| GET | `/reports/:id/verifications` | Volunteer/Officer/Admin | Verification history for a report |
| POST | `/surveys` | Volunteer | Submit a structured vulnerability survey for a habitation |
| GET | `/surveys/habitation/:habitationId` | Volunteer/Officer/Admin | Survey history for a habitation |
| POST | `/sync` | Citizen/Volunteer | Batch-sync the offline SQLite queue (`{ reports: [], surveys: [] }`), idempotent on `localUuid` |

## Risk / HVI / Habitations

| Method | Endpoint | Who | Purpose |
|---|---|---|---|
| GET | `/habitations` | Officer/Responder/Admin/Volunteer | List habitations (`?district=`, `?zone=`) |
| POST | `/habitations` | Officer/Admin | Create a habitation |
| GET | `/habitations/:id` | Officer/Responder/Admin/Volunteer | HVI, top contributing factors, score history, linked reports/surveys/plans |
| PATCH | `/habitations/:id` | Officer/Admin | Update habitation inputs (population, housing type, road access, ...) |
| GET | `/risk/map` | Any dashboard/mobile role | Live map layers: habitations, safe sites, hazard reports |
| POST | `/risk/recalculate` | Officer/Admin | Recompute HVI/risk/zone for every habitation from current data |

## Safe Sites & Resources

| Method | Endpoint | Who | Purpose |
|---|---|---|---|
| GET | `/safe-sites` | Any dashboard/mobile role | List sites with a live capacity assessment |
| POST | `/safe-sites` | Officer/Admin | Create a safe site (seeds default resource rows) |
| GET | `/safe-sites/:id` | Any dashboard/mobile role | Site detail + resources + assessment |
| PATCH | `/safe-sites/:id` | Officer/Admin | Update site fields |
| PATCH | `/safe-sites/:id/resources` | Officer/Admin | Upsert one resource's stock/daily-need |
| POST | `/safe-sites/:id/capacity-check` | Any dashboard role | Assess capacity for a hypothetical incoming population |
| GET | `/safe-sites/redistribution?district=` | Officer/Responder/Admin | Suggest resource transfers between sites |
| GET | `/resources` | Officer/Responder/Admin | Resource Monitor: stock, requirement, days of coverage, status |

## Relocation

| Method | Endpoint | Who | Purpose |
|---|---|---|---|
| POST | `/relocation/recommend` | Officer/Admin | Preview an AI recommendation (not persisted) |
| POST | `/relocation/plans` | Officer/Admin | Persist a recommendation as a Pending-Approval plan (with allocations) |
| POST | `/relocation/plans/generate-all` | Officer/Admin | Generate/refresh plans for every at-risk habitation |
| GET | `/relocation/plans` | Officer/Responder/Admin | Ranked list of plans |
| GET | `/relocation/plans/:id` | Officer/Responder/Admin | Plan detail with allocations + sites |
| PATCH | `/relocation/plans/:id` | Officer/Admin | `{ action: 'approve'\|'modify'\|'reject', decisionNotes, overrideStressTestWarnings }` |

Approval only changes safe-site occupancy and only after a stress test (re-checks every allocated
site's capacity/resources with the incoming population folded in). A failed stress test 409s unless
`overrideStressTestWarnings: true` is explicitly passed by the officer.

## Routes & Response

| Method | Endpoint | Who | Purpose |
|---|---|---|---|
| GET | `/routes` | Officer/Responder/Admin | List routes (`?habitationId=`, `?siteId=`) |
| POST | `/routes` | Officer/Admin | Create/refresh a habitation→site route |
| PATCH | `/routes/:id/status` | Officer/Responder/Admin | Set Clear/Congested/Blocked/Unknown; auto-suggests an alternate |
| GET | `/response/tasks` | Officer/Responder/Admin | List response tasks (`?status=`, `?mine=true`) |
| POST | `/response/tasks/:id/claim` | Responder/Admin | Self-assign a task |
| PATCH | `/response/tasks/:id` | Responder/Admin | Advance Assigned → En Route → On Site → Resolved |

## SOS, Alerts, Audit, Dashboard

| Method | Endpoint | Who | Purpose |
|---|---|---|---|
| POST | `/sos` | Citizen/Volunteer | Trigger an SOS with live location |
| GET | `/sos` | Officer/Responder/Admin | Active SOS alerts |
| PATCH | `/sos/:id/status` | Officer/Responder/Admin | Acknowledge/dispatch/resolve/false-alarm |
| GET | `/alerts` | Any authenticated user | Alerts addressed to this user/role/district |
| PATCH | `/alerts/:id/read` | Any authenticated user | Mark an alert read |
| GET | `/audit-logs` | Admin | Full privileged-action audit trail |
| GET | `/dashboard/summary` | Officer/Responder/Admin | Every Overview KPI, computed live from the database |
| GET | `/exports/relocation-report?format=json\|csv\|pdf\|docx` | Officer/Responder/Admin | Relocation/resource report export |
| GET | `/sms-ivr/status` | Any authenticated user | Whether the SMS/IVR adapter is live (Twilio/Exotel configured) or demo-mock |
| POST | `/sms-ivr/inbound` | Gateway webhook | Converts an inbound SMS/IVR report into the same report pipeline |

## Live feed (Socket.io)

Connect with `auth: { token: <JWT> }`. Emits: `report:new`, `report:verified`, `survey:submitted`,
`risk:recalculated`, `safeSite:updated`, `relocationPlan:created`, `relocationPlan:updated`,
`route:updated`, `responseTask:updated`, `sos:new`, `sos:updated`, `alert:new`, `sync:completed`.
