import Pin from 'lucide-react-native/icons/pin';
import StickyNote from 'lucide-react-native/icons/sticky-note';
import Trash2 from 'lucide-react-native/icons/trash-2';
import { useEffect, useState } from 'react';
import { Pressable, Switch, View } from 'react-native';

import { useMembers } from '@/household/useMembers';
import { useI18n } from '@/i18n';
import { dbErrorKey } from '@/services/errors';
import { Button, Sheet, Text, TextField, colors, space } from '@/ui';

import { useDeleteNote, useNotes, useSaveNote, type Note } from './api';
import { Corkboard, PAPER, PaperNote } from './Corkboard';

/** A shared board: door code, Wi-Fi password, "the plumber comes Tuesday". */
export function NotesTab({ addOpen, onCloseAdd }: { addOpen: boolean; onCloseAdd: () => void }) {
  const { t } = useI18n();
  const { data: notes = [], isSuccess } = useNotes();
  const { data: members = [] } = useMembers();
  const [editing, setEditing] = useState<Note | null>(null);

  // Notes that appear after the first load get the "just pinned" animation.
  const [known, setKnown] = useState<Set<string> | null>(null);
  useEffect(() => {
    if (!isSuccess) return;
    if (known === null) {
      setKnown(new Set(notes.map((n) => n.id)));
      return;
    }
    if (notes.every((n) => known.has(n.id))) return;
    const timer = setTimeout(() => setKnown(new Set(notes.map((n) => n.id))), 1200);
    return () => clearTimeout(timer);
  }, [isSuccess, notes, known]);
  const isNew = (id: string) => known !== null && !known.has(id);

  const author = (id: string | null) => members.find((m) => m.user_id === id)?.display_name;

  return (
    <View style={{ gap: space.md }}>
      {notes.length === 0 ? (
        <Corkboard>
          <View style={{ width: '100%', paddingVertical: space.xxl, alignItems: 'center', gap: space.sm }}>
            <StickyNote size={32} color="#FFF3E0" />
            <Text variant="bodyStrong" align="center" style={{ color: '#FFF3E0' }}>
              {t('us.noNotes')}
            </Text>
            <Text variant="small" align="center" style={{ color: '#FFF3E0', opacity: 0.85 }}>
              {t('us.noNotesBody')}
            </Text>
          </View>
        </Corkboard>
      ) : (
        <Corkboard>
          {notes.map((n) => (
            <PaperNote
              key={n.id}
              id={n.id}
              body={n.body}
              author={author(n.created_by)}
              colorIndex={n.color_index}
              important={n.pinned}
              isNew={isNew(n.id)}
              onPress={() => setEditing(n)}
              accessibilityLabel={`${n.pinned ? t('us.pinned') + ', ' : ''}${n.body}${author(n.created_by) ? ', ' + author(n.created_by) : ''}`}
            />
          ))}
        </Corkboard>
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
              backgroundColor: PAPER[i],
              borderWidth: colorIndex === i ? 3 : 1,
              borderColor: colorIndex === i ? colors.accent : colors.border,
            }}
          />
        ))}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
        <Pin size={18} color={colors.textSoft} />
        <Text style={{ flex: 1 }}>{t('us.importantPin')}</Text>
        <Switch
          value={pinned}
          onValueChange={setPinned}
          accessibilityLabel={t('us.importantPin')}
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
