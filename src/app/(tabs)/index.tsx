import { House, ReceiptText, ShoppingBasket, CircleCheck } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { useI18n } from '@/i18n';
import { Button, EmptyState, Fab, Screen, Sheet, Text, colors, space } from '@/ui';

export default function HomeScreen() {
  const { t } = useI18n();
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const close = () => setQuickAddOpen(false);

  return (
    <View style={{ flex: 1 }}>
      <Screen>
        <Text variant="display" accessibilityRole="header">
          {t('home.greeting', { name: 'Robert' })}
        </Text>
        <EmptyState Icon={House} title={t('placeholder.title')} body={t('placeholder.body')} />
      </Screen>

      <Fab accessibilityLabel={t('quickAdd.open')} onPress={() => setQuickAddOpen(true)} />

      <Sheet visible={quickAddOpen} onClose={close} title={t('quickAdd.title')}>
        <View style={{ gap: space.sm }}>
          <Button
            label={t('quickAdd.item')}
            variant="secondary"
            fullWidth
            icon={<ShoppingBasket size={20} color={colors.text} />}
            onPress={close}
          />
          <Button
            label={t('quickAdd.chore')}
            variant="secondary"
            fullWidth
            icon={<CircleCheck size={20} color={colors.text} />}
            onPress={close}
          />
          <Button
            label={t('quickAdd.expense')}
            variant="secondary"
            fullWidth
            icon={<ReceiptText size={20} color={colors.text} />}
            onPress={close}
          />
        </View>
      </Sheet>
    </View>
  );
}