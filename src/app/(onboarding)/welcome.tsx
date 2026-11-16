import { useRouter } from 'expo-router';
import House from 'lucide-react-native/icons/house';
import KeyRound from 'lucide-react-native/icons/key-round';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';

import { useHousehold } from '@/household/HouseholdProvider';
import { useI18n } from '@/i18n';
import { Button, Screen, Text, TextField, colors, space } from '@/ui';

export default function WelcomeScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const { profile, updateDisplayName } = useHousehold();

  const [name, setName] = useState(profile?.display_name ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<'create' | 'join' | null>(null);

  async function next(target: 'create' | 'join') {
    const clean = name.trim().replace(/\s+/g, ' ');
    if (clean.length === 0 || clean.length > 40) {
      setError(t('onboarding.welcome.nameRequired'));
      return;
    }

    if (clean !== profile?.display_name) {
      setSaving(target);
      const ok = await updateDisplayName(clean);
      setSaving(null);
      if (!ok) {
        setError(t('errors.generic'));
        return;
      }
    }

    router.push(target === 'create' ? '/create' : '/join');
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen contentStyle={{ flexGrow: 1, justifyContent: 'center', paddingBottom: space.xxxl }}>
        <View style={{ gap: space.xs }}>
          <Text variant="display" accessibilityRole="header">
            {t('onboarding.welcome.title')}
          </Text>
          <Text color="textSoft">{t('onboarding.welcome.body')}</Text>
        </View>

        <TextField
          label={t('onboarding.welcome.nameLabel')}
          hint={t('onboarding.welcome.nameHint')}
          error={error}
          value={name}
          onChangeText={(v) => {
            setName(v);
            if (error) setError(null);
          }}
          maxLength={40}
          autoComplete="name"
          textContentType="givenName"
          returnKeyType="next"
        />

        <View style={{ gap: space.sm }}>
          <Button
            label={t('onboarding.welcome.create')}
            icon={<House size={18} color={colors.onAccent} />}
            loading={saving === 'create'}
            disabled={saving !== null}
            onPress={() => next('create')}
            fullWidth
          />
          <Button
            variant="secondary"
            label={t('onboarding.welcome.join')}
            icon={<KeyRound size={18} color={colors.text} />}
            loading={saving === 'join'}
            disabled={saving !== null}
            onPress={() => next('join')}
            fullWidth
          />
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}
