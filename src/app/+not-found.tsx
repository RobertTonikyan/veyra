import { Redirect } from 'expo-router';

import { useAuth } from '@/auth/AuthProvider';
import { useHousehold } from '@/household/HouseholdProvider';

/**
 * The app opens at "/", which belongs to the (tabs) group. When (tabs) is
 * protected (signed out, or no house yet) "/" has no match and Expo Router
 * shows "Unmatched Route". Instead, send the user to where they belong.
 */
export default function NotFound() {
  const { session } = useAuth();
  const { household } = useHousehold();

  if (!session) return <Redirect href="/sign-in" />;
  if (!household) return <Redirect href="/welcome" />;
  return <Redirect href="/" />;
}