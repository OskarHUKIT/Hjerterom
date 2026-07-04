export const REGISTER_DRAFT_KEY = 'boly_register_draft_v1'

export type RegisterDraftPeriod = {
  start: string
  end: string
  status: 'Tilgjengelig' | 'Utilgjengelig'
}

export type RegisterDraftV1 = {
  v: 1
  step: number
  formData: Record<string, unknown>
  draftPeriods: RegisterDraftPeriod[]
  eventInterest: boolean
  availPaintStatus: 'Tilgjengelig' | 'Utilgjengelig'
}

export function readRegisterDraft(): RegisterDraftV1 | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(REGISTER_DRAFT_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as RegisterDraftV1
    if (parsed?.v !== 1 || typeof parsed.step !== 'number') return null
    if (!parsed.formData || typeof parsed.formData !== 'object') return null
    return parsed
  } catch {
    return null
  }
}

export function saveRegisterDraft(draft: RegisterDraftV1): void {
  if (typeof window === 'undefined') return
  sessionStorage.setItem(REGISTER_DRAFT_KEY, JSON.stringify(draft))
}

export function clearRegisterDraft(): void {
  if (typeof window === 'undefined') return
  sessionStorage.removeItem(REGISTER_DRAFT_KEY)
}
