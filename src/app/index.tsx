import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Card, Text, colors, memberColors, radius, space } from '@/ui';

export default function Index() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: space.xl, gap: space.lg }}>
        <Text variant="small" color="textMuted">
          שלב 0.2 · מערכת עיצוב
        </Text>
        <Text variant="display">Veyra</Text>
        <Text color="textSoft">קניות, מטלות וכסף משותף במקום אחד.</Text>

        <Card tone="accent" style={{ gap: space.sm }}>
          <Text variant="label" color="onAccent">
            הבית מבקש
          </Text>
          <Text variant="title" color="onAccent">
            הזבל מחכה מאתמול. מי לוקח?
          </Text>
        </Card>

        <Card style={{ gap: space.md }}>
          <Text variant="label" color="textMuted">
            צבעי חברים
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
            {memberColors.map((c, i) => (
              <View
                key={c}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: radius.pill,
                  borderWidth: 1.5,
                  borderColor: c,
                  backgroundColor: `${c}2E`,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text variant="label" style={{ color: c }}>
                  {i + 1}
                </Text>
              </View>
            ))}
          </View>
        </Card>

        <Card style={{ gap: space.xs }}>
          <Text variant="label" color="textMuted">
            הוצאות נובמבר
          </Text>
          <Text variant="number">₪3,860</Text>
          <Text variant="small" color="sage">
            בקצב הזה תסיימו כ־₪400 מתחת לתקציב
          </Text>
        </Card>

        <View style={{ gap: space.sm }}>
          <Button label="אני על זה · 15 נק׳" fullWidth />
          <Button label="דחה למחר" variant="secondary" fullWidth />
          <Button label="לכל המטלות" variant="ghost" />
          <Button label="מחיקת החשבון" variant="danger" fullWidth />
          <Button label="שומר..." loading fullWidth />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}