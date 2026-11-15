// Maps Supabase Auth errors to i18n keys under "auth.errors".
// Codes: https://supabase.com/docs/guides/auth/debugging/error-codes

type MaybeAuthError = { code?: string; status?: number; name?: string } | null | undefined;

export function authErrorKey(error: unknown): string {
  const e = error as MaybeAuthError;

  if (e?.name === 'AuthRetryableFetchError') return 'auth.errors.network';

  switch (e?.code) {
    case 'over_email_send_rate_limit':
    case 'over_request_rate_limit':
      return 'auth.errors.rateLimit';
    case 'otp_expired': // also returned for a wrong code
      return 'auth.errors.invalidCode';
    case 'email_address_invalid':
    case 'validation_failed':
      return 'auth.errors.invalidEmail';
    case 'email_address_not_authorized':
      return 'auth.errors.notAuthorized';
  }

  if (e?.status === 429) return 'auth.errors.rateLimit';
  return 'auth.errors.generic';
}

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
