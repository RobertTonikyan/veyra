import Bus from 'lucide-react-native/icons/bus';
import HeartPulse from 'lucide-react-native/icons/heart-pulse';
import House from 'lucide-react-native/icons/house';
import KeyRound from 'lucide-react-native/icons/key-round';
import Popcorn from 'lucide-react-native/icons/popcorn';
import Receipt from 'lucide-react-native/icons/receipt';
import ShoppingCart from 'lucide-react-native/icons/shopping-cart';
import Sparkles from 'lucide-react-native/icons/sparkles';
import UtensilsCrossed from 'lucide-react-native/icons/utensils-crossed';
import type { LucideIcon } from 'lucide-react-native';

export type ExpenseCategory =
  | 'groceries'
  | 'dining'
  | 'bills'
  | 'rent'
  | 'home'
  | 'transport'
  | 'fun'
  | 'health'
  | 'other';

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'groceries',
  'dining',
  'bills',
  'rent',
  'home',
  'transport',
  'fun',
  'health',
  'other',
];

export const EXPENSE_ICON: Record<ExpenseCategory, LucideIcon> = {
  groceries: ShoppingCart,
  dining: UtensilsCrossed,
  bills: Receipt,
  rent: KeyRound,
  home: House,
  transport: Bus,
  fun: Popcorn,
  health: HeartPulse,
  other: Sparkles,
};

export const EXPENSE_COLOR: Record<ExpenseCategory, string> = {
  groceries: '#9CC6A3',
  dining: '#F08A6C',
  bills: '#8EB4F0',
  rent: '#B79CF0',
  home: '#D9C2A0',
  transport: '#6FC9C2',
  fun: '#EBB656',
  health: '#EE9CC1',
  other: '#A89C91',
};

export function isExpenseCategory(value: string | null | undefined): value is ExpenseCategory {
  return !!value && (EXPENSE_CATEGORIES as string[]).includes(value);
}

export function asExpenseCategory(value: string | null | undefined): ExpenseCategory {
  return isExpenseCategory(value) ? value : 'other';
}
