import { CalendarPlus, Clock, Pencil, ShoppingBasket, Trash2, Users } from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { Alert } from '@/services/alert';

import { useI18n } from '@/i18n';
import { dbErrorKey } from '@/services/errors';
import { Button, Sheet, Text, colors, radius, space } from '@/ui';

import { useAddIngredientsToList, useDeleteRecipe, type Recipe } from './api';
import { asIngredients } from './ingredients';

type Props = {
  recipe: Recipe | null;
  onClose: () => void;
  onPlan: (recipe: Recipe) => void;
  onEdit: (recipe: Recipe) => void;
};

export function RecipeSheet({ recipe, onClose, onPlan, onEdit }: Props) {
  const { t } = useI18n();
  const addToList = useAddIngredientsToList();
  const deleteRecipe = useDeleteRecipe();
  const [note, setNote] = useState<string | null>(null);

  if (!recipe) return null;
  const ingredients = asIngredients(recipe.ingredients);
  const ours = !!recipe.household_id;

  function addAll() {
    if (!recipe) return;
    setNote(null);
    addToList.mutate([recipe.ingredients], {
      onSuccess: (n) => setNote(n > 0 ? t('meals.addedToList', { count: n }) : t('meals.allOnList')),
      onError: (e) => setNote(t(dbErrorKey(e))),
    });
  }

  function confirmDelete() {
    if (!recipe) return;
    Alert.alert(t('meals.deleteTitle', { title: recipe.title }), undefined, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => deleteRecipe.mutate(recipe.id, { onSuccess: onClose }),
      },
    ]);
  }

  return (
    <Sheet visible onClose={onClose} title={recipe.title}>
      <ScrollView style={{ maxHeight: 520 }} contentContainerStyle={{ gap: space.lg }}>
        {recipe.description ? <Text color="textSoft">{recipe.description}</Text> : null}

        <View style={{ flexDirection: 'row', gap: space.lg }}>
          {recipe.prep_minutes ? (
            <Meta Icon={Clock} text={t('meals.minutes', { count: recipe.prep_minutes })} />
          ) : null}
          {recipe.servings ? <Meta Icon={Users} text={t('meals.servings', { count: recipe.servings })} /> : null}
          {!ours ? (
            <View style={{ paddingHorizontal: space.sm, borderRadius: radius.pill, backgroundColor: colors.sunken }}>
              <Text variant="small" color="textMuted">
                {t('meals.idea')}
              </Text>
            </View>
          ) : null}
        </View>

        {ingredients.length > 0 ? (
          <View style={{ gap: space.sm }}>
            <Text variant="label" color="textMuted" accessibilityRole="header">
              {t('meals.ingredients')}
            </Text>
            {ingredients.map((ing, i) => (
              <View key={`${ing.name}-${i}`} style={{ flexDirection: 'row', gap: space.sm }}>
                <Text color="accent">•</Text>
                <Text style={{ flex: 1 }}>{ing.name}</Text>
                {ing.qty ? (
                  <Text variant="small" color="textMuted">
                    {ing.qty}
                  </Text>
                ) : null}
              </View>
            ))}
          </View>
        ) : null}

        {recipe.steps.length > 0 ? (
          <View style={{ gap: space.sm }}>
            <Text variant="label" color="textMuted" accessibilityRole="header">
              {t('meals.steps')}
            </Text>
            {recipe.steps.map((step, i) => (
              <View key={i} style={{ flexDirection: 'row', gap: space.sm }}>
                <View
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 12,
                    backgroundColor: colors.raised,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text variant="small" weight="semibold">
                    {i + 1}
                  </Text>
                </View>
                <Text style={{ flex: 1 }}>{step}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>

      {note ? (
        <Text variant="small" color="sage" accessibilityLiveRegion="polite">
          {note}
        </Text>
      ) : null}

      <View style={{ gap: space.sm }}>
        <Button
          label={t('meals.addIngredients')}
          icon={<ShoppingBasket size={18} color={colors.onAccent} />}
          loading={addToList.isPending}
          disabled={ingredients.length === 0}
          onPress={addAll}
          fullWidth
        />
        <Button
          variant="secondary"
          label={t('meals.planIt')}
          icon={<CalendarPlus size={18} color={colors.text} />}
          onPress={() => onPlan(recipe)}
          fullWidth
        />
        {ours ? (
          <View style={{ flexDirection: 'row', gap: space.sm }}>
            <View style={{ flex: 1 }}>
              <Button
                variant="ghost"
                label={t('meals.edit')}
                icon={<Pencil size={16} color={colors.textSoft} />}
                onPress={() => onEdit(recipe)}
                fullWidth
              />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                variant="danger"
                label={t('common.delete')}
                icon={<Trash2 size={16} color={colors.roseText} />}
                onPress={confirmDelete}
                fullWidth
              />
            </View>
          </View>
        ) : null}
      </View>
    </Sheet>
  );
}

function Meta({ Icon, text }: { Icon: typeof Clock; text: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
      <Icon size={16} color={colors.textMuted} />
      <Text variant="small" color="textSoft">
        {text}
      </Text>
    </View>
  );
}
