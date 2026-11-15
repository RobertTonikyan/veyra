// Maps errors from our database functions (RPCs) to i18n keys.
// The functions raise short codes like 'invalid_invite' as the message.

type MaybeDbError = { message?: string; code?: string } | null | undefined;

const KNOWN: Record<string, string> = {
  invalid_invite: 'errors.invalidInvite',
  household_full: 'errors.householdFull',
  not_a_member: 'errors.notAMember',
  balance_not_zero: 'errors.balanceNotZero',
  shares_not_set: 'errors.sharesNotSet',
};

export function dbErrorKey(error: unknown): string {
  const e = error as MaybeDbError;
  const message = e?.message ?? '';

  if (message in KNOWN) return KNOWN[message];
  if (/network request failed|failed to fetch/i.test(message)) return 'errors.network';
  return 'errors.generic';
}
