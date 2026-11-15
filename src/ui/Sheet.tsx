import type { ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useI18n } from '@/i18n';

import { Text } from './Text';
import { colors, radius, space } from './tokens';

type SheetProps = {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
};

export function Sheet({ visible, onClose, title, children }: SheetProps) {
  const { t, direction } = useI18n();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      {/* A Modal is its own root, so the direction must be set again here. */}
      <View style={{ flex: 1, justifyContent: 'flex-end', direction }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.close')}
          onPress={onClose}
          style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.55)' }]}
        />
        <View
          accessibilityViewIsModal
          style={{
            backgroundColor: colors.surface,
            borderTopLeftRadius: radius.xl,
            borderTopRightRadius: radius.xl,
            borderWidth: 1,
            borderColor: colors.hairline,
            paddingHorizontal: space.xl,
            paddingTop: space.md,
            paddingBottom: insets.bottom + space.xl,
            gap: space.lg,
          }}
        >
          <View
            style={{ alignSelf: 'center', width: 40, height: 5, borderRadius: radius.pill, backgroundColor: colors.border }}
          />
          <Text variant="heading" accessibilityRole="header">
            {title}
          </Text>
          {children}
        </View>
      </View>
    </Modal>
  );
}