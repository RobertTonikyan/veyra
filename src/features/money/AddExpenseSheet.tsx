import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';

import type { Member } from '@/household/useMembers';
import { useI18n } from '@/i18n';
import { Avatar, Button, Sheet, Text, TextField, colors, fonts, radius, space } from '@/ui';

import type { NewExpense } from './api';
import { EXPENSE_CATEGORIES, type ExpenseCategory } from './categories';
import { ExpenseIcon } from './ExpenseIcon';
import { formatMoney, parseMoney } from './format';

type Props = {
  visible: boolean;
  me: string;
  members: Member[];
  splitMode: 'equal' | 'percent';
  onClose: () => void;
  onSubmit: (expense: NewExpense) => void;
};

function isoDaysAgo(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function AddExpenseSheet({ visible, me, members, splitMode, onClose, onSubmit }: Props) {
  const { t } = useI18n();
  const [amountText, setAmountText] = useState('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('groceries');
  const [paidBy, setPaidBy] = useState(me);
  const [participants, setParticipants] = useState<string[]>([]);
  const [daysAgo, setDaysAgo] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // fresh form each time it opens
  useEffect(() => {
    if (!visible) return;
    setAmountText('');
    setTitle('');
    setCategory('groceries');
    setPaidBy(me);
    setParticipants(members.map((m) => m.user_id));
    setDaysAgo(0);
    setError(null);
  }, [visible]);

  const amount = parseMoney(amountText);
  const everyone = participants.length === members.length;
  const share = amount && participants.length > 0 ? Math.round(amount / participants.length) : null;

  function toggleParticipant(id: string) {
    setParticipants((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  }

  function submit() {
    if (!amount) {
      setError(t('money.errors.amount'));
      return;
    }
    if (participants.length === 0) {
      setError(t('money.errors.participants'));
      return;
    }
    onSubmit({
      title: title.trim().replace(/\s+/g, ' ').slice(0, 60) || t(`money.categories.${category}`),
      amount_agorot: amount,
      paid_by: paidBy,
      category,
      spent_on: isoDaysAgo(daysAgo),
      participants: everyone ? null : participants,
    });
    onClose();
  }

  return (
    <Sheet visible={visible} onClose={onClose} title={t('money.addTitle')}>
      <ScrollView style={{ maxHeight: 560 }} contentContainerStyle={{ gap: space.lg }} keyboardShouldPersistTaps="handled">
        {/* amount — big, always left-to-right */}
        <View style={{ gap: space.xs }}>
          <Text variant="label" color="textSoft">
            {t('money.amount')}
          </Text>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: space.sm,
              paddingHorizontal: space.lg,
              borderRadius: radius.md,
              borderWidth: 1.5,
              borderColor: error && !amount ? colors.rose : colors.border,
              backgroundColor: colors.sunken,
              direction: 'ltr',
            }}
          >
            <Text variant="title" color="textMuted">
              ₪
            </Text>
            <TextInput
              value={amountText}
              onChangeText={(v) => {
                setAmountText(v.replace(/[^\d.,]/g, '').slice(0, 12));
                setError(null);
              }}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor={colors.textMuted}
              accessibilityLabel={t('money.amount')}
              autoFocus
              maxFontSizeMultiplier={1.6}
              style={{
                flex: 1,
                minHeight: 60,
                color: colors.text,
                fontFamily: fonts.bold,
                fontSize: 32,
                textAlign: 'left',
                writingDirection: 'ltr',
              }}
            />
          </View>
        </View>

        <TextField
          label={t('money.whatFor')}
          value={title}
          onChangeText={setTitle}
          placeholder={t(`money.categories.${category}`)}
          maxLength={60}
        />

        {/* category */}
        <Field label={t('money.category')}>
          <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
            {EXPENSE_CATEGORIES.map((c) => {
              const selected = c === category;
              return (
                <Pressable
                  key={c}
                  onPress={() => setCategory(c)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  accessibilityLabel={t(`money.categories.${c}`)}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: space.xs,
                    minHeight: 40,
                    paddingStart: space.xs,
                    paddingEnd: space.md,
                    borderRadius: radius.pill,
                    borderWidth: 1.5,
                    borderColor: selected ? colors.accent : colors.border,
                    backgroundColor: selected ? 'rgba(240,138,108,0.12)' : pressed ? colors.raised : 'transparent',
                  })}
                >
                  <ExpenseIcon category={c} size={28} />
                  <Text variant="small" color={selected ? 'accent' : 'textSoft'}>
                    {t(`money.categories.${c}`)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Field>

        {/* who paid */}
        {members.length > 1 ? (
          <Field label={t('money.paidBy')}>
            <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
              {members.map((m) => (
                <PersonChip
                  key={m.user_id}
                  role="radio"
                  selected={paidBy === m.user_id}
                  label={m.user_id === me ? t('money.me') : m.display_name}
                  onPress={() => setPaidBy(m.user_id)}
                >
                  <Avatar name={m.display_name} colorIndex={m.color_index} size={22} />
                </PersonChip>
              ))}
            </View>
          </Field>
        ) : null}

        {/* split between */}
        {members.length > 1 ? (
          <Field label={t('money.splitBetween')}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
              {members.map((m) => (
                <PersonChip
                  key={m.user_id}
                  role="checkbox"
                  selected={participants.includes(m.user_id)}
                  label={m.user_id === me ? t('money.me') : m.display_name}
                  onPress={() => toggleParticipant(m.user_id)}
                >
                  <Avatar name={m.display_name} colorIndex={m.color_index} size={22} />
                </PersonChip>
              ))}
            </View>
            <Text variant="small" color="textMuted">
              {splitMode === 'percent'
                ? t('money.splitPercentNote')
                : share
                  ? t('money.splitEqualNote', { amount: formatMoney(share) })
                  : t('money.splitEqualHint')}
            </Text>
          </Field>
        ) : null}

        {/* when */}
        <Field label={t('money.when')}>
          <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', gap: space.sm }}>
            {[0, 1, 2].map((d) => (
              <PersonChip
                key={d}
                role="radio"
                selected={daysAgo === d}
                label={d === 0 ? t('money.today') : d === 1 ? t('money.yesterday') : t('money.twoDaysAgo')}
                onPress={() => setDaysAgo(d)}
              />
            ))}
          </View>
        </Field>

        {error ? (
          <Text variant="small" color="roseText" accessibilityRole="alert">
            {error}
          </Text>
        ) : null}
      </ScrollView>

      <Button
        label={amount ? t('money.addSubmitAmount', { amount: formatMoney(amount) }) : t('money.addSubmit')}
        onPress={submit}
        disabled={!amount}
        fullWidth
      />
    </Sheet>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={{ gap: space.sm }}>
      <Text variant="label" color="textSoft">
        {label}
      </Text>
      {children}
    </View>
  );
}

function PersonChip({
  selected,
  label,
  role,
  onPress,
  children,
}: {
  selected: boolean;
  label: string;
  role: 'radio' | 'checkbox';
  onPress: () => void;
  children?: ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={role}
      accessibilityState={{ checked: selected }}
      accessibilityLabel={label}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.xs,
        minHeight: 40,
        paddingStart: children ? space.xs : space.md,
        paddingEnd: space.md,
        borderRadius: radius.pill,
        borderWidth: 1.5,
        borderColor: selected ? colors.accent : colors.border,
        backgroundColor: selected ? 'rgba(240,138,108,0.12)' : pressed ? colors.raised : 'transparent',
      })}
    >
      {children}
      <Text variant="small" color={selected ? 'accent' : 'textSoft'}>
        {label}
      </Text>
    </Pressable>
  );
}
