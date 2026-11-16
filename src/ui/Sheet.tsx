import { useEffect, useState, type ReactNode } from 'react';
import { Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
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

/** True while the on-screen keyboard is open. */
function useKeyboardOpen() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvt, () => setOpen(true));
    const hide = Keyboard.addListener(hideEvt, () => setOpen(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return open;
}

export function Sheet({ visible, onClose, title, children }: SheetProps) {
  const { t, direction } = useI18n();
  const insets = useSafeAreaInsets();
  const keyboardOpen = useKeyboardOpen();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      {/* The sheet rises with the keyboard, so inputs and the save button stay visible. */}
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
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
              maxHeight: '92%',
              backgroundColor: colors.surface,
              borderTopLeftRadius: radius.xl,
              borderTopRightRadius: radius.xl,
              borderWidth: 1,
              borderColor: colors.hairline,
              paddingTop: space.md,
              marginTop: insets.top,
            }}
          >
            <View
              style={{
                alignSelf: 'center',
                width: 40,
                height: 5,
                borderRadius: radius.pill,
                backgroundColor: colors.border,
                marginBottom: space.lg,
              }}
            />
            {/* If the content is taller than the space left above the keyboard, it scrolls. */}
            <ScrollView
              style={{ flexGrow: 0, flexShrink: 1 }}
              contentContainerStyle={{
                gap: space.lg,
                paddingHorizontal: space.xl,
                paddingBottom: keyboardOpen ? space.lg : insets.bottom + space.xl,
              }}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
              nestedScrollEnabled
              bounces={false}
            >
              <Text variant="heading" accessibilityRole="header">
                {title}
              </Text>
              {children}
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
