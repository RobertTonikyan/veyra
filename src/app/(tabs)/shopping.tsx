import { ShoppingBasket } from 'lucide-react-native';

import { useI18n } from '@/i18n';
import { EmptyState, Screen, Text } from '@/ui';

export default function ShoppingScreen() {
  const { t } = useI18n();

  return (
    <Screen>
      <Text variant="display" accessibilityRole="header">
        {t('tabs.shopping')}
      </Text>
      <EmptyState Icon={ShoppingBasket} title={t('placeholder.title')} body={t('placeholder.body')} />
    </Screen>
  );
}