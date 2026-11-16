import Trophy from 'lucide-react-native/icons/trophy';
import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { useHousehold } from '@/household/HouseholdProvider';
import type { Member } from '@/household/useMembers';
import { useI18n } from '@/i18n';
import { Avatar, Card, Segmented, Text, colors, memberColor, radius, space } from '@/ui';

import { WEEKLY_GOAL_PER_MEMBER, useScores, type ScorePeriod } from './api';

export function Leaderboard({ members }: { members: Member[] }) {
  const { t } = useI18n();
  const { household } = useHousehold();
  const [period, setPeriod] = useState<ScorePeriod>('week');
  const { data: scores, isPending } = useScores(period);

  const byId = new Map(members.map((m) => [m.user_id, m]));
  const rows = (scores ?? []).filter((s) => byId.has(s.user_id));
  const teamPoints = rows.reduce((sum, s) => sum + s.points, 0);
  const teamGoal = WEEKLY_GOAL_PER_MEMBER * Math.max(members.length, 1);
  const teamLeft = Math.max(teamGoal - teamPoints, 0);
  const top = Math.max(...rows.map((s) => s.points), 1);

  return (
    <Card style={{ gap: space.lg }}>
      <Segmented
        accessibilityLabel={t('chores.leaderboard')}
        value={period}
        onChange={setPeriod}
        options={[
          { value: 'week', label: t('chores.period.week') },
          { value: 'month', label: t('chores.period.month') },
          { value: 'all', label: t('chores.period.all') },
        ]}
      />

      {/* team goal (weekly) */}
      {period === 'week' ? (
        <View style={{ gap: space.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: space.xs }}>
            <Text variant="label" color="textMuted" style={{ flex: 1 }}>
              {t('chores.teamWeek')}
            </Text>
            <Text variant="number">{teamPoints}</Text>
            <Text color="textMuted">/ {teamGoal}</Text>
          </View>
          <ProgressBar
            value={teamPoints / teamGoal}
            color={colors.accent}
            label={t('chores.teamProgress', { points: teamPoints, goal: teamGoal })}
          />
          <Text variant="small" color={teamLeft === 0 ? 'sage' : 'textSoft'}>
            {teamLeft === 0
              ? t(household?.weekly_reward ? 'chores.goalReachedReward' : 'chores.goalReached', {
                  reward: household?.weekly_reward ?? '',
                })
              : household?.weekly_reward
                ? t('chores.pointsToReward', { points: teamLeft, reward: household.weekly_reward })
                : t('chores.pointsToGoal', { points: teamLeft })}
          </Text>
        </View>
      ) : null}

      {/* members */}
      {isPending ? (
        <ActivityIndicator color={colors.accent} accessibilityLabel={t('common.loading')} />
      ) : (
        <View style={{ gap: space.md }}>
          {rows.map((s, i) => {
            const m = byId.get(s.user_id)!;
            const leader = i === 0 && s.points > 0 && members.length > 1;
            return (
              <View
                key={s.user_id}
                accessible
                accessibilityLabel={t('chores.rankRow', {
                  rank: i + 1,
                  name: m.display_name,
                  points: s.points,
                  chores: s.chores_done,
                  rescues: s.rescues,
                })}
                style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}
              >
                <Text variant="small" color="textMuted" style={{ width: 16 }} align="center">
                  {i + 1}
                </Text>
                <Avatar name={m.display_name} colorIndex={m.color_index} size={34} />
                <View style={{ flex: 1, gap: 4 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
                    <Text variant="bodyStrong" style={{ flex: 1 }} numberOfLines={1}>
                      {m.display_name}
                    </Text>
                    {leader ? <Trophy size={14} color={colors.honey} /> : null}
                    <Text variant="bodyStrong">{s.points}</Text>
                  </View>
                  <ProgressBar
                    value={period === 'week' ? s.points / WEEKLY_GOAL_PER_MEMBER : s.points / top}
                    color={memberColor(m.color_index)}
                  />
                  <Text variant="small" color="textMuted">
                    {t('chores.count', { count: s.chores_done })}
                    {s.rescues > 0 ? ` · ${t('chores.rescuesCount', { count: s.rescues })}` : ''}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </Card>
  );
}

function ProgressBar({ value, color, label }: { value: number; color: string; label?: string }) {
  const pct = Math.max(0, Math.min(1, value));
  return (
    <View
      accessible={!!label}
      accessibilityRole={label ? 'progressbar' : undefined}
      accessibilityLabel={label}
      accessibilityValue={label ? { min: 0, max: 100, now: Math.round(pct * 100) } : undefined}
      style={{ height: 8, borderRadius: radius.pill, backgroundColor: colors.sunken, overflow: 'hidden' }}
    >
      <View style={{ width: `${pct * 100}%`, height: '100%', borderRadius: radius.pill, backgroundColor: color }} />
    </View>
  );
}
