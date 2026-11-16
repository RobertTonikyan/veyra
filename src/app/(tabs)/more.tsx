import { useRouter, type Href } from 'expo-router';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Heart,
  Settings,
  UtensilsCrossed,
  type LucideIcon,
} from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { useI18n } from '@/i18n';
import { Card, Screen, Text, colors, radius, space } from '@/ui';

type Item = { key: string; Icon: LucideIcon; href?: Href };

const ITEMS: Item[] = [
  { key: 'more.meals', Icon: UtensilsCrossed, href: '/meals' },
  { key: 'more.us', Icon: Heart, href: '/us' },
  { key: 'more.calendar', Icon: CalendarDays, href: '/calendar' },
  { key: 'more.settings', Icon: Settings, href: '/settings' },
];

export default function MoreScreen() {
  const { t, isRTL } = useI18n();
  const router = useRouter();
  const Chevron = isRTL ? ChevronLeft : ChevronRight;

  return (
    <Screen>
      <Text variant="display" accessibilityRole="header">
        {t('tabs.more')}
      </Text>

      <Card padded={false}>
        {ITEMS.map(({ key, Icon, href }, i) => {
          const ready = !!href;
          return (
            <Pressable
              key={key}
              disabled={!ready}
              onPress={() => href && router.push(href)}
              accessibilityRole="button"
              accessibilityLabel={ready ? t(key) : `${t(key)}, ${t('more.soon')}`}
              accessibilityState={{ disabled: !ready }}
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
              <Icon size={20} strokeWidth={1.8} color={ready ? colors.textSoft : colors.textMuted} />
              <Text style={{ flex: 1 }} color={ready ? 'text' : 'textMuted'}>
                {t(key)}
              </Text>
              {ready ? (
                <Chevron size={18} color={colors.textMuted} />
              ) : (
                <View
                  style={{
                    paddingHorizontal: space.sm,
                    paddingVertical: 2,
                    borderRadius: radius.pill,
                    backgroundColor: colors.sunken,
                  }}
                >
                  <Text variant="small" color="textMuted">
                    {t('more.soon')}
                  </Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </Card>
    </Screen>
  );
}
