import Info from 'lucide-react-native/icons/info';
import { useEffect, useState } from 'react';
import { TextInput, View } from 'react-native';

import { useHousehold } from '@/household/HouseholdProvider';
import type { Member } from '@/household/useMembers';
import { useI18n } from '@/i18n';
import { dbErrorKey } from '@/services/errors';
import { Avatar, Button, Card, Segmented, Sheet, Text, colors, fonts, radius, space } from '@/ui';

import { useSetShares, useSetSplitMode } from './api';

/** "How do we split?" — equal vs percent, with a plain-language explanation. */
export function SplitModeCard({ members }: { members: Member[] }) {
  const { t } = useI18n();
  const { household, membership } = useHousehold();
  const setMode = useSetSplitMode();
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!household) return null;
  const isOwner = membership?.role === 'owner';
  const mode = household.split_mode;
  const missingShares = mode === 'percent' && members.some((m) => m.share_percent == null);

  return (
    <Card style={{ gap: space.md }}>
      <Text variant="label" color="textMuted">
        {t('money.howWeSplit')}
      </Text>

      <Segmented
        accessibilityLabel={t('money.howWeSplit')}
        value={mode}
        onChange={(next) => {
          if (!isOwner) {
            setError(t('money.ownerOnly'));
            return;
          }
          setError(null);
          setMode.mutate(next, { onError: (e) => setError(t(dbErrorKey(e))) });
          if (next === 'percent') setEditing(true);
        }}
        options={[
          { value: 'equal', label: t('money.split.equal') },
          { value: 'percent', label: t('money.split.percent') },
        ]}
      />

      <View style={{ flexDirection: 'row', gap: space.sm }}>
        <Info size={16} color={colors.textMuted} style={{ marginTop: 2 }} />
        <Text variant="small" color="textSoft" style={{ flex: 1 }}>
          {mode === 'equal' ? t('money.split.equalExplain') : t('money.split.percentExplain')}
        </Text>
      </View>

      {mode === 'percent' ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, alignItems: 'center' }}>
          {members.map((m) => (
            <View key={m.user_id} style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
              <Avatar name={m.display_name} colorIndex={m.color_index} size={22} />
              <Text variant="small" color={m.share_percent == null ? 'roseText' : 'textSoft'}>
                {m.share_percent == null ? '—' : `${Number(m.share_percent)}%`}
              </Text>
            </View>
          ))}
          {isOwner ? (
            <Button variant="ghost" label={t('money.editShares')} onPress={() => setEditing(true)} />
          ) : null}
        </View>
      ) : null}

      {missingShares ? (
        <Text variant="small" color="roseText">
          {t('errors.sharesNotSet')}
        </Text>
      ) : null}
      {error ? (
        <Text variant="small" color="roseText" accessibilityRole="alert">
          {error}
        </Text>
      ) : null}

      <SharesSheet visible={editing} members={members} onClose={() => setEditing(false)} />
    </Card>
  );
}

function SharesSheet({ visible, members, onClose }: { visible: boolean; members: Member[]; onClose: () => void }) {
  const { t } = useI18n();
  const setShares = useSetShares();
  const [values, setValues] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    const even = Math.floor(100 / Math.max(members.length, 1));
    const initial: Record<string, string> = {};
    members.forEach((m, i) => {
      const fallback = i === 0 ? 100 - even * (members.length - 1) : even; // e.g. 34/33/33
      initial[m.user_id] = String(m.share_percent != null ? Number(m.share_percent) : fallback);
    });
    setValues(initial);
    setError(null);
  }, [visible]);

  const total = members.reduce((sum, m) => sum + (parseFloat(values[m.user_id] ?? '') || 0), 0);
  const valid = Math.abs(total - 100) < 0.01;

  function save() {
    if (!valid) {
      setError(t('money.sharesMust100', { total: Math.round(total * 100) / 100 }));
      return;
    }
    setShares.mutate(
      members.map((m) => ({ user_id: m.user_id, share_percent: parseFloat(values[m.user_id] ?? '0') || 0 })),
      { onSuccess: onClose, onError: (e) => setError(t(dbErrorKey(e))) },
    );
  }

  return (
    <Sheet visible={visible} onClose={onClose} title={t('money.sharesTitle')}>
      <View style={{ gap: space.md }}>
        <Text variant="small" color="textSoft">
          {t('money.sharesHint')}
        </Text>
        {members.map((m) => (
          <View key={m.user_id} style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
            <Avatar name={m.display_name} colorIndex={m.color_index} size={30} />
            <Text style={{ flex: 1 }}>{m.display_name}</Text>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                width: 96,
                paddingHorizontal: space.sm,
                borderRadius: radius.sm,
                borderWidth: 1.5,
                borderColor: colors.border,
                backgroundColor: colors.sunken,
                direction: 'ltr',
              }}
            >
              <TextInput
                value={values[m.user_id] ?? ''}
                onChangeText={(v) => {
                  setValues((s) => ({ ...s, [m.user_id]: v.replace(/[^\d.]/g, '').slice(0, 5) }));
                  setError(null);
                }}
                keyboardType="decimal-pad"
                accessibilityLabel={t('money.shareOf', { name: m.display_name })}
                style={{
                  flex: 1,
                  minHeight: 44,
                  color: colors.text,
                  fontFamily: fonts.semibold,
                  fontSize: 18,
                  textAlign: 'right',
                }}
              />
              <Text color="textMuted">%</Text>
            </View>
          </View>
        ))}
        <Text variant="bodyStrong" color={valid ? 'sage' : 'roseText'} align="center" accessibilityLiveRegion="polite">
          {t('money.sharesTotal', { total: Math.round(total * 100) / 100 })}
        </Text>
        {error ? (
          <Text variant="small" color="roseText" accessibilityRole="alert">
            {error}
          </Text>
        ) : null}
      </View>
      <Button label={t('common.save')} loading={setShares.isPending} disabled={!valid} onPress={save} fullWidth />
    </Sheet>
  );
}
