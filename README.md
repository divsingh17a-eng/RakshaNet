# RakshaNet

**AI-driven multi-hazard risk zonation, carrying-capacity assessment & strategic relocation**

Team Jeevan Setu — Smart India Hackathon 2026, Problem Statement 26191 (Ministry of Home Affairs / NDRF)

RakshaNet turns citizen and field reports into a live, explainable Habitation Vulnerability Index
(HVI), screens candidate safe sites for real carrying capacity, ranks at-risk habitations, and
matches them to safe sites — with a human officer approving every relocation before it happens.

```
REPORT → VERIFY → RISK → RED ZONE → SAFE SITE → CAPACITY → MATCH → RELOCATE → MONITOR
```

## Repository structure

```
/backend    Node.js + Express API, Socket.io live feed, PostgreSQL + PostGIS
/web        React.js + Vite + Tailwind CSS Command Center (Leaflet map)
/mobile     React Native (Expo) app - shared Citizen/Volunteer app, offline SQLite queue
/shared     Cross-app constants (roles, zone colors, hazard types, ...)
/database   Migration + seed scripts (deterministic demo dataset)
/docs       PRD, API reference, demo script
/tests      Backend unit/integration tests
```

## Quick start

```bash
npm install                        # installs backend + web + mobile workspaces
cp backend/.env.example backend/.env   # fill in DATABASE_URL at minimum

npm run migrate                    # sync the PostgreSQL + PostGIS schema
npm run seed                       # deterministic demo dataset (6 habitations, 4 safe sites, ...)

npm run dev:backend                # http://localhost:4000
npm run dev:web                    # http://localhost:5173
npm run dev:mobile                 # Expo dev tools (scan with Expo Go)
```

Seeded demo accounts (printed by `npm run seed`, password `RakshaNet@2026`):

| Role | Login |
|---|---|
| Admin | admin@rakshanet.demo |
| DDMA Officer | officer@rakshanet.demo |
| Responder (NDRF) | responder@rakshanet.demo |
| Citizen | +919800000001 (mobile OTP, logged to the backend console) |
| Volunteer | +919800000002 (mobile OTP, logged to the backend console) |

## Database

A single PostgreSQL + PostGIS database holds everything — users, hazard reports, verifications,
surveys, habitations, historized risk/HVI scores, safe sites, site resources, relocation plans and
their (possibly split) allocations, routes, response tasks, alerts, and the audit log. Free managed
hosting: [Neon.tech](https://neon.tech) or [Supabase](https://supabase.com). No Docker required.

See `backend/.env.example` for every environment variable, and [docs/PRD.md](docs/PRD.md) for the
full product spec this build follows.

## Roles

Citizen and Volunteer share one mobile app with different home screens. SDMA/DDMA Officer,
NDRF/Responder, and Administrator use the web Command Center. All access is enforced server-side
(RBAC middleware), never only by hiding UI controls.

## Demo data

`npm run seed` is deterministic and self-consistent: every dashboard KPI is computed live from
these records, never hard-coded. It includes one fully-executed single-site relocation, one
capacity-shortfall scenario that triggers a split allocation, one blocked route (with an
auto-suggested alternate), one pending offline hazard report, and one safe site with a critical
resource gap — see [docs/DEMO_SCRIPT.md](docs/DEMO_SCRIPT.md) for the judge walkthrough.

## License

MIT — built for SIH 2026 by Team Jeevan Setu.
