# Agent brief — Wave 4: Shared data layer

## Objective

Centralize event fetch, auth gates, terms gates, and chat send; consolidate duplicate async patterns.

## Prerequisites

Waves 2–3 complete (hooks exist to invalidate).

## In scope

| File | Action |
|------|--------|
| `frontend/features/events/hooks/usePublishedEventsQuery.ts` | **Create** — single source for central_events + opt-ins |
| `frontend/features/auth/hooks/useAuthGate.ts` | **Create** — modes: landlord-nav, kommune, chat, ops, event-staff |
| `frontend/features/listings/hooks/useTermsGate.ts` | **Create** — scope event \| tourism |
| `frontend/features/messaging/lib/chatSend.ts` | **Create** — insert + notify by channel |
| `frontend/app/hooks/useAsyncQuery.ts` | **Delete** after migrating `/finn` to React Query |
| `frontend/app/finn/page.tsx` | Use React Query instead of useAsyncQuery |

## Wire consumers

- `usePublishedEventsQuery` → `EventTaskCards`, `ListingEventOptIn`, `useListingEventCalendarData`, manage fetch
- `useEventStaffAccess` → event layout, NavDatabase event branch, EventCaseworkerMessagesPage

## Acceptance criteria

- [ ] Only one fetch path for published events per page load
- [ ] Event staff auth in one hook (3 inline effects removed)
- [ ] `useAsyncQuery` deleted; no duplicate async abstractions
- [ ] `npm run build` passes

## Commit

`refactor(wave-4): central event query, auth gates, chat send`
