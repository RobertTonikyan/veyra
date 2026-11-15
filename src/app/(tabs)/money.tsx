import { Wallet } from 'lucide-react-native';

import { useI18n } from '@/i18n';
import { EmptyState, Screen, Text } from '@/ui';

export default function MoneyScreen() {
  const { t } = useI18n();

  return (
    <Screen>
      <Text variant="display" accessibilityRole="header">
        {t('tabs.money')}
      </Text>
      <EmptyState Icon={Wallet} title={t('placeholder.title')} body={t('placeholder.body')} />
    </Screen>
  );
}