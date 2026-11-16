import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { useI18n } from '@/i18n';
import { dbErrorKey } from '@/services/errors';
import { Button, Sheet, Text, TextField, space } from '@/ui';

import { useSaveRecipe, type Recipe } from './api';
import { asIngredients, ingredientsToText, parseIngredientLines } from './ingredients';

type Props = {
  visible: boolean;
  /** null = new recipe */
  recipe: Recipe | null;
  onClose: () => void;
};

/** Plain text editing: one ingredient per line, one step per line. Fast to type, easy to read. */
export function RecipeEditor({ visible, recipe, onClose }: Props) {
  const { t } = useI18n();
  const save = useSaveRecipe();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [ingredients, setIngredients] = useState('');
  const [steps, setSteps] = useState('');
  const [minutes, setMinutes] = useState('');
  const [servings, setServings] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setTitle(recipe?.title ?? '');
    setDescription(recipe?.description ?? '');
    setIngredients(recipe ? ingredientsToText(asIngredients(recipe.ingredients)) : '');
    setSteps(recipe?.steps.join('\n') ?? '');
    setMinutes(recipe?.prep_minutes ? String(recipe.prep_minutes) : '');
    setServings(recipe?.servings ? String(recipe.servings) : '');
    setError(null);
  }, [visible, recipe]);

  const parsed = parseIngredientLines(ingredients);

  function submit() {
    const clean = title.trim().replace(/\s+/g, ' ').slice(0, 80);
    if (!clean) return setError(t('meals.titleRequired'));
    const m = parseInt(minutes, 10);
    const s = parseInt(servings, 10);
    save.mutate(
      {
        id: recipe?.id,
        title: clean,
        description: description.trim().slice(0, 500) || null,
        ingredients: parsed,
        steps: steps
          .split('\n')
          .map((x) => x.trim())
          .filter(Boolean)
          .slice(0, 40),
        prep_minutes: m > 0 && m <= 1440 ? m : null,
        servings: s > 0 && s <= 50 ? s : null,
      },
      { onSuccess: onClose, onError: (e) => setError(t(dbErrorKey(e))) },
    );
  }

  return (
    <Sheet visible={visible} onClose={onClose} title={recipe ? t('meals.editTitle') : t('meals.newTitle')}>
      <ScrollView style={{ maxHeight: 560 }} contentContainerStyle={{ gap: space.lg }} keyboardShouldPersistTaps="handled">
        <TextField label={t('meals.recipeName')} value={title} onChangeText={setTitle} maxLength={80} autoFocus={!recipe} />
        <TextField
          label={t('meals.description')}
          value={description}
          onChangeText={setDescription}
          maxLength={500}
          multiline
        />
        <View style={{ flexDirection: 'row', gap: space.md }}>
          <View style={{ flex: 1 }}>
            <TextField
              label={t('meals.minutesLabel')}
              value={minutes}
              onChangeText={(v) => setMinutes(v.replace(/\D/g, '').slice(0, 4))}
              keyboardType="number-pad"
              forceLTR
            />
          </View>
          <View style={{ flex: 1 }}>
            <TextField
              label={t('meals.servingsLabel')}
              value={servings}
              onChangeText={(v) => setServings(v.replace(/\D/g, '').slice(0, 2))}
              keyboardType="number-pad"
              forceLTR
            />
          </View>
        </View>
        <TextField
          label={t('meals.ingredients')}
          hint={t('meals.ingredientsHint')}
          value={ingredients}
          onChangeText={setIngredients}
          multiline
          style={{ minHeight: 120, textAlignVertical: 'top', paddingVertical: space.md }}
        />
        {parsed.length > 0 ? (
          <Text variant="small" color="textMuted">
            {t('meals.ingredientsCount', { count: parsed.length })}
          </Text>
        ) : null}
        <TextField
          label={t('meals.steps')}
          hint={t('meals.stepsHint')}
          value={steps}
          onChangeText={setSteps}
          multiline
          style={{ minHeight: 120, textAlignVertical: 'top', paddingVertical: space.md }}
        />
        {error ? (
          <Text variant="small" color="roseText" accessibilityRole="alert">
            {error}
          </Text>
        ) : null}
      </ScrollView>
      <Button label={t('common.save')} loading={save.isPending} disabled={!title.trim()} onPress={submit} fullWidth />
    </Sheet>
  );
}
