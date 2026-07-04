/** When true, show test-only «Godta uten BankID» on sign-terms (staging/dev). */
export function isBankIdAutoAcceptEnabled(): boolean {
  return process.env.NEXT_PUBLIC_BANKID_AUTO_ACCEPT === 'true'
}

/** Server-side guard for auto-accept API. */
export function isBankIdAutoAcceptServerEnabled(): boolean {
  return process.env.BANKID_AUTO_ACCEPT === 'true'
}
