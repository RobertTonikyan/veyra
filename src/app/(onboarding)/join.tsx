import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';

import { useHousehold } from '@/household/HouseholdProvider';
import { useI18n } from '@/i18n';
import { dbErrorKey } from '@/services/errors';
import { supabase } from '@/services/supabase';
import { BackButton, Button, Screen, Text, TextField, space } from '@/ui';

const CODE_LENGTH = 6;

export default function JoinHouseholdScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const { refresh } = useHousehold();

  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  async function join() {
    if (code.length !== CODE_LENGTH || joining) return;

    setJoining(true);
    setError(null);
    const { error: joinError } = await supabase.rpc('redeem_invite', { p_code: code });

    if (joinError) {
      setJoining(false);
      setError(t(dbErrorKey(joinError)));
      return;
    }

    await refresh(); // now a member → the root layout opens the app
    setJoining(false);
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen>
        <BackButton label={t('common.back')} onPress={() => router.back()} />

        <View style={{ gap: space.xs }}>
          <Text variant="display" accessibilityRole="header">
            {t('onboarding.join.title')}
          </Text>
          <Text color="textSoft">{t('onboarding.join.body')}</Text>
        </View>

        <TextField
          label={t('onboarding.join.codeLabel')}
          error={error}
          value={code}
          onChangeText={(v) => {
            // Codes use A–Z and 2–9 only; ignore anything else.
            setCode(v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, CODE_LENGTH));
            if (error) setError(null);
          }}
          placeholder="ABC234"
          autoCapitalize="characters"
          autoCorrect={false}
          autoComplete="off"
          maxLength={CODE_LENGTH}
          autoFocus
          returnKeyType="go"
          onSubmitEditing={join}
          forceLTR
          style={{ fontSize: 26, letterSpacing: 6, textAlign: 'center' }}
        />

        <Button
          label={t('onboarding.join.submit')}
          loading={joining}
          disabled={code.length !== CODE_LENGTH}
          onPress={join}
          fullWidth
        />
      </Screen>
    </KeyboardAvoidingView>
  );
}
