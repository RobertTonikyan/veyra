import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, View, type TextInput } from 'react-native';

import { authErrorKey } from '@/auth/errors';
import { useI18n } from '@/i18n';
import { supabase } from '@/services/supabase';
import { Button, Screen, Text, TextField, space } from '@/ui';

const RESEND_SECONDS = 60;

export default function VerifyScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email?: string }>();
  const inputRef = useRef<TextInput>(null);

  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_SECONDS);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  if (!email) return <Redirect href="/sign-in" />;

  async function verify(token: string) {
    if (token.length < 6 || loading) return;
    setLoading(true);
    setError(null);
    const { error: authError } = await supabase.auth.verifyOtp({ email: email!, token, type: 'email' });
    setLoading(false);

    if (authError) {
      setError(t(authErrorKey(authError)));
      setCode('');
      inputRef.current?.focus();
    }
    // On success the session changes and the root layout switches to the app.
  }

  async function resend() {
    setNotice(null);
    setError(null);
    const { error: authError } = await supabase.auth.signInWithOtp({
      email: email!,
      options: { shouldCreateUser: true },
    });
    if (authError) {
      setError(t(authErrorKey(authError)));
      return;
    }
    setCooldown(RESEND_SECONDS);
    setNotice(t('auth.resent'));
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen contentStyle={{ flexGrow: 1, justifyContent: 'center', paddingBottom: space.xxxl }}>
        <View style={{ gap: space.xs }}>
          <Text variant="display" accessibilityRole="header">
            {t('auth.verifyTitle')}
          </Text>
          <Text color="textSoft">{t('auth.verifySubtitle', { email })}</Text>
        </View>

        <TextField
          ref={inputRef}
          label={t('auth.codeLabel')}
          error={error}
          value={code}
          onChangeText={(v) => {
            const digits = v.replace(/\D/g, '').slice(0, 8);
            setCode(digits);
            if (error) setError(null);
          }}
          placeholder="••••••"
          keyboardType="number-pad"
          textContentType="oneTimeCode"
          autoComplete="one-time-code"
          maxLength={8}
          autoFocus
          returnKeyType="done"
          onSubmitEditing={() => verify(code)}
          forceLTR
          style={{ fontSize: 26, letterSpacing: 8, textAlign: 'center' }}
        />

        <Button
          label={t('auth.verify')}
          loading={loading}
          disabled={code.length < 6}
          onPress={() => verify(code)}
          fullWidth
        />

        {notice ? (
          <Text variant="small" color="sage" align="center" accessibilityLiveRegion="polite">
            {notice}
          </Text>
        ) : null}

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: space.xs }}>
          <Button
            variant="ghost"
            label={cooldown > 0 ? t('auth.resendIn', { seconds: cooldown }) : t('auth.resend')}
            disabled={cooldown > 0}
            onPress={resend}
          />
          <Button variant="ghost" label={t('auth.changeEmail')} onPress={() => router.back()} />
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}
