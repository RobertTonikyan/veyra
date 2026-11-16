import { Trash2 } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ScrollView, Switch, View } from 'react-native';

import { useI18n } from '@/i18n';
import { dbErrorKey } from '@/services/errors';
import { Button, Sheet, Text, TextField, colors, space } from '@/ui';

import { useDeleteEvent, useSaveEvent, type HouseEvent } from './api';
import { DateTimeField } from './DateTimeField';

type Props = {
  visible: boolean;
  event: HouseEvent | null; // null = new
  defaultDay?: Date;
  onClose: () => void;
};

function roundedNextHour() {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1);
  return d;
}

export function EventSheet({ visible, event, defaultDay, onClose }: Props) {
  const { t } = useI18n();
  const save = useSaveEvent();
  const remove = useDeleteEvent();

  const [title, setTitle] = useState('');
  const [start, setStart] = useState(roundedNextHour());
  const [allDay, setAllDay] = useState(false);
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    const base = defaultDay ? new Date(defaultDay) : roundedNextHour();
    if (defaultDay) base.setHours(roundedNextHour().getHours(), 0, 0, 0);
    setTitle(event?.title ?? '');
    setStart(event ? new Date(event.starts_at) : base);
    setAllDay(event?.all_day ?? false);
    setLocation(event?.location ?? '');
    setNotes(event?.notes ?? '');
    setError(null);
  }, [visible, event, defaultDay]);

  function setDatePart(d: Date) {
    const next = new Date(start);
    next.setFullYear(d.getFullYear(), d.getMonth(), d.getDate());
    setStart(next);
  }

  function setTimePart(d: Date) {
    const next = new Date(start);
    next.setHours(d.getHours(), d.getMinutes(), 0, 0);
    setStart(next);
  }

  function submit() {
    const clean = title.trim().replace(/\s+/g, ' ').slice(0, 80);
    if (!clean) return setError(t('calendar.titleRequired'));
    const startsAt = new Date(start);
    if (allDay) startsAt.setHours(0, 0, 0, 0);
    save.mutate(
      {
        id: event?.id,
        title: clean,
        starts_at: startsAt.toISOString(),
        ends_at: null,
        all_day: allDay,
        location: location.trim().slice(0, 120) || null,
        notes: notes.trim().slice(0, 1000) || null,
      },
      { onSuccess: onClose, onError: (e) => setError(t(dbErrorKey(e))) },
    );
  }

  return (
    <Sheet visible={visible} onClose={onClose} title={event ? t('calendar.editEvent') : t('calendar.newEvent')}>
      <ScrollView style={{ maxHeight: 520 }} contentContainerStyle={{ gap: space.lg }} keyboardShouldPersistTaps="handled">
        <TextField
          label={t('calendar.what')}
          placeholder={t('calendar.whatPlaceholder')}
          value={title}
          onChangeText={setTitle}
          maxLength={80}
          autoFocus={!event}
        />
        <DateTimeField label={t('calendar.date')} value={start} mode="date" onChange={setDatePart} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
          <Text style={{ flex: 1 }}>{t('calendar.allDay')}</Text>
          <Switch
            value={allDay}
            onValueChange={setAllDay}
            accessibilityLabel={t('calendar.allDay')}
            trackColor={{ false: colors.raised, true: colors.accent }}
            thumbColor={colors.text}
          />
        </View>
        {!allDay ? <DateTimeField label={t('calendar.time')} value={start} mode="time" onChange={setTimePart} /> : null}
        <TextField label={t('calendar.where')} value={location} onChangeText={setLocation} maxLength={120} />
        <TextField label={t('calendar.notes')} value={notes} onChangeText={setNotes} maxLength={1000} multiline />
        {error ? (
          <Text variant="small" color="roseText" accessibilityRole="alert">
            {error}
          </Text>
        ) : null}
      </ScrollView>
      <View style={{ gap: space.sm }}>
        <Button label={t('common.save')} loading={save.isPending} disabled={!title.trim()} onPress={submit} fullWidth />
        {event ? (
          <Button
            variant="danger"
            label={t('common.delete')}
            icon={<Trash2 size={16} color={colors.roseText} />}
            onPress={() => remove.mutate(event.id, { onSuccess: onClose, onError: (e) => setError(t(dbErrorKey(e))) })}
            fullWidth
          />
        ) : null}
      </View>
    </Sheet>
  );
}
