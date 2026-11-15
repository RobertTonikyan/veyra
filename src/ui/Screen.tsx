import type { ReactNode } from 'react';
import { ScrollView, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useI18n } from '@/i18n';

import { colors, space } from './tokens';

type ScreenProps = {
  children: ReactNode;
  scroll?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
};

export function Screen({ children, scroll = true, contentStyle }: ScreenProps) {
  const { direction } = useI18n();

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg, direction }}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={[{ padding: space.xl, gap: space.lg, paddingBottom: 140 }, contentStyle]}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[{ flex: 1, padding: space.xl, gap: space.lg }, contentStyle]}>{children}</View>
      )}
    </SafeAreaView>
  );
}