import { Tabs } from 'expo-router';

import { RealtimeSync } from '@/household/RealtimeSync';
import { TabBar } from '@/ui';

export default function TabsLayout() {
  return (
    <>
      {/* live updates for everything in this household while the app is open */}
      <RealtimeSync />
      <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false }}>
        <Tabs.Screen name="index" />
        <Tabs.Screen name="shopping" />
        <Tabs.Screen name="chores" />
        <Tabs.Screen name="money" />
        <Tabs.Screen name="more" />
      </Tabs>
    </>
  );
}
