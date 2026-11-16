import { useLocalSearchParams } from 'expo-router';
import { Share2 } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { shareText } from '@/services/share';

import { useHousehold } from '@/household/HouseholdProvider';
import { useI18n } from '@/i18n';
import { dbErrorKey } from '@/services/errors';
import { supabase } from '@/services/supabase';
import { Button, Card, Screen, Text, colors, fonts, space } from '@/ui';

export default function InviteScreen() {
  const { t } = useI18n();
  const { refresh } = useHousehold();
  const { householdId, type } = useLocalSearchParams<{ householdId: string; type?: string }>();
  const isCouple = type === 'couple';

  const [code, setCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [finishing, setFinishing] = useState(false);

  const makeCode = useCallback(async () => {
    setError(null);
    const { data, error: inviteError } = await supabase.rpc('create_invite', {
      p_household: householdId,
      p_max_uses: isCouple ? 1 : 19,
    });
    if (inviteError || !data) {
      setError(t(dbErrorKey(inviteError)));
      return;
    }
    setCode(String(data));
  }, [householdId, isCouple, t]);

  useEffect(() => {
    makeCode();
  }, [makeCode]);

  async function share() {
    if (!code) return;
    await shareText(t('onboarding.invite.shareMessage', { code }), t('common.copied'));
  }

  async function finish() {
    setFinishing(true);
    await refresh(); // the house now exists → the root layout opens the app
    setFinishing(false);
  }

  return (
    <Screen contentStyle={{ flexGrow: 1, justifyContent: 'center', paddingBottom: space.xxxl }}>
      <View style={{ gap: space.xs }}>
        <Text variant="display" accessibilityRole="header">
          {t(isCouple ? 'onboarding.invite.titleCouple' : 'onboarding.invite.titleGroup')}
        </Text>
        <Text color="textSoft">{t('onboarding.invite.body')}</Text>
      </View>

      <Card style={{ alignItems: 'center', gap: space.sm, paddingVertical: space.xxl }}>
        <Text variant="label" color="textMuted" align="center">
          {t('onboarding.invite.codeLabel')}
        </Text>

        {code ? (
          <Text
            align="center"
            selectable
            accessibilityLabel={code.split('').join(' ')}
            style={{
              fontFamily: fonts.bold,
              fontSize: 40,
              lineHeight: 48,
              letterSpacing: 8,
              color: colors.accent,
              writingDirection: 'ltr',
            }}
          >
            {code}
          </Text>
        ) : error ? (
          <Text color="roseText" align="center" accessibilityRole="alert">
            {error}
          </Text>
        ) : (
          <ActivityIndicator color={colors.accent} accessibilityLabel={t('common.loading')} />
        )}

        <Text variant="small" color="textMuted" align="center">
          {t(isCouple ? 'onboarding.invite.validity' : 'onboarding.invite.validityGroup')}
        </Text>
      </Card>

      {error ? (
        <Button variant="secondary" label={t('common.retry')} onPress={makeCode} fullWidth />
      ) : (
        <Button
          label={t('onboarding.invite.share')}
          icon={<Share2 size={18} color={colors.onAccent} />}
          disabled={!code}
          onPress={share}
          fullWidth
        />
      )}

      <Button
        variant="ghost"
        label={t('onboarding.invite.continue')}
        loading={finishing}
        onPress={finish}
        fullWidth
      />
    </Screen>
  );
}
