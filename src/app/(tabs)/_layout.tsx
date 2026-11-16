import { Tabs } from 'expo-router';
import { Platform } from 'react-native';

import { NotificationScheduler } from '@/features/notifications/NotificationScheduler';
import { RealtimeSync } from '@/household/RealtimeSync';
import { TabBar, colors } from '@/ui';

export default function TabsLayout() {
  return (
    <>
      {/* live updates for everything in this household while the app is open */}
      <RealtimeSync />
      {/* reminders scheduled on this phone, kept in sync with the house data */}
      {Platform.OS !== 'web' ? <NotificationScheduler /> : null}
      <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.bg } }}>
        <Tabs.Screen name="index" />
        <Tabs.Screen name="shopping" />
        <Tabs.Screen name="chores" />
        <Tabs.Screen name="money" />
        <Tabs.Screen name="more" />
      </Tabs>
    </>
  );
}
