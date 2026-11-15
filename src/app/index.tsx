import { View } from 'react-native';

import { LANGUAGES, useI18n } from '@/i18n';
import { Button, Card, Screen, Text, colors, memberColor, radius, space } from '@/ui';

export default function Index() {
  const { t, language, setLanguage, direction } = useI18n();

  return (
    <Screen>
      <Text variant="small" color="textMuted">
        {t('dev.stepTitle')} · {direction.toUpperCase()}
      </Text>
      <Text variant="display">{t('home.greeting', { name: 'Robert' })}</Text>

      <Card style={{ gap: space.md }}>
        <Text variant="label" color="textMuted">
          {t('settings.language')}
        </Text>
        <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
          {LANGUAGES.map((lang) => (
            <Button
              key={lang.code}
              label={lang.nativeName}
              variant={lang.code === language ? 'primary' : 'secondary'}
              accessibilityState={{ selected: lang.code === language }}
              onPress={() => setLanguage(lang.code)}
            />
          ))}
        </View>
      </Card>

      <Card tone="accent" style={{ gap: space.xs }}>
        <Text variant="label" color="onAccent">
          {t('home.houseAsks')}
        </Text>
        <Text variant="title" color="onAccent">
          {t('chores.count', { count: 3 })}
        </Text>
      </Card>

      <Card style={{ gap: space.md }}>
        <Text variant="label" color="textMuted">
          {t('dev.rowDemo')}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: radius.pill,
              borderWidth: 1.5,
              borderColor: memberColor(0),
              backgroundColor: `${memberColor(0)}2E`,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text variant="label" align="center" style={{ color: memberColor(0) }}>
              R
            </Text>
          </View>
          <Text style={{ flex: 1 }}>{t('tabs.chores')}</Text>
          <View style={{ paddingHorizontal: space.sm, paddingVertical: 2, borderRadius: radius.pill, backgroundColor: colors.raised }}>
            <Text variant="label" color="honey">
              +15
            </Text>
          </View>
        </View>
      </Card>

      <Card style={{ gap: space.xs }}>
        <Text variant="label" color="textMuted">
          {t('dev.pluralDemo')}
        </Text>
        {[1, 2, 3, 5, 11, 21].map((n) => (
          <Text key={n} color="textSoft">
            {n} → {t('chores.count', { count: n })}
          </Text>
        ))}
      </Card>
    </Screen>
  );
}