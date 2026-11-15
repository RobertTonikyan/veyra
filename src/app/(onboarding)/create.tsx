import { useRouter } from 'expo-router';
import { Equal, Heart, House, Percent, Users } from 'lucide-react-native';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';

import type { HouseholdType, SplitMode } from '@/household/HouseholdProvider';
import { useI18n } from '@/i18n';
import { dbErrorKey } from '@/services/errors';
import { supabase } from '@/services/supabase';
import { BackButton, Button, ChoiceCard, Screen, Text, TextField, space } from '@/ui';

const TYPES = [
  { type: 'couple', Icon: Heart },
  { type: 'roommates', Icon: Users },
  { type: 'family', Icon: House },
] as const;

const SPLITS = [
  { mode: 'equal', Icon: Equal },
  { mode: 'percent', Icon: Percent },
] as const;

export default function CreateHouseholdScreen() {
  const { t } = useI18n();
  const router = useRouter();

  const [type, setType] = useState<HouseholdType>('couple');
  const [name, setName] = useState(() => t('onboarding.create.defaultName.couple'));
  const [nameEdited, setNameEdited] = useState(false);
  const [split, setSplit] = useState<SplitMode>('equal');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function pickType(next: HouseholdType) {
    setType(next);
    // Keep suggesting a fitting name until the user types their own.
    if (!nameEdited) setName(t(`onboarding.create.defaultName.${next}`));
  }

  async function submit() {
    const clean = name.trim().replace(/\s+/g, ' ');
    if (clean.length === 0 || clean.length > 40) {
      setError(t('onboarding.create.nameRequired'));
      return;
    }

    setSubmitting(true);
    setError(null);

    const { data: householdId, error: createError } = await supabase.rpc('create_household', {
      p_name: clean,
      p_type: type,
    });

    if (createError || !householdId) {
      setSubmitting(false);
      setError(t(dbErrorKey(createError)));
      return;
    }

    if (split === 'percent') {
      // Non-critical: if this fails the house stays on "equal" and can be changed in settings.
      await supabase.from('households').update({ split_mode: 'percent' }).eq('id', householdId);
    }

    setSubmitting(false);
    router.replace({ pathname: '/invite', params: { householdId: String(householdId), type } });
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen>
        <BackButton label={t('common.back')} onPress={() => router.back()} />

        <Text variant="display" accessibilityRole="header">
          {t('onboarding.create.title')}
        </Text>

        <View style={{ gap: space.sm }}>
          <Text variant="heading">{t('onboarding.create.whoLives')}</Text>
          <View accessibilityRole="radiogroup" style={{ gap: space.sm }}>
            {TYPES.map(({ type: value, Icon }) => (
              <ChoiceCard
                key={value}
                Icon={Icon}
                title={t(`onboarding.create.types.${value}.title`)}
                description={t(`onboarding.create.types.${value}.desc`)}
                selected={type === value}
                onPress={() => pickType(value)}
              />
            ))}
          </View>
        </View>

        <TextField
          label={t('onboarding.create.nameLabel')}
          value={name}
          onChangeText={(v) => {
            setName(v);
            setNameEdited(true);
            if (error) setError(null);
          }}
          maxLength={40}
        />

        <View style={{ gap: space.sm }}>
          <Text variant="heading">{t('onboarding.create.splitTitle')}</Text>
          <View accessibilityRole="radiogroup" style={{ gap: space.sm }}>
            {SPLITS.map(({ mode, Icon }) => (
              <ChoiceCard
                key={mode}
                Icon={Icon}
                title={t(`onboarding.create.split.${mode}.title`)}
                description={t(`onboarding.create.split.${mode}.desc`)}
                selected={split === mode}
                onPress={() => setSplit(mode)}
              />
            ))}
          </View>
          <Text variant="small" color="textMuted">
            {t('onboarding.create.splitNote')}
          </Text>
        </View>

        {error ? (
          <Text variant="small" color="roseText" accessibilityRole="alert">
            {error}
          </Text>
        ) : null}

        <Button label={t('onboarding.create.submit')} loading={submitting} onPress={submit} fullWidth />
      </Screen>
    </KeyboardAvoidingView>
  );
}
