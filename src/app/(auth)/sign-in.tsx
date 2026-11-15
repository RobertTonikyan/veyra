import { useRouter } from 'expo-router';
import { Mail } from 'lucide-react-native';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';

import { EMAIL_PATTERN, authErrorKey } from '@/auth/errors';
import { LANGUAGES, useI18n } from '@/i18n';
import { supabase } from '@/services/supabase';
import { Button, Screen, Text, TextField, colors, radius, space } from '@/ui';

export default function SignInScreen() {
  const { t, language, setLanguage } = useI18n();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function sendCode() {
    const clean = email.trim().toLowerCase();
    if (!EMAIL_PATTERN.test(clean)) {
      setError(t('auth.errors.invalidEmail'));
      return;
    }

    setLoading(true);
    setError(null);
    const { error: authError } = await supabase.auth.signInWithOtp({
      email: clean,
      options: { shouldCreateUser: true },
    });
    setLoading(false);

    if (authError) {
      setError(t(authErrorKey(authError)));
      return;
    }

    router.push({ pathname: '/verify', params: { email: clean } });
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen contentStyle={{ flexGrow: 1, justifyContent: 'center', paddingBottom: space.xxxl }}>
        {/* Logo placeholder until the real mark is ready */}
        <View
          accessible
          accessibilityLabel={t('common.appName')}
          accessibilityRole="image"
          style={{
            width: 64,
            height: 64,
            borderRadius: radius.lg,
            backgroundColor: colors.accent,
            alignItems: 'center',
            justifyContent: 'center',
            alignSelf: 'center',
          }}
        >
          <Text variant="title" weight="extrabold" color="onAccent" align="center">
            V
          </Text>
        </View>

        <View style={{ gap: space.xs }}>
          <Text variant="display" align="center" accessibilityRole="header">
            {t('auth.welcome')}
          </Text>
          <Text color="textSoft" align="center">
            {t('auth.tagline')}
          </Text>
        </View>

        <TextField
          label={t('auth.emailLabel')}
          hint={t('auth.emailHint')}
          error={error}
          value={email}
          onChangeText={(v) => {
            setEmail(v);
            if (error) setError(null);
          }}
          placeholder="name@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="send"
          onSubmitEditing={sendCode}
          forceLTR
        />

        <Button
          label={t('auth.sendCode')}
          icon={<Mail size={18} color={colors.onAccent} />}
          loading={loading}
          disabled={email.trim().length === 0}
          onPress={sendCode}
          fullWidth
        />

        <View
          style={{ flexDirection: 'row', justifyContent: 'center', gap: space.sm, marginTop: space.lg }}
          accessibilityLabel={t('settings.language')}
        >
          {LANGUAGES.map((lang) => (
            <Button
              key={lang.code}
              label={lang.nativeName}
              variant={lang.code === language ? 'secondary' : 'ghost'}
              accessibilityState={{ selected: lang.code === language }}
              onPress={() => setLanguage(lang.code)}
            />
          ))}
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}
