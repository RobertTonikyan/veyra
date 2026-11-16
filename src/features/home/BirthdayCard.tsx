import { Cake, Gift } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { daysUntilBirthday } from '@/features/birthdays';
import { useSendBirthdayWish } from '@/features/settings/api';
import { useHousehold } from '@/household/HouseholdProvider';
import type { Member } from '@/household/useMembers';
import { useI18n } from '@/i18n';
import { Avatar, Button, Card, Text, colors, space } from '@/ui';

const HEADS_UP_DAYS = 3;

/**
 * Today: "היום יום ההולדת של מאיה 🎂" + wish button (or "Happy birthday!" for you).
 * A few days before (couples by default): a quiet heads-up to think of a gift.
 */
export function BirthdayCard({ me, members }: { me: string; members: Member[] }) {
  const { t } = useI18n();
  const { household } = useHousehold();
  const sendWish = useSendBirthdayWish();
  const [wished, setWished] = useState<string[]>([]);

  const withDays = members
    .map((m) => ({ m, days: daysUntilBirthday(m.birth_month, m.birth_day) }))
    .filter((x): x is { m: Member; days: number } => x.days !== null);

  const today = withDays.filter((x) => x.days === 0);
  const headsUpOn = household?.birthday_heads_up ?? household?.type === 'couple';
  const soon = headsUpOn
    ? withDays.filter((x) => x.days > 0 && x.days <= HEADS_UP_DAYS && x.m.user_id !== me)
    : [];

  if (today.length === 0 && soon.length === 0) return null;

  return (
    <View style={{ gap: space.sm }}>
      {today.map(({ m }) => {
        const mine = m.user_id === me;
        const done = wished.includes(m.user_id);
        return (
          <Card
            key={m.user_id}
            tone="accent"
            style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}
            accessibilityLiveRegion="polite"
          >
            <Avatar name={m.display_name} colorIndex={m.color_index} size={44} />
            <View style={{ flex: 1, gap: space.xs }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
                <Cake size={18} color={colors.accent} />
                <Text variant="bodyStrong">
                  {mine ? t('home.birthday.mine') : t('home.birthday.today', { name: m.display_name })}
                </Text>
              </View>
              {!mine ? (
                <Button
                  variant={done ? 'ghost' : 'primary'}
                  label={done ? t('home.birthday.wished') : t('home.birthday.wish')}
                  disabled={done}
                  onPress={() =>
                    sendWish.mutate(m.user_id, { onSuccess: () => setWished((w) => [...w, m.user_id]) })
                  }
                />
              ) : (
                <Text variant="small" color="textSoft">
                  {t('home.birthday.mineSub')}
                </Text>
              )}
            </View>
          </Card>
        );
      })}

      {soon.map(({ m, days }) => (
        <Card key={m.user_id} style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
          <Gift size={22} color={colors.honey} />
          <Text style={{ flex: 1 }} color="textSoft">
            {t('home.birthday.soon', { name: m.display_name, count: days })}
          </Text>
        </Card>
      ))}
    </View>
  );
}
