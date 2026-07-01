# Agent brief — Wave 3a: Thin NavMessages route

## Objective

Move `MessagesContent` from route file to feature module; route becomes re-export only.

## Context to read

- `frontend/app/nav/messages/page.tsx` (~1,965 lines)
- `frontend/app/homeowner/manage/page.tsx` (thin re-export pattern)
- `frontend/features/messaging/components/EventCaseworkerMessagesPage.tsx`

## In scope

| File | Action |
|------|--------|
| `frontend/features/messaging/components/NavMessagesPage.tsx` | **Create** — move `MessagesContent` + types + helpers |
| `frontend/app/nav/messages/page.tsx` | Reduce to Suspense + re-export (~15 lines) |
| `frontend/app/nav/messages/loading.tsx` | Keep or point to PageSkeleton |

## Out of scope

- Chat bubble/composer extraction (Wave 3b)
- Sidebar splits
- React Query for threads

## Acceptance criteria

- [ ] All message modes work: kommune landlord chat, staff chat, event tab, guest booking
- [ ] Deep links `?with=`, `?event=`, `?booking=` unchanged
- [ ] `app/nav/messages/page.tsx` < 30 lines
- [ ] `npm run build` passes

## Commit

`refactor(wave-3): thin nav/messages route via NavMessagesPage`
