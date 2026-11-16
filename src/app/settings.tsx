import { useRouter } from 'expo-router';
import {
  Bell,
  Cake,
  ChevronLeft,
  ChevronRight,
  Crown,
  LogOut,
  Minus,
  PauseCircle,
  Plus,
  Share2,
  Trash2,
  UserMinus,
  type LucideIcon,
} from 'lucide-react-native';
import { useEffect, useState, type ReactNode } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, Share, Switch, View } from 'react-native';

import { useAuth } from '@/auth/AuthProvider';
import { birthdayLabel } from '@/features/birthdays';
import { formatMoney, parseMoney } from '@/features/money/format';
import { BirthdayPicker } from '@/features/settings/BirthdayPicker';
import {
  type ProfilePatch,
  useAccountActions,
  useCreateInvite,
  useLeaveHousehold,
  useUpdateHousehold,
  useUpdateProfile,
} from '@/features/settings/api';
import { useHousehold } from '@/household/HouseholdProvider';
import { useMembers } from '@/household/useMembers';
import { LANGUAGES, useI18n } from '@/i18n';
import { dbErrorKey } from '@/services/errors';
import { Avatar, BackButton, Button, Card, Screen, Text, TextField, colors, radius, space, touch } from '@/ui';

const pad = (n: number) => String(n).padStart(2, '0');

export default function SettingsScreen() {
  const { t, language, setLanguage, isRTL } = useI18n();
  const router = useRouter();
  const { session, signOut } = useAuth();
  const { profile, household, membership } = useHousehold();
  const { data: members = [] } = useMembers();
  const me = session?.user.id ?? '';
  const isOwner = membership?.role === 'owner';

  const updateProfile = useUpdateProfile();
  const updateHousehold = useUpdateHousehold();
  const createInvite = useCreateInvite();
  const leave = useLeaveHousehold();
  const account = useAccountActions();

  const [message, setMessage] = useState<{ text: string; tone: 'ok' | 'error' } | null>(null);
  const ok = (text: string) => setMessage({ text, tone: 'ok' });
  const fail = (e: unknown) => setMessage({ text: t(dbErrorKey(e)), tone: 'error' });

  // ---- me ----
  const [name, setName] = useState(profile?.display_name ?? '');
  const [birthdayOpen, setBirthdayOpen] = useState(false);

  // ---- reminder ----
  const [hh, mm] = (profile?.reminder_time ?? '08:30').split(':').map(Number);
  const reminderMinutes = hh * 60 + mm;
  function shiftReminder(delta: number) {
    const next = (reminderMinutes + delta + 24 * 60) % (24 * 60);
    updateProfile.mutate({ reminder_time: `${pad(Math.floor(next / 60))}:${pad(next % 60)}` }, { onError: fail });
  }

  // ---- house ----
  const [houseName, setHouseName] = useState(household?.name ?? '');
  const [reward, setReward] = useState(household?.weekly_reward ?? '');
  const [budgetText, setBudgetText] = useState(
    household?.monthly_budget_agorot ? String(household.monthly_budget_agorot / 100) : '',
  );
  const headsUp = household?.birthday_heads_up ?? household?.type === 'couple';

  useEffect(() => {
    setName(profile?.display_name ?? '');
  }, [profile?.display_name]);

  function saveName() {
    const clean = name.trim().replace(/\s+/g, ' ');
    if (!clean || clean === profile?.display_name) return;
    updateProfile.mutate({ display_name: clean.slice(0, 40) }, { onSuccess: () => ok(t('settings.saved')), onError: fail });
  }

  function saveHouse() {
    const cleanName = houseName.trim().replace(/\s+/g, ' ').slice(0, 40);
    const budget = budgetText.trim() ? parseMoney(budgetText) : null;
    if (!cleanName) return setMessage({ text: t('onboarding.create.nameRequired'), tone: 'error' });
    if (budgetText.trim() && !budget) return setMessage({ text: t('money.errors.amount'), tone: 'error' });
    updateHousehold.mutate(
      { name: cleanName, weekly_reward: reward.trim().slice(0, 60) || null, monthly_budget_agorot: budget },
      { onSuccess: () => ok(t('settings.saved')), onError: fail },
    );
  }

  async function invite() {
    createInvite.mutate(undefined, {
      onSuccess: (code) => Share.share({ message: t('onboarding.invite.shareMessage', { code }) }),
      onError: fail,
    });
  }

  function confirmLeave() {
    Alert.alert(t('settings.leaveTitle'), t('settings.leaveBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('settings.leave'), style: 'destructive', onPress: () => leave.mutate(undefined, { onError: fail }) },
    ]);
  }

  function confirmPause() {
    Alert.alert(t('settings.pauseTitle'), t('settings.pauseBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('settings.pause'), onPress: () => account.pause.mutate(undefined, { onError: fail }) },
    ]);
  }

  function confirmDelete() {
    Alert.alert(t('settings.deleteTitle'), t('settings.deleteBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('settings.deleteIn30'),
        onPress: () => account.requestDeletion.mutate(false, { onError: fail }),
      },
      {
        text: t('settings.deleteNow'),
        style: 'destructive',
        onPress: () =>
          Alert.alert(t('settings.deleteNowTitle'), t('settings.deleteNowBody'), [
            { text: t('common.cancel'), style: 'cancel' },
            {
              text: t('settings.deleteNowConfirm'),
              style: 'destructive',
              onPress: () => account.requestDeletion.mutate(true, { onError: fail }),
            },
          ]),
      },
    ]);
  }

  const Chevron = isRTL ? ChevronLeft : ChevronRight;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen>
        <BackButton label={t('common.back')} onPress={() => router.back()} />
        <Text variant="display" accessibilityRole="header">
          {t('more.settings')}
        </Text>

        {message ? (
          <Text
            variant="small"
            color={message.tone === 'ok' ? 'sage' : 'roseText'}
            accessibilityRole={message.tone === 'error' ? 'alert' : undefined}
            accessibilityLiveRegion="polite"
          >
            {message.text}
          </Text>
        ) : null}

        {/* ---------------- me ---------------- */}
        <Section title={t('settings.me')}>
          <Card style={{ gap: space.lg }}>
            <TextField
              label={t('onboarding.welcome.nameLabel')}
              value={name}
              onChangeText={setName}
              onBlur={saveName}
              onSubmitEditing={saveName}
              returnKeyType="done"
              maxLength={40}
            />
            <Row
              Icon={Cake}
              title={t('settings.birthday')}
              value={
                profile?.birth_month && profile.birth_day
                  ? birthdayLabel(profile.birth_month, profile.birth_day, language)
                  : t('settings.notSet')
              }
              onPress={() => setBirthdayOpen(true)}
              chevron={<Chevron size={18} color={colors.textMuted} />}
            />
          </Card>
        </Section>

        {/* ---------------- language ---------------- */}
        <Section title={t('settings.language')}>
          <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
            {LANGUAGES.map((lang) => (
              <Button
                key={lang.code}
                label={lang.nativeName}
                variant={lang.code === language ? 'primary' : 'secondary'}
                accessibilityState={{ selected: lang.code === language }}
                onPress={() => {
                  setLanguage(lang.code);
                  // the server uses it for notifications in your language
                  updateProfile.mutate({ language: lang.code as ProfilePatch['language'] });
                }}
              />
            ))}
          </View>
        </Section>

        {/* ---------------- daily reminder ---------------- */}
        <Section title={t('settings.reminder')}>
          <Card style={{ gap: space.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
              <Bell size={20} color={colors.textSoft} />
              <Text style={{ flex: 1 }}>{t('settings.reminderOn')}</Text>
              <Switch
                value={profile?.reminders_on ?? true}
                onValueChange={(v) => updateProfile.mutate({ reminders_on: v }, { onError: fail })}
                accessibilityLabel={t('settings.reminderOn')}
                trackColor={{ false: colors.raised, true: colors.accent }}
                thumbColor={colors.text}
              />
            </View>
            {profile?.reminders_on !== false ? (
              <View
                style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, direction: 'ltr' }}
                accessible
                accessibilityRole="adjustable"
                accessibilityLabel={t('settings.reminderTime')}
                accessibilityValue={{ text: `${pad(hh)}:${pad(mm)}` }}
                accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
                onAccessibilityAction={(e) => shiftReminder(e.nativeEvent.actionName === 'increment' ? 30 : -30)}
              >
                <StepButton onPress={() => shiftReminder(-30)}>
                  <Minus size={18} color={colors.text} />
                </StepButton>
                <Text variant="title" align="center" style={{ flex: 1, writingDirection: 'ltr' }}>
                  {pad(hh)}:{pad(mm)}
                </Text>
                <StepButton onPress={() => shiftReminder(30)}>
                  <Plus size={18} color={colors.text} />
                </StepButton>
              </View>
            ) : null}
            <Text variant="small" color="textMuted">
              {t('settings.reminderExplain')}
            </Text>
          </Card>
        </Section>

        {/* ---------------- the house ---------------- */}
        <Section title={t('settings.house')}>
          <Card style={{ gap: space.lg }}>
            {!isOwner ? (
              <Text variant="small" color="textMuted">
                {t('settings.ownerOnly')}
              </Text>
            ) : null}
            <TextField
              label={t('onboarding.create.nameLabel')}
              value={houseName}
              onChangeText={setHouseName}
              editable={isOwner}
              maxLength={40}
            />
            <TextField
              label={t('settings.weeklyReward')}
              hint={t('settings.weeklyRewardHint')}
              value={reward}
              onChangeText={setReward}
              placeholder={t('settings.weeklyRewardPlaceholder')}
              editable={isOwner}
              maxLength={60}
            />
            <TextField
              label={t('settings.budget')}
              hint={
                household?.monthly_budget_agorot
                  ? t('settings.budgetNow', { amount: formatMoney(household.monthly_budget_agorot) })
                  : t('settings.budgetHint')
              }
              value={budgetText}
              onChangeText={(v) => setBudgetText(v.replace(/[^\d.,]/g, '').slice(0, 10))}
              keyboardType="decimal-pad"
              placeholder="6000"
              editable={isOwner}
              forceLTR
            />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text>{t('settings.birthdayHeadsUp')}</Text>
                <Text variant="small" color="textMuted">
                  {t('settings.birthdayHeadsUpHint')}
                </Text>
              </View>
              <Switch
                value={headsUp}
                disabled={!isOwner}
                onValueChange={(v) => updateHousehold.mutate({ birthday_heads_up: v }, { onError: fail })}
                accessibilityLabel={t('settings.birthdayHeadsUp')}
                trackColor={{ false: colors.raised, true: colors.accent }}
                thumbColor={colors.text}
              />
            </View>
            {isOwner ? (
              <Button label={t('common.save')} loading={updateHousehold.isPending} onPress={saveHouse} fullWidth />
            ) : null}
          </Card>
        </Section>

        {/* ---------------- members ---------------- */}
        <Section title={t('settings.members', { count: members.length })}>
          <Card padded={false}>
            {members.map((m, i) => (
              <View
                key={m.user_id}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: space.md,
                  minHeight: 56,
                  paddingHorizontal: space.lg,
                  borderTopWidth: i === 0 ? 0 : 1,
                  borderTopColor: colors.hairline,
                }}
              >
                <Avatar name={m.display_name} colorIndex={m.color_index} size={32} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text>
                    {m.display_name}
                    {m.user_id === me ? ` (${t('money.me')})` : ''}
                  </Text>
                  {m.birth_month && m.birth_day ? (
                    <Text variant="small" color="textMuted">
                      🎂 {birthdayLabel(m.birth_month, m.birth_day, language)}
                    </Text>
                  ) : null}
                </View>
                {m.role === 'owner' ? <Crown size={16} color={colors.honey} accessibilityLabel={t('settings.owner')} /> : null}
              </View>
            ))}
          </Card>
          {members.length < 20 ? (
            <Button
              variant="secondary"
              label={t('settings.invite')}
              icon={<Share2 size={18} color={colors.text} />}
              loading={createInvite.isPending}
              onPress={invite}
              fullWidth
            />
          ) : null}
        </Section>

        {/* ---------------- account ---------------- */}
        <Section title={t('settings.account')}>
          <Card padded={false}>
            <Text variant="small" color="textMuted" style={{ paddingHorizontal: space.lg, paddingTop: space.md }}>
              {t('settings.signedInAs', { email: session?.user.email ?? '' })}
            </Text>
            <Row Icon={LogOut} title={t('settings.signOut')} onPress={() => signOut()} inset />
            <Row Icon={UserMinus} title={t('settings.leave')} hint={t('settings.leaveHint')} onPress={confirmLeave} inset />
            <Row Icon={PauseCircle} title={t('settings.pause')} hint={t('settings.pauseHint')} onPress={confirmPause} inset />
            <Row
              Icon={Trash2}
              title={t('settings.delete')}
              hint={t('settings.deleteHint')}
              onPress={confirmDelete}
              danger
              inset
            />
          </Card>
        </Section>
      </Screen>

      <BirthdayPicker
        visible={birthdayOpen}
        month={profile?.birth_month ?? null}
        day={profile?.birth_day ?? null}
        onClose={() => setBirthdayOpen(false)}
        onSave={(month, day) =>
          updateProfile.mutate(
            { birth_month: month, birth_day: day },
            { onSuccess: () => ok(t('settings.saved')), onError: fail },
          )
        }
      />
    </KeyboardAvoidingView>
  );
}

// ---------- pieces ----------

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={{ gap: space.sm }}>
      <Text variant="label" color="textMuted" accessibilityRole="header">
        {title}
      </Text>
      {children}
    </View>
  );
}

function Row({
  Icon,
  title,
  hint,
  value,
  onPress,
  chevron,
  danger,
  inset,
}: {
  Icon: LucideIcon;
  title: string;
  hint?: string;
  value?: string;
  onPress: () => void;
  chevron?: ReactNode;
  danger?: boolean;
  inset?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={value ? `${title}: ${value}` : title}
      accessibilityHint={hint}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.md,
        minHeight: 56,
        paddingHorizontal: inset ? space.lg : 0,
        paddingVertical: space.sm,
        borderTopWidth: inset ? 1 : 0,
        borderTopColor: colors.hairline,
        backgroundColor: pressed ? colors.raised : 'transparent',
        borderRadius: inset ? 0 : radius.sm,
      })}
    >
      <Icon size={20} color={danger ? colors.roseText : colors.textSoft} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text color={danger ? 'roseText' : 'text'}>{title}</Text>
        {hint ? (
          <Text variant="small" color="textMuted">
            {hint}
          </Text>
        ) : null}
      </View>
      {value ? (
        <Text variant="small" color="textSoft">
          {value}
        </Text>
      ) : null}
      {chevron}
    </Pressable>
  );
}

function StepButton({ onPress, children }: { onPress: () => void; children: ReactNode }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityElementsHidden
      importantForAccessibility="no"
      style={({ pressed }) => ({
        width: touch.min + 4,
        height: touch.min + 4,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: pressed ? colors.raised : colors.sunken,
        alignItems: 'center',
        justifyContent: 'center',
      })}
    >
      {children}
    </Pressable>
  );
}

