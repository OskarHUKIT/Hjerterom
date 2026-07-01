# Agent brief — Wave 4b: Chat UI + send layer

## Objective

Deduplicate chat bubble/composer UI and centralize message send + notifications.

## Prerequisites

W3a complete (`NavMessagesPage.tsx` exists).

## In scope

| File | Action |
|------|--------|
| `frontend/features/messaging/components/ChatMessageBubble.tsx` | **Create** |
| `frontend/features/messaging/components/ChatComposer.tsx` | **Create** — text, images, quick replies |
| `frontend/features/messaging/lib/chatSend.ts` | **Create** — channel-aware insert + notify |
| `frontend/features/messaging/components/NavMessagesPage.tsx` | Use shared bubble/composer |
| `frontend/features/messaging/components/EventCaseworkerMessagesPage.tsx` | Use shared bubble/composer |
| `frontend/features/messaging/components/GuestBookingChatPanel.tsx` | Use bubble where applicable |

## Acceptance criteria

- [ ] Visual parity for all three chat surfaces
- [ ] Send logic not duplicated inline in NavMessagesPage
- [ ] `npm run build` passes

## Commit

`refactor(wave-4): shared ChatMessageBubble, ChatComposer, chatSend`
