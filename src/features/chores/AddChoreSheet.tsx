import { Infinity as AnyoneIcon } from 'lucide-react-native';
import { useState, type ReactNode } from 'react';
import { Pressable, ScrollView, Switch, View } from 'react-native';

import type { Member } from '@/household/useMembers';
import { useI18n } from '@/i18n';
import { Avatar, Button, Sheet, Text, TextField, colors, radius, space } from '@/ui';

import type { Effort, NewChore, Recurrence } from './api';
import { addDays, todayISO } from './dates';

type When = 'today' | 'tomorrow' | 'week' | 'none';

type Props = {
  visible: boolean;
  members: Member[];
  onClose: () => void;
  onSubmit: (chore: NewChore) => void;
};

export function AddChoreSheet({ visible, members, onClose, onSubmit }: Props) {
  const { t } = useI18n();
  const [title, setTitle] = useState('');
  const [effort, setEffort] = useState<Effort>(10);
  const [recurrence, setRecurrence] = useState<Recurrence>('none');
  const [when, setWhen] = useState<When>('today');
  const [assignee, setAssignee] = useState<string | null>(null);
  const [rotate, setRotate] = useState(false);
  const [joint, setJoint] = useState(false);

  function reset() {
    setTitle('');
    setEffort(10);
    setRecurrence('none');
    setWhen('today');
    setAssignee(null);
    setRotate(false);
    setJoint(false);
  }

  function submit() {
    const clean = title.trim().replace(/\s+/g, ' ').slice(0, 60);
    if (!clean) return;
    const today = todayISO();
    const due =
      when === 'today' ? today : when === 'tomorrow' ? addDays(today, 1) : when === 'week' ? addDays(today, 7) : null;

    onSubmit({
      title: clean,
      effort,
      recurrence,
      due_date: recurrence !== 'none' && !due ? today : due, // repeating chores need a start date
      assignee: joint ? null : assignee,
      rotate: !joint && recurrence !== 'none' && rotate && members.length > 1,
      is_joint: joint,
    });
    reset();
    onClose();
  }

  return (
    <Sheet visible={visible} onClose={onClose} title={t('chores.addTitle')}>
      <ScrollView style={{ maxHeight: 540 }} contentContainerStyle={{ gap: space.lg }} keyboardShouldPersistTaps="handled">
        <TextField
          label={t('chores.titleLabel')}
          value={title}
          onChangeText={setTitle}
          placeholder={t('chores.titlePlaceholder')}
          maxLength={60}
          autoFocus
        />

        <Field label={t('chores.effortLabel')}>
          <Chips
            value={effort}
            onChange={setEffort}
            options={[
              { value: 5, label: `${t('chores.effort.quick')} · 5` },
              { value: 10, label: `${t('chores.effort.normal')} · 10` },
              { value: 20, label: `${t('chores.effort.big')} · 20` },
            ]}
          />
        </Field>

        <Field label={t('chores.whenLabel')}>
          <Chips
            value={when}
            onChange={setWhen}
            options={[
              { value: 'today', label: t('chores.due.today') },
              { value: 'tomorrow', label: t('chores.due.tomorrow') },
              { value: 'week', label: t('chores.inAWeek') },
              { value: 'none', label: t('chores.due.anytime') },
            ]}
          />
        </Field>

        <Field label={t('chores.repeatLabel')}>
          <Chips
            value={recurrence}
            onChange={setRecurrence}
            options={[
              { value: 'none', label: t('chores.recurrence.none') },
              { value: 'daily', label: t('chores.recurrence.daily') },
              { value: 'weekly', label: t('chores.recurrence.weekly') },
              { value: 'monthly', label: t('chores.recurrence.monthly') },
            ]}
          />
        </Field>

        {members.length > 1 ? (
          <ToggleRow label={t('chores.jointLabel')} hint={t('chores.jointHint')} value={joint} onChange={setJoint} />
        ) : null}

        {!joint ? (
          <Field label={t('chores.whoLabel')}>
            <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
              <WhoChip selected={assignee === null} label={t('chores.anyone')} onPress={() => setAssignee(null)}>
                <AnyoneIcon size={16} color={colors.textSoft} />
              </WhoChip>
              {members.map((m) => (
                <WhoChip
                  key={m.user_id}
                  selected={assignee === m.user_id}
                  label={m.display_name}
                  onPress={() => setAssignee(m.user_id)}
                >
                  <Avatar name={m.display_name} colorIndex={m.color_index} size={22} />
                </WhoChip>
              ))}
            </View>
          </Field>
        ) : null}

        {!joint && recurrence !== 'none' && members.length > 1 ? (
          <ToggleRow label={t('chores.rotateLabel')} hint={t('chores.rotateHint')} value={rotate} onChange={setRotate} />
        ) : null}
      </ScrollView>

      <Button label={t('chores.addSubmit')} onPress={submit} disabled={!title.trim()} fullWidth />
    </Sheet>
  );
}

// ---------- small building blocks ----------

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

function Chips<T extends string | number>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={String(o.value)}
            onPress={() => onChange(o.value)}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            style={({ pressed }) => ({
              minHeight: 40,
              paddingHorizontal: space.md,
              borderRadius: radius.pill,
              borderWidth: 1.5,
              borderColor: selected ? colors.accent : colors.border,
              backgroundColor: selected ? 'rgba(240,138,108,0.12)' : pressed ? colors.raised : 'transparent',
              justifyContent: 'center',
            })}
          >
            <Text variant="small" weight={selected ? 'semibold' : 'regular'} color={selected ? 'accent' : 'textSoft'}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function WhoChip({
  selected,
  label,
  onPress,
  children,
}: {
  selected: boolean;
  label: string;
  onPress: () => void;
  children: ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={label}
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
      {children}
      <Text variant="small" color={selected ? 'accent' : 'textSoft'}>
        {label}
      </Text>
    </Pressable>
  );
}

function ToggleRow({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="bodyStrong">{label}</Text>
        <Text variant="small" color="textMuted">
          {hint}
        </Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        accessibilityLabel={label}
        trackColor={{ false: colors.raised, true: colors.accent }}
        thumbColor={colors.text}
      />
    </View>
  );
}
