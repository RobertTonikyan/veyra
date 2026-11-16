import { Pin, StickyNote, Trash2 } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, Switch, View } from 'react-native';

import { useMembers } from '@/household/useMembers';
import { useI18n } from '@/i18n';
import { dbErrorKey } from '@/services/errors';
import { Button, EmptyState, Sheet, Text, TextField, colors, memberColor, radius, space } from '@/ui';

import { useDeleteNote, useNotes, useSaveNote, type Note } from './api';

/** A shared board: door code, Wi-Fi password, "the plumber comes Tuesday". */
export function NotesTab({ addOpen, onCloseAdd }: { addOpen: boolean; onCloseAdd: () => void }) {
  const { t } = useI18n();
  const { data: notes = [] } = useNotes();
  const { data: members = [] } = useMembers();
  const [editing, setEditing] = useState<Note | null>(null);

  const author = (id: string | null) => members.find((m) => m.user_id === id)?.display_name;

  return (
    <View style={{ gap: space.md }}>
      {notes.length === 0 ? (
        <EmptyState Icon={StickyNote} title={t('us.noNotes')} body={t('us.noNotesBody')} />
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
          {notes.map((n) => {
            const color = memberColor(n.color_index);
            return (
              <Pressable
                key={n.id}
                onPress={() => setEditing(n)}
                accessibilityRole="button"
                accessibilityLabel={`${n.pinned ? t('us.pinned') + ', ' : ''}${n.body}`}
                style={({ pressed }) => ({
                  width: '48.5%',
                  minHeight: 110,
                  padding: space.md,
                  gap: space.sm,
                  borderRadius: radius.md,
                  backgroundColor: `${color}1F`,
                  borderWidth: 1,
                  borderColor: `${color}55`,
                  opacity: pressed ? 0.85 : 1,
                })}
              >
                {n.pinned ? <Pin size={14} color={color} /> : null}
                <Text numberOfLines={6} style={{ flex: 1 }}>
                  {n.body}
                </Text>
                {author(n.created_by) ? (
                  <Text variant="small" color="textMuted">
                    {author(n.created_by)}
                  </Text>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      )}

      <NoteSheet visible={addOpen || !!editing} note={editing} onClose={() => (editing ? setEditing(null) : onCloseAdd())} />
    </View>
  );
}

function NoteSheet({ visible, note, onClose }: { visible: boolean; note: Note | null; onClose: () => void }) {
  const { t } = useI18n();
  const save = useSaveNote();
  const remove = useDeleteNote();
  const [body, setBody] = useState('');
  const [pinned, setPinned] = useState(false);
  const [colorIndex, setColorIndex] = useState(3);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setBody(note?.body ?? '');
    setPinned(note?.pinned ?? false);
    setColorIndex(note?.color_index ?? 3);
    setError(null);
  }, [visible, note]);

  function submit() {
    const clean = body.trim().slice(0, 2000);
    if (!clean) return;
    save.mutate(
      { id: note?.id, body: clean, pinned, color_index: colorIndex },
      { onSuccess: onClose, onError: (e) => setError(t(dbErrorKey(e))) },
    );
  }

  return (
    <Sheet visible={visible} onClose={onClose} title={note ? t('us.editNote') : t('us.newNote')}>
      <TextField
        label={t('us.noteText')}
        value={body}
        onChangeText={setBody}
        multiline
        maxLength={2000}
        autoFocus={!note}
        placeholder={t('us.notePlaceholder')}
        style={{ minHeight: 110, textAlignVertical: 'top', paddingVertical: space.md }}
      />
      <View style={{ flexDirection: 'row', gap: space.sm }} accessibilityRole="radiogroup">
        {Array.from({ length: 8 }, (_, i) => (
          <Pressable
            key={i}
            onPress={() => setColorIndex(i)}
            accessibilityRole="radio"
            accessibilityState={{ checked: colorIndex === i }}
            accessibilityLabel={t('us.color', { n: i + 1 })}
            style={{
              width: 30,
              height: 30,
              borderRadius: 15,
              backgroundColor: memberColor(i),
              borderWidth: colorIndex === i ? 3 : 0,
              borderColor: colors.text,
            }}
          />
        ))}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
        <Pin size={18} color={colors.textSoft} />
        <Text style={{ flex: 1 }}>{t('us.pinToTop')}</Text>
        <Switch
          value={pinned}
          onValueChange={setPinned}
          accessibilityLabel={t('us.pinToTop')}
          trackColor={{ false: colors.raised, true: colors.accent }}
          thumbColor={colors.text}
        />
      </View>
      {error ? (
        <Text variant="small" color="roseText">
          {error}
        </Text>
      ) : null}
      <View style={{ gap: space.sm }}>
        <Button label={t('common.save')} loading={save.isPending} disabled={!body.trim()} onPress={submit} fullWidth />
        {note ? (
          <Button
            variant="danger"
            label={t('common.delete')}
            icon={<Trash2 size={16} color={colors.roseText} />}
            onPress={() => remove.mutate(note.id, { onSuccess: onClose })}
            fullWidth
          />
        ) : null}
      </View>
    </Sheet>
  );
}
