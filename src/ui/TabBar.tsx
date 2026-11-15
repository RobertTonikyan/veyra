import { useRouter, type Href, type Tabs } from 'expo-router';
import { CircleCheck, Ellipsis, House, ShoppingBasket, Wallet, type LucideIcon } from 'lucide-react-native';
import type { ComponentProps } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useI18n } from '@/i18n';

import { Text } from './Text';
import { colors, radius, space } from './tokens';

type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

export const TAB_BAR_HEIGHT = 66;

const TAB_META: Record<string, { labelKey: string; Icon: LucideIcon }> = {
  index: { labelKey: 'tabs.home', Icon: House },
  shopping: { labelKey: 'tabs.shopping', Icon: ShoppingBasket },
  chores: { labelKey: 'tabs.chores', Icon: CircleCheck },
  money: { labelKey: 'tabs.money', Icon: Wallet },
  more: { labelKey: 'tabs.more', Icon: Ellipsis },
};

export function tabBarBottomOffset(insetBottom: number): number {
  return Math.max(insetBottom, space.md);
}

function hrefFor(routeName: string): Href {
  return (routeName === 'index' ? '/' : `/${routeName}`) as Href;
}

export function TabBar({ state }: TabBarProps) {
  const { t } = useI18n();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View
      pointerEvents="box-none"
      style={{ position: 'absolute', left: space.lg, right: space.lg, bottom: tabBarBottomOffset(insets.bottom) }}
    >
      <View
        accessibilityRole="tablist"
        style={{
          height: TAB_BAR_HEIGHT,
          borderRadius: radius.pill,
          backgroundColor: 'rgba(46,41,37,0.96)',
          borderWidth: 1,
          borderColor: colors.border,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-around',
          paddingHorizontal: space.xs,
          shadowColor: '#000',
          shadowOpacity: 0.45,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 10 },
          elevation: 12,
        }}
      >
        {state.routes.map((route, index) => {
          const meta = TAB_META[route.name];
          if (!meta) return null;

          const focused = state.index === index;
          const label = t(meta.labelKey);
          const { Icon } = meta;

          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={label}
              onPress={() => {
                if (!focused) router.navigate(hrefFor(route.name));
              }}
              style={{
                minWidth: 58,
                minHeight: 52,
                borderRadius: radius.pill,
                alignItems: 'center',
                justifyContent: 'center',
                gap: 3,
                paddingHorizontal: space.xs,
                backgroundColor: focused ? 'rgba(240,138,108,0.16)' : 'transparent',
              }}
            >
              <Icon size={22} strokeWidth={focused ? 2.1 : 1.7} color={focused ? colors.text : colors.textMuted} />
              <Text
                variant="label"
                align="center"
                numberOfLines={1}
                maxFontSizeMultiplier={1.3}
                style={{ fontSize: 11, letterSpacing: 0, color: focused ? colors.text : colors.textMuted }}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}