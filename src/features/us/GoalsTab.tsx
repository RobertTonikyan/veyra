import Check from 'lucide-react-native/icons/check';
import PiggyBank from 'lucide-react-native/icons/piggy-bank';
import Plus from 'lucide-react-native/icons/plus';
import Target from 'lucide-react-native/icons/target';
import Trash2 from 'lucide-react-native/icons/trash-2';
import { useState } from 'react';
import { TextInput, View } from 'react-native';

import { Alert } from '@/services/alert';

import { formatMoney, parseMoney } from '@/features/money/format';
import { useI18n } from '@/i18n';
import { dbErrorKey } from '@/services/errors';
import { Button, Card, EmptyState, Segmented, Sheet, Text, TextField, colors, fonts, radius, space } from '@/ui';

import { useAddGoal, useContribute, useDeleteGoal, useGoals, useUpdateGoal, type Goal } from './api';

/** Shared goals: a trip, a new sofa, or anything without money ("run 5k together"). */
export function GoalsTab({ addOpen, onCloseAdd }: { addOpen: boolean; onCloseAdd: () => void }) {
  const { t } = useI18n();
  const { data: goals = [] } = useGoals();
  const update = useUpdateGoal();
  const remove = useDeleteGoal();
  const [contributeTo, setContributeTo] = useState<Goal | null>(null);

  return (
    <View style={{ gap: space.md }}>
      {goals.length === 0 ? (
        <EmptyState Icon={Target} title={t('us.noGoals')} body={t('us.noGoalsBody')} />
      ) : (
        goals.map((g) => {
          const pct = g.target_agorot ? Math.min(g.saved_agorot / g.target_agorot, 1) : null;
          const done = !!g.done_at;
          return (
            <Card key={g.id} style={{ gap: space.md, opacity: done ? 0.7 : 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
                <Text style={{ fontSize: 28, lineHeight: 34 }}>{g.emoji || '🎯'}</Text>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text variant="bodyStrong" style={done ? { textDecorationLine: 'line-through' } : undefined}>
                    {g.title}
                  </Text>
                  {g.target_agorot ? (
                    <Text variant="small" color="textMuted">
                      {t('us.savedOf', { saved: formatMoney(g.saved_agorot), target: formatMoney(g.target_agorot) })}
                    </Text>
                  ) : null}
                </View>
              </View>
              {pct !== null ? (
                <View
                  accessible
                  accessibilityRole="progressbar"
                  accessibilityValue={{ min: 0, max: 100, now: Math.round(pct * 100) }}
                  style={{ height: 10, borderRadius: radius.pill, backgroundColor: colors.sunken, overflow: 'hidden' }}
                >
                  <View
                    style={{
                      width: `${pct * 100}%`,
                      height: '100%',
                      borderRadius: radius.pill,
                      backgroundColor: pct >= 1 ? colors.sage : colors.accent,
                    }}
                  />
                </View>
              ) : null}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
                {g.target_agorot && !done ? (
                  <Button
                    variant="secondary"
                    label={t('us.addMoney')}
                    icon={<PiggyBank size={16} color={colors.text} />}
                    onPress={() => setContributeTo(g)}
                  />
                ) : null}
                <Button
                  variant="ghost"
                  label={done ? t('us.reopen') : t('us.markDone')}
                  icon={<Check size={16} color={colors.textSoft} />}
                  onPress={() => update.mutate({ id: g.id, done: !done })}
                />
                <Button
                  variant="ghost"
                  label={t('common.delete')}
                  icon={<Trash2 size={16} color={colors.textMuted} />}
                  onPress={() =>
                    Alert.alert(t('us.deleteGoal', { title: g.title }), undefined, [
                      { text: t('common.cancel'), style: 'cancel' },
                      { text: t('common.delete'), style: 'destructive', onPress: () => remove.mutate(g.id) },
                    ])
                  }
                />
              </View>
            </Card>
          );
        })
      )}

      <AddGoalSheet visible={addOpen} onClose={onCloseAdd} />
      <ContributeSheet goal={contributeTo} onClose={() => setContributeTo(null)} />
    </View>
  );
}

const EMOJIS = ['🏖️', '✈️', '🛋️', '🚗', '🎁', '🏠', '💍', '🎯'];

function AddGoalSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { t } = useI18n();
  const add = useAddGoal();
  const [title, setTitle] = useState('');
  const [emoji, setEmoji] = useState('🎯');
  const [target, setTarget] = useState('');
  const [error, setError] = useState<string | null>(null);

  function submit() {
    const clean = title.trim().slice(0, 60);
    if (!clean) return;
    const amount = target.trim() ? parseMoney(target) : null;
    if (target.trim() && !amount) return setError(t('money.errors.amount'));
    add.mutate(
      { title: clean, emoji, target_agorot: amount },
      {
        onSuccess: () => {
          setTitle('');
          setTarget('');
          onClose();
        },
        onError: (e) => setError(t(dbErrorKey(e))),
      },
    );
  }

  return (
    <Sheet visible={visible} onClose={onClose} title={t('us.newGoal')}>
      <TextField label={t('us.goalTitle')} placeholder={t('us.goalPlaceholder')} value={title} onChangeText={setTitle} maxLength={60} autoFocus />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }} accessibilityRole="radiogroup">
        {EMOJIS.map((e) => (
          <Text
            key={e}
            onPress={() => setEmoji(e)}
            accessibilityRole="radio"
            accessibilityState={{ checked: emoji === e }}
            style={{
              fontSize: 26,
              lineHeight: 40,
              width: 44,
              textAlign: 'center',
              borderRadius: radius.sm,
              backgroundColor: emoji === e ? colors.raised : 'transparent',
            }}
          >
            {e}
          </Text>
        ))}
      </View>
      <TextField
        label={t('us.goalTarget')}
        hint={t('us.goalTargetHint')}
        value={target}
        onChangeText={(v) => setTarget(v.replace(/[^\d.,]/g, '').slice(0, 10))}
        keyboardType="decimal-pad"
        forceLTR
      />
      {error ? (
        <Text variant="small" color="roseText">
          {error}
        </Text>
      ) : null}
      <Button label={t('common.save')} loading={add.isPending} disabled={!title.trim()} onPress={submit} fullWidth />
    </Sheet>
  );
}

function ContributeSheet({ goal, onClose }: { goal: Goal | null; onClose: () => void }) {
  const { t } = useI18n();
  const contribute = useContribute();
  const [amount, setAmount] = useState('');
  const [direction, setDirection] = useState<'in' | 'out'>('in');
  const [error, setError] = useState<string | null>(null);

  if (!goal) return null;

  function submit() {
    const a = parseMoney(amount);
    if (!a || !goal) return setError(t('money.errors.amount'));
    contribute.mutate(
      { goalId: goal.id, amount: direction === 'in' ? a : -a },
      {
        onSuccess: () => {
          setAmount('');
          onClose();
        },
        onError: (e) => setError(t(dbErrorKey(e))),
      },
    );
  }

  return (
    <Sheet visible onClose={onClose} title={goal.title}>
      <Segmented
        value={direction}
        onChange={setDirection}
        options={[
          { value: 'in', label: t('us.putIn') },
          { value: 'out', label: t('us.takeOut') },
        ]}
      />
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: space.sm,
          paddingHorizontal: space.lg,
          borderRadius: radius.md,
          borderWidth: 1.5,
          borderColor: colors.border,
          backgroundColor: colors.sunken,
          direction: 'ltr',
        }}
      >
        <Text variant="title" color="textMuted">
          ₪
        </Text>
        <TextInput
          value={amount}
          onChangeText={(v) => {
            setAmount(v.replace(/[^\d.,]/g, '').slice(0, 10));
            setError(null);
          }}
          keyboardType="decimal-pad"
          autoFocus
          placeholder="0"
          placeholderTextColor={colors.textMuted}
          accessibilityLabel={t('money.amount')}
          style={{ flex: 1, minHeight: 56, color: colors.text, fontFamily: fonts.bold, fontSize: 28, textAlign: 'left' }}
        />
      </View>
      {error ? (
        <Text variant="small" color="roseText">
          {error}
        </Text>
      ) : null}
      <Button
        label={direction === 'in' ? t('us.putIn') : t('us.takeOut')}
        icon={<Plus size={18} color={colors.onAccent} />}
        loading={contribute.isPending}
        onPress={submit}
        fullWidth
      />
    </Sheet>
  );
}
