# RakshaNet — Judge Demo Script

Run `npm run migrate && npm run seed` first (see root [README](../README.md)). The seed produces a
fully-consistent dataset in Idukki, Kerala with every scenario below already in place, so the demo
can jump straight to the interesting parts instead of building state live.

## 1. Citizen submits a hazard report (mobile)

Log in on the mobile app as the demo Citizen (`+91 98000 00001`, OTP logged to the backend
console). Tap **Report Hazard** → pick Landslide → attach a photo → GPS auto-fills → Submit.
Point out the offline queue: turn off Wi-Fi first and show the report still saves locally with a
"Pending Sync" badge, then reconnect and watch it sync automatically — no separate sync screen.

## 2. Volunteer verifies it (mobile)

Switch to the demo Volunteer (`+91 98000 00002`). Open **Verify Report**, pick the new report,
mark it **Verified** with a note. This is the same pipeline the seeded reports went through.

## 3. Command Center shows the habitation as high risk (web)

Log in as the demo Officer (`officer@rakshanet.demo`). Open the **Live Risk Map** — Munnar
Hillview Colony is Red. Click its pin.

## 4. Open HVI and show the contributing factors

**Habitation Detail** shows HVI, current zone, and the top three contributing factors with their
weights (hazard exposure, population vulnerability, housing/structural, accessibility, historical) —
never an unexplained score.

## 5. Open safe sites and compare candidates

**Safe Site Detail** for Adimali Relief Camp vs. the deliberately under-resourced Vandiperiyar
School Shelter — point out the Critical resource badges on Vandiperiyar (this is the seeded
critical-resource-gap scenario).

## 6. Run relocation recommendation

Open **Relocation Planner**. Munnar's plan is already Approved/Resolved (step 9 below) — instead
open the **Periyar Riverside Basti** plan: 2,400 affected, 1,800 prioritized for immediate
relocation. Both numbers are shown explicitly, never conflated.

## 7. Show capacity shortfall and split allocation

Periyar's plan allocates across two sites (Adimali + Nedumkandam) because no single site had
1,800 spare capacity — the split is visible with each site's population share and match score.

## 8. Show route status/alternate route

Open **Routes & Response**. Rajakkad Border Hamlet → Kattappana Stadium Camp is **Blocked**, with
an auto-suggested **Clear** alternate route to Adimali. Periyar → Kattappana is **Congested**.

## 9. Officer approves the plan

Approve the Periyar plan (or re-open the already-approved Munnar plan to show the audit trail).
Approval re-runs the capacity stress test before touching any occupancy number — if it were to
fail, the officer sees exactly why and must explicitly override or resolve it first.

## 10. Responder updates Assigned → En Route → On Site → Resolved

Log in as the demo Responder (`responder@rakshanet.demo`). Open **Response Tasks**, claim the
Munnar task (already walked through its full lifecycle in seed data — show the timestamps), or
advance a freshly-approved task live through each status.

## 11. Return to dashboard and show updated capacity/resources

Back on the **Overview**, every KPI — Critical Habitations, Vulnerable Population, Available
Relocation Capacity, Critical Resource Gaps, Pending Verification — is computed live from the
database, so the numbers already reflect the approval and dispatch just performed.

---

Everything above is backed by the same deterministic seed (`database/seed.js`), so re-running the
demo always starts from the same known-good state.
