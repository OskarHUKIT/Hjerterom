# Hjerterum — Agent briefs (smart zone)

Each file below is a **self-contained packet** for a fresh agent context window. Copy the brief + listed files into a new session; do not assume prior conversation history.

## Rules for every agent

1. Read **`docs/hjerterum/SERVICE_FLOW.md`** § relevant to your wave (lanes, gates).
2. Read **`docs/hjerterum/REFACTOR_PLAN.md`** for global constraints (no file >800 lines, thin routes).
3. **Scope lock:** Only touch files listed in the brief. No drive-by refactors.
4. **Parity:** Behavior must stay identical unless the brief says otherwise.
5. **Verify:** Run `cd frontend && npm run build` before commit.
6. **Commit:** Use prefix `refactor(wave-N):` or `fix(p0):` from the brief.

## Wave index

| Brief | Status | Est. diff | Depends on |
|-------|--------|-----------|------------|
| [P0-payment-types.md](./P0-payment-types.md) | Ready | ~200 lines | — |
| [W1-foundation.md](./W1-foundation.md) | ✅ Done (PR #21) | ~400 lines | — |
| [W2-listings-manage.md](./W2-listings-manage.md) | Ready | ~600 lines | W1 |
| [W2-listings-details-query.md](./W2-listings-details-query.md) | Ready | ~400 lines | W1 |
| [W3-messaging-thin.md](./W3-messaging-thin.md) | Ready | ~50 lines move | W1 |
| [W3-nav-database-query.md](./W3-nav-database-query.md) | Ready | ~800 lines | W1 |
| [W4-shared-data-layer.md](./W4-shared-data-layer.md) | Ready | ~500 lines | W2, W3 |
| [W5-persona-finn.md](./W5-persona-finn.md) | Ready | ~700 lines | W4 |
| [W6-route-groups-i18n.md](./W6-route-groups-i18n.md) | Ready | Large | W5 |

## Smoke checklist (all waves)

- [ ] `/homeowner/manage` — listings load, calendar add/delete period
- [ ] `/nav/database` — boligbank loads, filter works
- [ ] `/nav/messages` — inbox loads
- [ ] `/finn` — search results
- [ ] `/finn/mine` — guest bookings (if auth)

## Branch naming

`cursor/app-refactor-wave{N}-020a` off `main` (or continue on existing refactor branch).
