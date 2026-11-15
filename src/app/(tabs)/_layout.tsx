import { Tabs } from 'expo-router';

import { TabBar } from '@/ui';

export default function TabsLayout() {
  return (
    <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="shopping" />
      <Tabs.Screen name="chores" />
      <Tabs.Screen name="money" />
      <Tabs.Screen name="more" />
    </Tabs>
  );
}