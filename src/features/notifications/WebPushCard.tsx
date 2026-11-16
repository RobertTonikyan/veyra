import Bell from 'lucide-react-native/icons/bell';
import BellOff from 'lucide-react-native/icons/bell-off';
import Share from 'lucide-react-native/icons/share';
import { Switch, View } from 'react-native';

import { useI18n } from '@/i18n';
import { Button, Card, Text, colors, space } from '@/ui';

import { useWebPush } from './webPush';

/** Settings card for notifications in the browser version (Web Push). */
export function WebPushCard() {
  const { t } = useI18n();
  const push = useWebPush();

  if (push.state === 'unsupported') {
    return (
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
        <BellOff size={20} color={colors.textMuted} />
        <Text color="textSoft" style={{ flex: 1 }}>
          {t('webPush.unsupported')}
        </Text>
      </Card>
    );
  }

  if (push.state === 'install-first') {
    return (
      <Card style={{ gap: space.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
          <Share size={20} color={colors.honey} />
          <Text weight="semibold" style={{ flex: 1 }}>
            {t('webPush.installTitle')}
          </Text>
        </View>
        <Text variant="small" color="textSoft">
          {t('webPush.installSteps')}
        </Text>
      </Card>
    );
  }

  if (push.state === 'denied') {
    return (
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, borderColor: colors.honey }}>
        <BellOff size={20} color={colors.honey} />
        <Text color="textSoft" style={{ flex: 1 }}>
          {t('webPush.denied')}
        </Text>
      </Card>
    );
  }

  if (push.state === 'off') {
    return (
      <Card style={{ gap: space.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
          <Bell size={20} color={colors.textSoft} />
          <Text style={{ flex: 1 }}>{t('webPush.offBody')}</Text>
        </View>
        <Button label={t('webPush.enable')} loading={push.busy} onPress={push.enable} fullWidth />
      </Card>
    );
  }

  return (
    <Card style={{ gap: space.md }}>
      <Toggle
        title={t('webPush.activity')}
        hint={t('webPush.activityHint')}
        value={push.prefs.activity}
        onChange={(v) => push.setPref('activity', v)}
      />
      <View style={{ height: 1, backgroundColor: colors.hairline }} />
      <Toggle
        title={t('webPush.reminders')}
        hint={t('webPush.remindersHint')}
        value={push.prefs.reminders}
        onChange={(v) => push.setPref('reminders', v)}
      />
      <Button variant="ghost" label={t('webPush.disable')} loading={push.busy} onPress={push.disable} fullWidth />
    </Card>
  );
}

function Toggle({ title, hint, value, onChange }: { title: string; hint: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text>{title}</Text>
        <Text variant="small" color="textMuted">
          {hint}
        </Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        accessibilityLabel={title}
        trackColor={{ false: colors.raised, true: colors.accent }}
        thumbColor={colors.text}
      />
    </View>
  );
}
