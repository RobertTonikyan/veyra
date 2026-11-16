import { Check } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import type { Member } from '@/household/useMembers';
import { useI18n } from '@/i18n';
import { dbErrorKey } from '@/services/errors';
import { Avatar, Button, Sheet, Text, TextField, colors, radius, space } from '@/ui';

import { useClearMeal, useSetMeal, type Meal, type Recipe } from './api';

type Props = {
  /** YYYY-MM-DD; null = closed */
  day: string | null;
  dayLabel: string;
  existing: Meal | null;
  recipes: Recipe[];
  members: Member[];
  /** preselect when opened from a recipe */
  presetRecipeId?: string | null;
  onClose: () => void;
};

/** Plan dinner for one day: pick a recipe or write anything ("delivery", "leftovers"), and who cooks. */
export function PlanSheet({ day, dayLabel, existing, recipes, members, presetRecipeId, onClose }: Props) {
  const { t } = useI18n();
  const setMeal = useSetMeal();
  const clearMeal = useClearMeal();
  const [recipeId, setRecipeId] = useState<string | null>(null);
  const [freeText, setFreeText] = useState('');
  const [cook, setCook] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!day) return;
    setRecipeId(presetRecipeId ?? existing?.recipe_id ?? null);
    setFreeText(existing?.recipe_id ? '' : (existing?.title ?? ''));
    setCook(existing?.cook ?? null);
    setError(null);
  }, [day, existing, presetRecipeId]);

  if (!day) return null;

  function save() {
    if (!day) return;
    const title = freeText.trim().slice(0, 80) || null;
    if (!recipeId && !title) return setError(t('meals.pickSomething'));
    setMeal.mutate(
      { existingId: existing?.id, day, slot: 'dinner', recipe_id: recipeId, title: recipeId ? null : title, cook },
      { onSuccess: onClose, onError: (e) => setError(t(dbErrorKey(e))) },
    );
  }

  return (
    <Sheet visible onClose={onClose} title={t('meals.planFor', { day: dayLabel })}>
      <ScrollView style={{ maxHeight: 520 }} contentContainerStyle={{ gap: space.lg }} keyboardShouldPersistTaps="handled">
        <View style={{ gap: space.sm }}>
          <Text variant="label" color="textSoft">
            {t('meals.pickRecipe')}
          </Text>
          <View accessibilityRole="radiogroup" style={{ gap: space.xs }}>
            {recipes.map((r) => {
              const selected = r.id === recipeId;
              return (
                <Pressable
                  key={r.id}
                  onPress={() => {
                    setRecipeId(selected ? null : r.id);
                    setFreeText('');
                  }}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: space.sm,
                    minHeight: 46,
                    paddingHorizontal: space.md,
                    borderRadius: radius.md,
                    borderWidth: 1.5,
                    borderColor: selected ? colors.accent : colors.hairline,
                    backgroundColor: selected ? 'rgba(240,138,108,0.12)' : pressed ? colors.raised : colors.sunken,
                  })}
                >
                  <Text style={{ flex: 1 }} weight={selected ? 'semibold' : 'regular'}>
                    {r.title}
                  </Text>
                  {r.household_id ? (
                    <Text variant="small" color="textMuted">
                      {t('meals.ours')}
                    </Text>
                  ) : null}
                  {selected ? <Check size={18} color={colors.accent} /> : null}
                </Pressable>
              );
            })}
          </View>
        </View>

        <TextField
          label={t('meals.orSomethingElse')}
          placeholder={t('meals.somethingElsePlaceholder')}
          value={freeText}
          onChangeText={(v) => {
            setFreeText(v);
            if (v.trim()) setRecipeId(null);
            setError(null);
          }}
          maxLength={80}
        />

        {members.length > 1 ? (
          <View style={{ gap: space.sm }}>
            <Text variant="label" color="textSoft">
              {t('meals.whoCooks')}
            </Text>
            <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
              {[null, ...members.map((m) => m.user_id)].map((id) => {
                const m = members.find((x) => x.user_id === id);
                const selected = cook === id;
                return (
                  <Pressable
                    key={id ?? 'nobody'}
                    onPress={() => setCook(id)}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selected }}
                    style={({ pressed }) => ({
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: space.xs,
                      minHeight: 40,
                      paddingStart: m ? space.xs : space.md,
                      paddingEnd: space.md,
                      borderRadius: radius.pill,
                      borderWidth: 1.5,
                      borderColor: selected ? colors.accent : colors.border,
                      backgroundColor: selected ? 'rgba(240,138,108,0.12)' : pressed ? colors.raised : 'transparent',
                    })}
                  >
                    {m ? <Avatar name={m.display_name} colorIndex={m.color_index} size={22} /> : null}
                    <Text variant="small" color={selected ? 'accent' : 'textSoft'}>
                      {m ? m.display_name : t('meals.notDecided')}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}

        {error ? (
          <Text variant="small" color="roseText" accessibilityRole="alert">
            {error}
          </Text>
        ) : null}
      </ScrollView>

      <View style={{ gap: space.sm }}>
        <Button label={t('common.save')} loading={setMeal.isPending} onPress={save} fullWidth />
        {existing ? (
          <Button
            variant="ghost"
            label={t('meals.clearPlan')}
            onPress={() => clearMeal.mutate(existing.id, { onSuccess: onClose })}
            fullWidth
          />
        ) : null}
      </View>
    </Sheet>
  );
}
