import {
  Apple,
  Beef,
  Croissant,
  CupSoda,
  Milk,
  Package,
  ShoppingBag,
  Snowflake,
  SprayCan,
  Wheat,
  type LucideIcon,
} from 'lucide-react-native';

export type ShoppingCategory =
  | 'produce'
  | 'dairy'
  | 'bakery'
  | 'meat'
  | 'pantry'
  | 'frozen'
  | 'drinks'
  | 'cleaning'
  | 'personal'
  | 'other';

/** Display order of the groups on the list (roughly the order of a supermarket walk). */
export const CATEGORY_ORDER: ShoppingCategory[] = [
  'produce',
  'bakery',
  'dairy',
  'meat',
  'pantry',
  'frozen',
  'drinks',
  'cleaning',
  'personal',
  'other',
];

export const CATEGORY_ICON: Record<ShoppingCategory, LucideIcon> = {
  produce: Apple,
  dairy: Milk,
  bakery: Croissant,
  meat: Beef,
  pantry: Wheat,
  frozen: Snowflake,
  drinks: CupSoda,
  cleaning: SprayCan,
  personal: Package,
  other: ShoppingBag,
};

// Word stems in Hebrew, English and Russian. Matched as substrings, so
// "עגבניות שרי" still lands in produce. First match wins, in this order.
const KEYWORDS: [ShoppingCategory, string[]][] = [
  // exceptions that would otherwise hit a shorter stem first (egg → eggplant)
  ['produce', ['eggplant']],
  [
    'frozen',
    ['קפוא', 'שניצל תירס', 'בצק עלים', 'גלידה', 'frozen', 'ice cream', 'заморож', 'мороженое', 'пельмени'],
  ],
  [
    'cleaning',
    [
      'נוזל כלים', 'אקונומיקה', 'סבון כלים', 'מרכך כביסה', 'אבקת כביסה', 'ג׳ל כביסה', "ג'ל כביסה", 'שקיות זבל',
      'נייר טואלט', 'מגבות נייר', 'ספוג', 'מטליות', 'מנקה', 'טבליות למדיח',
      'detergent', 'bleach', 'dish soap', 'trash bag', 'toilet paper', 'paper towel', 'sponge', 'cleaner',
      'моющ', 'отбел', 'порошок', 'мусорн', 'туалетная бумага', 'губк', 'салфетк',
    ],
  ],
  [
    'personal',
    [
      'שמפו', 'מרכך שיער', 'משחת שיניים', 'מברשת שיניים', 'דאודורנט', 'סבון גוף', 'תחבושות', 'טמפונים', 'חיתולים',
      'סכיני גילוח', 'קרם',
      'shampoo', 'conditioner', 'toothpaste', 'toothbrush', 'deodorant', 'body wash', 'diapers', 'razor',
      'шампунь', 'зубная', 'дезодорант', 'подгузник', 'бритв', 'крем',
    ],
  ],
  [
    'dairy',
    [
      'חלב', 'גבינ', 'קוטג', 'יוגורט', 'שמנת', 'חמאה', 'לבן', 'אשל', 'ביצ', 'מעדן', 'לבנה', 'בולגרית', 'צפתית',
      'milk', 'cheese', 'yogurt', 'yoghurt', 'cream', 'butter', 'egg', 'cottage',
      'молок', 'сыр', 'творог', 'йогурт', 'сливк', 'сметан', 'масло сливочное', 'яйц', 'кефир',
    ],
  ],
  [
    'meat',
    [
      'עוף', 'חזה', 'שניצל', 'בשר', 'טחון', 'כרעיים', 'פרגיות', 'נקניק', 'סלמון', 'דגים', 'פילה', 'טונה', 'הודו', 'קבב',
      'chicken', 'beef', 'meat', 'steak', 'sausage', 'salmon', 'fish', 'turkey', 'mince',
      'куриц', 'мясо', 'говядин', 'фарш', 'колбас', 'сосиск', 'рыба', 'лосос', 'индейк',
    ],
  ],
  [
    'bakery',
    [
      'לחם', 'פיתות', 'פיתה', 'לחמני', 'חלה', 'באגט', 'טורטיה', 'קרואסון', 'עוגה', 'עוגיות',
      'bread', 'pita', 'bun', 'baguette', 'tortilla', 'croissant', 'cake', 'cookie',
      'хлеб', 'батон', 'лаваш', 'булк', 'багет', 'круассан', 'торт', 'печенье',
    ],
  ],
  [
    'drinks',
    [
      'מים', 'סודה', 'קולה', 'מיץ', 'בירה', 'יין', 'קפה', 'תה', 'משקה',
      'water', 'soda', 'cola', 'juice', 'beer', 'wine', 'coffee', 'tea', 'drink',
      'вода', 'газиров', 'кола', 'сок', 'пиво', 'вино', 'кофе', 'чай', 'напит',
    ],
  ],
  [
    'produce',
    [
      'עגבני', 'מלפפונ', 'בצל', 'שום', 'תפוח', 'תפוז', 'בננ', 'לימון', 'פלפל', 'גזר', 'חסה', 'כרוב', 'תפו״א',
      'תפוחי אדמה', 'בטטה', 'אבוקדו', 'ענבים', 'אבטיח', 'מלון', 'תות', 'פטרוזיליה', 'כוסברה', 'שמיר', 'נענע',
      'קישוא', 'חציל', 'פטריות', 'ירקות', 'פירות', 'אפרסק', 'אגס', 'מנגו',
      'tomato', 'cucumber', 'onion', 'garlic', 'apple', 'orange', 'banana', 'lemon', 'pepper', 'carrot',
      'lettuce', 'cabbage', 'potato', 'avocado', 'grape', 'melon', 'strawberr', 'parsley', 'cilantro',
      'zucchini', 'eggplant', 'mushroom', 'vegetable', 'fruit', 'peach', 'pear', 'mango',
      'помидор', 'томат', 'огурц', 'огурец', 'лук', 'чеснок', 'яблок', 'апельсин', 'банан', 'лимон', 'перец',
      'морков', 'салат', 'капуст', 'картоф', 'авокадо', 'виноград', 'арбуз', 'дын', 'клубник', 'петрушк',
      'кинза', 'укроп', 'кабачк', 'баклажан', 'гриб', 'овощ', 'фрукт', 'персик', 'груш', 'манго',
    ],
  ],
  [
    'pantry',
    [
      'אורז', 'פסטה', 'קמח', 'סוכר', 'מלח', 'שמן', 'קטשופ', 'מיונז', 'חומוס', 'טחינה', 'שימורים', 'קורנפלקס',
      'דגני', 'שיבולת', 'עדשים', 'שעועית', 'רסק', 'תבלין', 'פפריקה', 'דבש', 'ריבה', 'שוקולד', 'חטיפ', 'במבה',
      'ביסלי', 'פתיתים', 'קוסקוס', 'אטריות', 'קפה נמס',
      'rice', 'pasta', 'flour', 'sugar', 'salt', 'oil', 'ketchup', 'mayo', 'hummus', 'tahini', 'canned',
      'cereal', 'oats', 'lentil', 'beans', 'spice', 'honey', 'jam', 'chocolate', 'snack', 'noodle', 'couscous',
      'рис', 'макарон', 'паста', 'мука', 'сахар', 'соль', 'масло', 'кетчуп', 'майонез', 'хумус', 'консерв',
      'хлопья', 'овсян', 'чечевиц', 'фасол', 'специ', 'мёд', 'мед', 'варенье', 'шоколад', 'лапша', 'гречк',
    ],
  ],
];

export function guessCategory(name: string): ShoppingCategory {
  const n = name.trim().toLowerCase();
  for (const [category, words] of KEYWORDS) {
    if (words.some((w) => n.includes(w))) return category;
  }
  return 'other';
}

export function isCategory(value: string | null | undefined): value is ShoppingCategory {
  return !!value && (CATEGORY_ORDER as string[]).includes(value);
}
