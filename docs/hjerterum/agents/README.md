# Hjerterum — Agent briefs (smart zone)

Each file below is a **self-contained packet** for a fresh agent context window. Copy the brief + listed files into a new session; do not assume prior conversation history.

## Rules for every agent

1. Read **`docs/hjerterum/SERVICE_FLOW.md`** § relevant to your wave (lanes, gates).
2. Read **`docs/hjerterum/REFACTOR_PLAN.md`** for global constraints (no file >800 lines, thin routes).
3. For UI work: **`docs/hjerterum/DESIGN_SYSTEM.md`**, **`docs/hjerterum/PRD.md` §15**, **`docs/hjerterum/UI_UX_GOVERNANCE.md`**.
4. **Scope lock:** Only touch files listed in the brief. No drive-by refactors.
5. **Parity:** Behavior must stay identical unless the brief says otherwise.
6. **Verify:** Run `cd frontend && npm run build` before commit.
7. **Commit:** Use prefix `refactor(wave-N):` or `fix(p0):` from the brief.

## Wave index

| Brief | Status | Est. diff | Depends on |
|-------|--------|-----------|------------|
| [P0-payment-types.md](./P0-payment-types.md) | ✅ Done | ~200 lines | — |
| [W1-foundation.md](./W1-foundation.md) | ✅ Done (PR #21) | ~400 lines | — |
| [W2-listings-manage.md](./W2-listings-manage.md) | ✅ Done | ~600 lines | W1 |
| [W2-listings-details-query.md](./W2-listings-details-query.md) | ✅ Done | ~400 lines | W1 |
| [W2-manage-ui-splits.md](./W2-manage-ui-splits.md) | ✅ Done | ~500 lines | W2a |
| [W3-messaging-thin.md](./W3-messaging-thin.md) | ✅ Done | ~50 lines move | W1 |
| [W3-nav-database-query.md](./W3-nav-database-query.md) | ✅ Done | ~800 lines | W1 |
| [W3-nav-ui-splits.md](./W3-nav-ui-splits.md) | ✅ Done | ~850 lines | W3b |
| [W4-shared-data-layer.md](./W4-shared-data-layer.md) | ✅ Done | ~500 lines | W2, W3 |
| [W4-chat-ui.md](./W4-chat-ui.md) | ✅ Done | ~400 lines | W3a |
| [W5-persona-finn.md](./W5-persona-finn.md) | ✅ Done | ~700 lines | W4 |
| [W6-route-groups-i18n.md](./W6-route-groups-i18n.md) | ✅ Done (scoped) | i18n+eslint+e2e | W5 |

## Smoke checklist (all waves)

- [ ] `/homeowner/manage` — listings load, calendar add/delete period
- [ ] `/nav/database` — boligbank loads, filter works
- [ ] `/nav/messages` — inbox loads
- [ ] `/finn` — search results
- [ ] `/finn/mine` — guest bookings (if auth)

## NPD index (juli 2026 — post-audit)

Orchestration: **[`../NPD_PLAN.md`](../NPD_PLAN.md)** · Audits: `UX_UI_AUDIT_RESULTS.txt`, `audits/PRODUCT_GROWTH_AUDIT_RESULTS.txt`

| Brief | Prioritet | Depends on |
|-------|-----------|------------|
| [NPD-0A-skip-link-i18n.md](./NPD-0A-skip-link-i18n.md) | P0 | — |
| [NPD-0B-event-demo-seed.md](./NPD-0B-event-demo-seed.md) | P0 | — |
| [NPD-1A-marketing-chrome.md](./NPD-1A-marketing-chrome.md) | P1 | 0A |
| [NPD-1B-nav-desktop-chrome.md](./NPD-1B-nav-desktop-chrome.md) | P1 | 0A |
| [NPD-2-event-sb-journey.md](./NPD-2-event-sb-journey.md) | P1 | 0B |
| [NPD-3A-guest-landlord-thread.md](./NPD-3A-guest-landlord-thread.md) | P1 | — |
| [NPD-3B-instant-book-e2e.md](./NPD-3B-instant-book-e2e.md) | P1 | 3A (soft) |
| [NPD-3C-vipps-checkout.md](./NPD-3C-vipps-checkout.md) | P2 | env |
| [NPD-3D-booking-concurrency.md](./NPD-3D-booking-concurrency.md) | P2 | 3B |
| [NPD-4A-finn-locale-consistency.md](./NPD-4A-finn-locale-consistency.md) | P1 | 1A |
| [NPD-4B-sami-audit-m5.md](./NPD-4B-sami-audit-m5.md) | P1 gate | 4A |

Branch naming: `cursor/npd-{brief-slug}-6155` off `main`.

## Branch naming (refactor waves)

`cursor/app-refactor-wave{N}-020a` off `main` (or continue on existing refactor branch).
