import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { GoalsTab } from '@/features/us/GoalsTab';
import { IdeasTab } from '@/features/us/IdeasTab';
import { NotesTab } from '@/features/us/NotesTab';
import { useHousehold } from '@/household/HouseholdProvider';
import { useI18n } from '@/i18n';
import { BackButton, Fab, Screen, Segmented, Text } from '@/ui';

type Tab = 'ideas' | 'notes' | 'goals';

/** "Us": date ideas, a shared notes board and shared goals. Roommates start on notes. */
export default function UsScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const { household } = useHousehold();
  const isCouple = household?.type === 'couple';
  const [tab, setTab] = useState<Tab>(isCouple ? 'ideas' : 'notes');
  const [adding, setAdding] = useState(false);

  return (
    <View style={{ flex: 1 }}>
      <Screen>
        <BackButton label={t('common.back')} onPress={() => router.back()} />
        <Text variant="display" accessibilityRole="header">
          {isCouple ? t('more.us') : t('us.titleGroup')}
        </Text>

        <Segmented
          value={tab}
          onChange={(v) => {
            setTab(v);
            setAdding(false);
          }}
          options={[
            { value: 'ideas', label: isCouple ? t('us.tabDates') : t('us.tabIdeas') },
            { value: 'notes', label: t('us.tabNotes') },
            { value: 'goals', label: t('us.tabGoals') },
          ]}
        />

        {tab === 'ideas' ? (
          <IdeasTab addOpen={adding} onCloseAdd={() => setAdding(false)} />
        ) : tab === 'notes' ? (
          <NotesTab addOpen={adding} onCloseAdd={() => setAdding(false)} />
        ) : (
          <GoalsTab addOpen={adding} onCloseAdd={() => setAdding(false)} />
        )}
      </Screen>

      <Fab
        accessibilityLabel={tab === 'ideas' ? t('us.newIdea') : tab === 'notes' ? t('us.newNote') : t('us.newGoal')}
        onPress={() => setAdding(true)}
      />
    </View>
  );
}
