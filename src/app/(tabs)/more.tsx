import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Heart,
  LogOut,
  Settings,
  UtensilsCrossed,
  type LucideIcon,
} from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { useAuth } from '@/auth/AuthProvider';
import { LANGUAGES, useI18n } from '@/i18n';
import { Button, Card, Screen, Text, colors, space } from '@/ui';

const ITEMS: { key: string; Icon: LucideIcon }[] = [
  { key: 'more.meals', Icon: UtensilsCrossed },
  { key: 'more.us', Icon: Heart },
  { key: 'more.calendar', Icon: CalendarDays },
  { key: 'more.settings', Icon: Settings },
];

export default function MoreScreen() {
  const { t, isRTL, language, setLanguage } = useI18n();
  const { session, signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  const Chevron = isRTL ? ChevronLeft : ChevronRight;

  return (
    <Screen>
      <Text variant="display" accessibilityRole="header">
        {t('tabs.more')}
      </Text>

      <Card padded={false}>
        {ITEMS.map(({ key, Icon }, i) => (
          <Pressable
            key={key}
            accessibilityRole="button"
            accessibilityLabel={t(key)}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: space.md,
              minHeight: 56,
              paddingHorizontal: space.lg,
              borderTopWidth: i === 0 ? 0 : 1,
              borderTopColor: colors.hairline,
              backgroundColor: pressed ? colors.raised : 'transparent',
            })}
          >
            <Icon size={20} strokeWidth={1.8} color={colors.textSoft} />
            <Text style={{ flex: 1 }}>{t(key)}</Text>
            <Chevron size={18} color={colors.textMuted} />
          </Pressable>
        ))}
      </Card>

      <Card style={{ gap: space.md }}>
        <Text variant="label" color="textMuted">
          {t('settings.language')}
        </Text>
        <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
          {LANGUAGES.map((lang) => (
            <Button
              key={lang.code}
              label={lang.nativeName}
              variant={lang.code === language ? 'primary' : 'secondary'}
              accessibilityState={{ selected: lang.code === language }}
              onPress={() => setLanguage(lang.code)}
            />
          ))}
        </View>
      </Card>

      <Card style={{ gap: space.md }}>
        <Text variant="small" color="textMuted">
          {t('settings.signedInAs', { email: session?.user.email ?? '' })}
        </Text>
        <Button
          variant="danger"
          label={t('settings.signOut')}
          icon={<LogOut size={18} color={colors.roseText} />}
          loading={signingOut}
          onPress={async () => {
            setSigningOut(true);
            await signOut();
          }}
          fullWidth
        />
      </Card>
    </Screen>
  );
}
