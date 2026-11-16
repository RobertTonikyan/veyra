import { Bookmark, BookmarkCheck, Check, Dices, Mountain, Sofa, Star, Ticket, Trash2, TreePine, type LucideIcon } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Pressable, View } from 'react-native';

import { useI18n } from '@/i18n';
import { dbErrorKey } from '@/services/errors';
import { Button, Card, Segmented, Sheet, Text, TextField, colors, radius, space } from '@/ui';

import { useAddIdea, useDateIdeas, useDeleteIdea, useIdeaMarks, useMarkIdea, type DateIdea, type IdeaCategory } from './api';

const CATS: { value: IdeaCategory; Icon: LucideIcon; color: string }[] = [
  { value: 'home', Icon: Sofa, color: '#EBB656' },
  { value: 'out', Icon: Ticket, color: '#F08A6C' },
  { value: 'active', Icon: TreePine, color: '#9CC6A3' },
  { value: 'trip', Icon: Mountain, color: '#8EB4F0' },
];
const catOf = (c: string) => CATS.find((x) => x.value === c) ?? CATS[0];
const today = () => new Date().toISOString().slice(0, 10);

type View_ = 'all' | 'saved' | 'done';

export function IdeasTab({ addOpen, onCloseAdd }: { addOpen: boolean; onCloseAdd: () => void }) {
  const { t } = useI18n();
  const { data: ideas = [] } = useDateIdeas();
  const { data: marks } = useIdeaMarks();
  const markIdea = useMarkIdea();
  const deleteIdea = useDeleteIdea();

  const [view, setView] = useState<View_>('all');
  const [cat, setCat] = useState<IdeaCategory | null>(null);
  const [surprise, setSurprise] = useState<DateIdea | null>(null);
  const [rating, setRating] = useState<DateIdea | null>(null);

  const shown = ideas.filter((i) => {
    const m = marks?.get(i.id);
    if (cat && i.category !== cat) return false;
    if (view === 'saved') return !!m?.saved && !m.done_on;
    if (view === 'done') return !!m?.done_on;
    return true;
  });

  function pickRandom() {
    const pool = ideas.filter((i) => !marks?.get(i.id)?.done_on && (!cat || i.category === cat));
    const list = pool.length ? pool : ideas;
    if (list.length) setSurprise(list[Math.floor(Math.random() * list.length)]);
  }

  function toggleSave(i: DateIdea) {
    const m = marks?.get(i.id);
    markIdea.mutate({ idea_id: i.id, saved: !m?.saved, done_on: m?.done_on ?? null, rating: m?.rating ?? null });
  }

  return (
    <View style={{ gap: space.lg }}>
      <Button
        label={t('us.surprise')}
        icon={<Dices size={18} color={colors.onAccent} />}
        onPress={pickRandom}
        fullWidth
      />

      <Segmented
        value={view}
        onChange={setView}
        options={[
          { value: 'all', label: t('us.ideasAll') },
          { value: 'saved', label: t('us.ideasSaved') },
          { value: 'done', label: t('us.ideasDone') },
        ]}
      />

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
        {CATS.map(({ value, Icon, color }) => {
          const selected = cat === value;
          return (
            <Pressable
              key={value}
              onPress={() => setCat(selected ? null : value)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: space.xs,
                minHeight: 38,
                paddingHorizontal: space.md,
                borderRadius: radius.pill,
                borderWidth: 1.5,
                borderColor: selected ? color : colors.border,
                backgroundColor: selected ? `${color}22` : pressed ? colors.raised : 'transparent',
              })}
            >
              <Icon size={16} color={color} />
              <Text variant="small" color={selected ? 'text' : 'textSoft'}>
                {t(`us.cat.${value}`)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {shown.length === 0 ? (
        <Text color="textMuted" align="center">
          {view === 'saved' ? t('us.noSaved') : view === 'done' ? t('us.noDone') : t('us.noIdeas')}
        </Text>
      ) : (
        shown.map((i) => {
          const m = marks?.get(i.id);
          const { Icon, color } = catOf(i.category);
          return (
            <Card key={i.id} style={{ gap: space.sm }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: radius.sm,
                    backgroundColor: `${color}26`,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon size={20} color={color} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text variant="bodyStrong">{i.title}</Text>
                  <Text variant="small" color="textMuted">
                    {i.cost_level === 0 ? t('us.free') : '₪'.repeat(i.cost_level)}
                    {m?.done_on ? ` · ${t('us.doneOn', { date: m.done_on })}` : ''}
                    {m?.rating ? ` · ${'★'.repeat(m.rating)}` : ''}
                  </Text>
                </View>
                <Pressable
                  onPress={() => toggleSave(i)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: !!m?.saved }}
                  accessibilityLabel={m?.saved ? t('us.unsave') : t('us.save')}
                  hitSlop={8}
                >
                  {m?.saved ? <BookmarkCheck size={22} color={colors.accent} /> : <Bookmark size={22} color={colors.textMuted} />}
                </Pressable>
              </View>
              {i.description ? (
                <Text variant="small" color="textSoft">
                  {i.description}
                </Text>
              ) : null}
              <View style={{ flexDirection: 'row', gap: space.sm }}>
                <Button
                  variant={m?.done_on ? 'ghost' : 'secondary'}
                  label={m?.done_on ? t('us.doneAgain') : t('us.didIt')}
                  icon={<Check size={16} color={colors.text} />}
                  onPress={() => setRating(i)}
                />
                {i.household_id ? (
                  <Button
                    variant="ghost"
                    label={t('common.delete')}
                    icon={<Trash2 size={16} color={colors.textMuted} />}
                    onPress={() =>
                      Alert.alert(t('us.deleteIdea'), undefined, [
                        { text: t('common.cancel'), style: 'cancel' },
                        { text: t('common.delete'), style: 'destructive', onPress: () => deleteIdea.mutate(i.id) },
                      ])
                    }
                  />
                ) : null}
              </View>
            </Card>
          );
        })
      )}

      {/* surprise me */}
      <Sheet visible={!!surprise} onClose={() => setSurprise(null)} title={t('us.howAbout')}>
        {surprise ? (
          <View style={{ gap: space.md }}>
            <Text variant="title">{surprise.title}</Text>
            {surprise.description ? <Text color="textSoft">{surprise.description}</Text> : null}
            <Button
              label={t('us.save')}
              icon={<Bookmark size={18} color={colors.onAccent} />}
              onPress={() => {
                const m = marks?.get(surprise.id);
                markIdea.mutate({ idea_id: surprise.id, saved: true, done_on: m?.done_on ?? null, rating: m?.rating ?? null });
                setSurprise(null);
              }}
              fullWidth
            />
            <Button variant="ghost" label={t('us.another')} onPress={pickRandom} fullWidth />
          </View>
        ) : null}
      </Sheet>

      {/* did it → rate */}
      <Sheet visible={!!rating} onClose={() => setRating(null)} title={t('us.howWasIt')}>
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: space.sm }} accessibilityRole="radiogroup">
          {[1, 2, 3, 4, 5].map((n) => (
            <Pressable
              key={n}
              accessibilityRole="radio"
              accessibilityLabel={t('us.stars', { count: n })}
              onPress={() => {
                if (!rating) return;
                markIdea.mutate({ idea_id: rating.id, saved: false, done_on: today(), rating: n });
                setRating(null);
              }}
              style={{ padding: space.xs }}
            >
              <Star size={36} color={colors.honey} fill={colors.honey} />
            </Pressable>
          ))}
        </View>
        <Button
          variant="ghost"
          label={t('us.skipRating')}
          onPress={() => {
            if (!rating) return;
            markIdea.mutate({ idea_id: rating.id, saved: false, done_on: today(), rating: null });
            setRating(null);
          }}
          fullWidth
        />
      </Sheet>

      <AddIdeaSheet visible={addOpen} onClose={onCloseAdd} />
    </View>
  );
}

function AddIdeaSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { t } = useI18n();
  const addIdea = useAddIdea();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<IdeaCategory>('home');
  const [cost, setCost] = useState(1);
  const [error, setError] = useState<string | null>(null);

  function submit() {
    const clean = title.trim().slice(0, 80);
    if (!clean) return;
    addIdea.mutate(
      { title: clean, description: description.trim().slice(0, 500) || null, category, cost_level: cost },
      {
        onSuccess: () => {
          setTitle('');
          setDescription('');
          onClose();
        },
        onError: (e) => setError(t(dbErrorKey(e))),
      },
    );
  }

  return (
    <Sheet visible={visible} onClose={onClose} title={t('us.newIdea')}>
      <TextField label={t('us.ideaTitle')} value={title} onChangeText={setTitle} maxLength={80} autoFocus />
      <TextField label={t('us.ideaDesc')} value={description} onChangeText={setDescription} maxLength={500} multiline />
      <Segmented
        value={category}
        onChange={setCategory}
        options={CATS.map((c) => ({ value: c.value, label: t(`us.cat.${c.value}`) }))}
      />
      <Segmented
        value={String(cost) as '0' | '1' | '2' | '3'}
        onChange={(v) => setCost(Number(v))}
        options={[
          { value: '0', label: t('us.free') },
          { value: '1', label: '₪' },
          { value: '2', label: '₪₪' },
          { value: '3', label: '₪₪₪' },
        ]}
      />
      {error ? (
        <Text variant="small" color="roseText">
          {error}
        </Text>
      ) : null}
      <Button label={t('common.save')} loading={addIdea.isPending} disabled={!title.trim()} onPress={submit} fullWidth />
    </Sheet>
  );
}
