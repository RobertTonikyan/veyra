import { Check, Infinity as AnyoneIcon } from 'lucide-react-native';
import { Alert, Pressable, View } from 'react-native';

import type { Member } from '@/household/useMembers';
import { useI18n } from '@/i18n';
import { Avatar, Text, colors, radius, space, touch } from '@/ui';

import type { Chore } from './api';
import { dueLabel, sectionOf } from './dates';

type Props = {
  chore: Chore;
  me: string;
  members: Member[];
  first: boolean;
  onComplete: (chore: Chore) => void;
  onSnooze: (chore: Chore) => void;
  onDelete: (chore: Chore) => void;
};

const EFFORT_KEY: Record<number, string> = { 5: 'quick', 10: 'normal', 20: 'big' };

export function ChoreRow({ chore, me, members, first, onComplete, onSnooze, onDelete }: Props) {
  const { t } = useI18n();
  const section = sectionOf(chore.due_date);
  const assignee = members.find((m) => m.user_id === chore.assignee);
  const isRescue = section === 'overdue' && !!chore.assignee && chore.assignee !== me;
  const rescuePoints = Math.ceil(chore.effort * 1.5);
  const canSnooze = (section === 'overdue' || section === 'today') && chore.snooze_count < 2;

  // who's next when this chore rotates
  let nextName: string | null = null;
  if (chore.rotate && members.length > 1) {
    const idx = members.findIndex((m) => m.user_id === (chore.assignee ?? me));
    nextName = members[(idx + 1) % members.length]?.display_name ?? null;
  }

  const meta = [
    section === 'anytime' ? null : dueLabel(t, chore.due_date),
    chore.recurrence !== 'none' ? t(`chores.recurrence.${chore.recurrence}`) : null,
    chore.is_joint ? t('chores.together') : null,
    chore.rotate ? t('chores.inTurns') : null,
    t(`chores.effort.${EFFORT_KEY[chore.effort] ?? 'normal'}`),
    chore.is_joint
      ? t('chores.pointsEach', { points: chore.effort })
      : isRescue
        ? t('chores.rescuePoints', { points: rescuePoints })
        : t('chores.points', { points: chore.effort }),
    nextName ? t('chores.nextTurn', { name: nextName }) : null,
  ]
    .filter(Boolean)
    .join(' · ');

  function confirmDelete() {
    Alert.alert(t('chores.deleteTitle', { title: chore.title }), undefined, [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: () => onDelete(chore) },
    ]);
  }

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.md,
        minHeight: 64,
        paddingHorizontal: space.lg,
        paddingVertical: space.sm,
        borderTopWidth: first ? 0 : 1,
        borderTopColor: colors.hairline,
      }}
    >
      {/* complete */}
      <Pressable
        onPress={() => onComplete(chore)}
        onLongPress={confirmDelete}
        accessibilityRole="button"
        accessibilityLabel={t('chores.markDone', { title: chore.title })}
        accessibilityHint={meta}
        accessibilityActions={[
          ...(canSnooze ? [{ name: 'snooze', label: t('chores.snooze') }] : []),
          { name: 'delete', label: t('common.delete') },
        ]}
        onAccessibilityAction={(e) => {
          if (e.nativeEvent.actionName === 'snooze') onSnooze(chore);
          if (e.nativeEvent.actionName === 'delete') onDelete(chore);
        }}
        hitSlop={6}
        style={({ pressed }) => ({
          width: 30,
          height: 30,
          borderRadius: radius.pill,
          borderWidth: 2,
          borderColor: isRescue ? colors.honey : section === 'overdue' ? colors.rose : colors.border,
          backgroundColor: pressed ? colors.sage : 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
        })}
      >
        {({ pressed }) => (pressed ? <Check size={16} strokeWidth={3} color={colors.onAccent} /> : null)}
      </Pressable>

      <Pressable onPress={() => onComplete(chore)} onLongPress={confirmDelete} style={{ flex: 1, gap: 2 }} accessible={false}>
        <Text variant="bodyStrong">{chore.title}</Text>
        <Text variant="small" color={isRescue ? 'honey' : 'textMuted'}>
          {meta}
        </Text>
      </Pressable>

      {canSnooze ? (
        <Pressable
          onPress={() => onSnooze(chore)}
          accessibilityRole="button"
          accessibilityLabel={t('chores.snoozeNamed', { title: chore.title })}
          style={({ pressed }) => ({
            minHeight: touch.min - 8,
            paddingHorizontal: space.md,
            borderRadius: radius.pill,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: pressed ? colors.raised : 'transparent',
            justifyContent: 'center',
          })}
        >
          <Text variant="small" color="textSoft">
            {t('chores.snooze')}
          </Text>
        </Pressable>
      ) : null}

      {/* who */}
      <View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden style={{ flexDirection: 'row' }}>
        {chore.is_joint ? (
          members.slice(0, 3).map((m, i) => (
            <View key={m.user_id} style={{ marginStart: i === 0 ? 0 : -8 }}>
              <Avatar name={m.display_name} colorIndex={m.color_index} size={26} />
            </View>
          ))
        ) : assignee ? (
          <Avatar name={assignee.display_name} colorIndex={assignee.color_index} size={26} />
        ) : (
          <View
            style={{
              width: 26,
              height: 26,
              borderRadius: 13,
              borderWidth: 1,
              borderColor: colors.border,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <AnyoneIcon size={14} color={colors.textMuted} />
          </View>
        )}
      </View>
    </View>
  );
}
