import { useRouter } from 'expo-router';
import ChefHat from 'lucide-react-native/icons/chef-hat';
import Clock from 'lucide-react-native/icons/clock';
import Search from 'lucide-react-native/icons/search';
import ShoppingBasket from 'lucide-react-native/icons/shopping-basket';
import UtensilsCrossed from 'lucide-react-native/icons/utensils-crossed';
import { useState } from 'react';
import { ActivityIndicator, Pressable, TextInput, View } from 'react-native';

import { addDays, todayISO } from '@/features/chores/dates';
import { useAddIngredientsToList, useMealPlan, useRecipes, type Meal, type Recipe } from '@/features/meals/api';
import { PlanSheet } from '@/features/meals/PlanSheet';
import { RecipeEditor } from '@/features/meals/RecipeEditor';
import { RecipeSheet } from '@/features/meals/RecipeSheet';
import { normalizeName } from '@/features/shopping/categories';
import { useMembers } from '@/household/useMembers';
import { useI18n } from '@/i18n';
import { dbErrorKey } from '@/services/errors';
import {
  Avatar,
  BackButton,
  Button,
  Card,
  EmptyState,
  Fab,
  Screen,
  Segmented,
  Text,
  colors,
  fonts,
  radius,
  space,
  touch,
} from '@/ui';

type Tab = 'week' | 'recipes';
type Filter = 'all' | 'ours' | 'ideas';

export default function MealsScreen() {
  const { t, language, isRTL } = useI18n();
  const router = useRouter();
  const { data: members = [] } = useMembers();
  const { data: recipes = [], isPending: recipesLoading } = useRecipes();

  const today = todayISO();
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i));
  const { data: meals = [] } = useMealPlan(today, addDays(today, 7));
  const addToList = useAddIngredientsToList();

  const [tab, setTab] = useState<Tab>('week');
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [openRecipe, setOpenRecipe] = useState<Recipe | null>(null);
  const [editing, setEditing] = useState<{ open: boolean; recipe: Recipe | null }>({ open: false, recipe: null });
  const [planDay, setPlanDay] = useState<string | null>(null);
  const [planRecipeId, setPlanRecipeId] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const dinnerOf = (day: string) => meals.find((m) => m.day === day && m.slot === 'dinner') ?? null;
  const memberOf = (id: string | null) => members.find((m) => m.user_id === id);

  function dayLabel(iso: string) {
    if (iso === today) return t('chores.due.today');
    if (iso === addDays(today, 1)) return t('chores.due.tomorrow');
    const [y, m, d] = iso.split('-').map(Number);
    try {
      return new Intl.DateTimeFormat(language, { weekday: 'long', day: 'numeric', month: 'numeric' }).format(
        new Date(y, m - 1, d),
      );
    } catch {
      return iso;
    }
  }

  const weekWithRecipes = days.map(dinnerOf).filter((m): m is Meal => !!m?.recipes);

  function addWeekToList() {
    setNote(null);
    addToList.mutate(
      weekWithRecipes.map((m) => m.recipes!.ingredients),
      {
        onSuccess: (n) => setNote(n > 0 ? t('meals.addedToList', { count: n }) : t('meals.allOnList')),
        onError: (e) => setNote(t(dbErrorKey(e))),
      },
    );
  }

  const q = normalizeName(query);
  const shownRecipes = recipes.filter(
    (r) =>
      (filter === 'all' || (filter === 'ours' ? !!r.household_id : !r.household_id)) &&
      (!q || normalizeName(r.title).includes(q)),
  );

  return (
    <View style={{ flex: 1 }}>
      <Screen>
        <BackButton label={t('common.back')} onPress={() => router.back()} />
        <Text variant="display" accessibilityRole="header">
          {t('more.meals')}
        </Text>

        <Segmented
          accessibilityLabel={t('more.meals')}
          value={tab}
          onChange={setTab}
          options={[
            { value: 'week', label: t('meals.thisWeek') },
            { value: 'recipes', label: t('meals.recipes') },
          ]}
        />

        {note ? (
          <Text variant="small" color="sage" accessibilityLiveRegion="polite">
            {note}
          </Text>
        ) : null}

        {tab === 'week' ? (
          <>
            <Card padded={false}>
              {days.map((day, i) => {
                const meal = dinnerOf(day);
                const title = meal?.recipes?.title ?? meal?.title ?? null;
                const cook = memberOf(meal?.cook ?? null);
                return (
                  <Pressable
                    key={day}
                    onPress={() => {
                      setPlanRecipeId(null);
                      setPlanDay(day);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`${dayLabel(day)}: ${title ?? t('meals.notPlanned')}`}
                    accessibilityHint={t('meals.tapToPlan')}
                    style={({ pressed }) => ({
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: space.md,
                      minHeight: 64,
                      paddingHorizontal: space.lg,
                      paddingVertical: space.sm,
                      borderTopWidth: i === 0 ? 0 : 1,
                      borderTopColor: colors.hairline,
                      backgroundColor: pressed ? colors.raised : day === today ? 'rgba(240,138,108,0.06)' : 'transparent',
                    })}
                  >
                    <View style={{ width: 92 }}>
                      <Text variant="small" color={day === today ? 'accent' : 'textMuted'} weight={day === today ? 'semibold' : 'regular'}>
                        {dayLabel(day)}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      {title ? (
                        <Text variant="bodyStrong" numberOfLines={1}>
                          {title}
                        </Text>
                      ) : (
                        <Text color="textMuted">+ {t('meals.planDinner')}</Text>
                      )}
                    </View>
                    {cook ? <Avatar name={cook.display_name} colorIndex={cook.color_index} size={26} /> : null}
                  </Pressable>
                );
              })}
            </Card>

            {weekWithRecipes.length > 0 ? (
              <Button
                variant="secondary"
                label={t('meals.addWeekToList')}
                icon={<ShoppingBasket size={18} color={colors.text} />}
                loading={addToList.isPending}
                onPress={addWeekToList}
                fullWidth
              />
            ) : (
              <Text variant="small" color="textMuted" align="center">
                {t('meals.weekHint')}
              </Text>
            )}
          </>
        ) : (
          <>
            {/* search + filter */}
            <Card padded={false} style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.md }}>
              <Search size={18} color={colors.textMuted} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder={t('meals.searchRecipes')}
                placeholderTextColor={colors.textMuted}
                accessibilityLabel={t('meals.searchRecipes')}
                maxFontSizeMultiplier={2}
                style={{
                  flex: 1,
                  minHeight: touch.min + 4,
                  color: colors.text,
                  fontFamily: fonts.regular,
                  fontSize: 16,
                  textAlign: isRTL ? 'right' : 'left',
                  writingDirection: isRTL ? 'rtl' : 'ltr',
                }}
              />
            </Card>
            <Segmented
              accessibilityLabel={t('meals.recipes')}
              value={filter}
              onChange={setFilter}
              options={[
                { value: 'all', label: t('meals.filterAll') },
                { value: 'ours', label: t('meals.filterOurs') },
                { value: 'ideas', label: t('meals.filterIdeas') },
              ]}
            />

            {recipesLoading ? (
              <ActivityIndicator color={colors.accent} accessibilityLabel={t('common.loading')} />
            ) : shownRecipes.length === 0 ? (
              <EmptyState
                Icon={filter === 'ours' ? ChefHat : UtensilsCrossed}
                title={filter === 'ours' ? t('meals.noOurs') : t('meals.noResults')}
                body={filter === 'ours' ? t('meals.noOursBody') : undefined}
              />
            ) : (
              <View style={{ gap: space.sm }}>
                {shownRecipes.map((r) => (
                  <Pressable
                    key={r.id}
                    onPress={() => setOpenRecipe(r)}
                    accessibilityRole="button"
                    accessibilityLabel={r.title}
                    style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
                  >
                    <Card style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
                      <View
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: radius.sm,
                          backgroundColor: r.household_id ? 'rgba(240,138,108,0.15)' : 'rgba(235,182,86,0.15)',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {r.household_id ? (
                          <ChefHat size={22} color={colors.accent} />
                        ) : (
                          <UtensilsCrossed size={22} color={colors.honey} />
                        )}
                      </View>
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text variant="bodyStrong" numberOfLines={1}>
                          {r.title}
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
                          {r.prep_minutes ? (
                            <>
                              <Clock size={13} color={colors.textMuted} />
                              <Text variant="small" color="textMuted">
                                {t('meals.minutes', { count: r.prep_minutes })}
                              </Text>
                            </>
                          ) : null}
                          <Text variant="small" color="textMuted">
                            {r.household_id ? ` · ${t('meals.ours')}` : ` · ${t('meals.idea')}`}
                          </Text>
                        </View>
                      </View>
                    </Card>
                  </Pressable>
                ))}
              </View>
            )}
          </>
        )}
      </Screen>

      {tab === 'recipes' ? (
        <Fab accessibilityLabel={t('meals.newTitle')} onPress={() => setEditing({ open: true, recipe: null })} />
      ) : null}

      <RecipeSheet
        recipe={openRecipe}
        onClose={() => setOpenRecipe(null)}
        onPlan={(r) => {
          setOpenRecipe(null);
          setPlanRecipeId(r.id);
          // first evening without a plan, else today
          setPlanDay(days.find((d) => !dinnerOf(d)) ?? today);
        }}
        onEdit={(r) => {
          setOpenRecipe(null);
          setEditing({ open: true, recipe: r });
        }}
      />

      <RecipeEditor
        visible={editing.open}
        recipe={editing.recipe}
        onClose={() => setEditing({ open: false, recipe: null })}
      />

      <PlanSheet
        day={planDay}
        dayLabel={planDay ? dayLabel(planDay) : ''}
        existing={planDay ? dinnerOf(planDay) : null}
        recipes={recipes}
        members={members}
        presetRecipeId={planRecipeId}
        onClose={() => {
          setPlanDay(null);
          setPlanRecipeId(null);
        }}
      />
    </View>
  );
}

