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

/** One color per category, from the Warm Ember palette. Used by CategoryIcon tiles. */
export const CATEGORY_COLOR: Record<ShoppingCategory, string> = {
  produce: '#9CC6A3',
  dairy: '#8EB4F0',
  bakery: '#EBB656',
  meat: '#E86A7E',
  pantry: '#D9C2A0',
  frozen: '#6FC9C2',
  drinks: '#B79CF0',
  cleaning: '#7CC4E4',
  personal: '#EE9CC1',
  other: '#A89C91',
};

// Word stems in Hebrew, English and Russian. Matched as substrings, so
// "עגבניות שרי" still lands in produce. First match wins, in this order.
const KEYWORDS: [ShoppingCategory, string[]][] = [
  // exceptions that would otherwise hit a shorter stem first (egg → eggplant, tomato → tomato paste)
  ['produce', ['eggplant']],
  ['pantry', ['רסק', 'רוטב עגבניות', 'tomato paste', 'tomato sauce', 'томатная паста', 'томатный соус', 'שמן זית', 'olive oil', 'פירורי לחם', 'breadcrumbs', 'панировочн']],
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
  // ---- more words, same categories (first match above still wins) ----
  ['produce', [
    'סלק', 'צנון', 'ג׳ינג׳ר', 'קולרבי', 'ברוקולי', 'כרובית', 'תרד', 'בזיליקום', 'זנגביל', "ג'ינג'ר", 'רימון', 'קיווי', 'שזיפ',
    'דובדבן', 'אננס', 'פומלה', 'קלמנטינ', 'ליים', 'סלרי', 'דלעת', 'תירס', 'עירית', 'בצלצל', 'ארטישוק', 'נבטים',
    'broccoli', 'cauliflower', 'spinach', 'basil', 'ginger', 'pomegranate', 'kiwi', 'plum', 'cherr', 'pineapple',
    'lime', 'celery', 'pumpkin', 'corn', 'herbs', 'beet', 'radish',
    'брокколи', 'цветная капуст', 'шпинат', 'базилик', 'имбир', 'гранат', 'киви', 'слив', 'вишн', 'черешн',
    'ананас', 'лайм', 'сельдере', 'тыкв', 'кукуруз', 'зелень', 'свекл', 'редис',
  ]],
  ['dairy', [
    'מוצרל', 'פרמזן', 'צהובה', 'ריקוטה', 'מסקרפונה', 'קפיר', 'דנונה', 'מילקי', 'יופלה', 'פודינג', 'חלב שקדים', 'חלב סויה',
    'mozzarella', 'parmesan', 'ricotta', 'kefir', 'pudding',
    'моцарел', 'пармезан', 'ряженк', 'простокваш', 'пудинг',
  ]],
  ['meat', [
    'курин', 'אנטריקוט', 'צלעות', 'כבד', 'פסטרמה', 'המבורגר', 'קציצות', 'שוקיים', 'בקר', 'כבש', 'טלה', 'אמנון', 'דניס', 'לברק',
    'שרימפס', 'קלמרי',
    'burger', 'ribs', 'liver', 'lamb', 'shrimp', 'tuna', 'bacon', 'ham', 'pastrami', 'meatball',
    'котлет', 'ребр', 'рёбр', 'печень', 'баран', 'креветк', 'тунец', 'бекон', 'ветчин', 'фрикадел',
  ]],
  ['bakery', [
    'בייגל', 'לאפה', 'מלאווח', 'ג׳חנון', "ג'חנון", 'בורקס', 'רוגלך', 'מאפה', 'קרקר', 'פריכיות',
    'bagel', 'muffin', 'cracker', 'roll',
    'бублик', 'кекс', 'крекер', 'пирож', 'бисквит',
  ]],
  ['pantry', [
    'פירורי לחם', 'שקדים', 'אגוז', 'בוטנים', 'גרעינים', 'צימוקים', 'חומץ', 'סויה', 'רוטב', 'זעתר', 'כמון', 'כורכום',
    'קינמון', 'וניל', 'אבקת אפייה', 'שמרים', 'קקאו', 'גרנולה', 'בורגול', 'קינואה', 'ממרח', 'נוטלה', 'חמאת בוטנים',
    'מרק', 'זיתים', 'חמוצים', 'ספגטי', 'סולת', 'פתיתים', 'spaghetti', 'semolina', 'спагетти', 'манк', 'מלפפון חמוץ', 'גריסים', 'חומוס יבש', 'סילאן',
    'vinegar', 'soy sauce', 'sauce', 'nuts', 'almond', 'peanut', 'raisin', 'cinnamon', 'vanilla', 'baking', 'yeast',
    'cocoa', 'granola', 'quinoa', 'bulgur', 'spread', 'nutella', 'soup', 'olives', 'pickles',
    'уксус', 'соус', 'орех', 'миндал', 'арахис', 'изюм', 'кориц', 'ванил', 'дрожж', 'какао', 'гранол', 'киноа',
    'булгур', 'суп', 'оливк', 'маслин', 'бульон', 'птитим', 'кумин', 'куркум', 'паприк',
    'paprika', 'cumin', 'turmeric', 'ptitim',
  ]],
  ['drinks', [
    'קפסולות', 'שוקו', 'וודקה', 'ויסקי', 'ערק', 'תירוש', 'אנרגיה',
    'vodka', 'whisky', 'whiskey', 'energy drink', 'sparkling', 'lemonade',
    'водка', 'виски', 'энергетик', 'минерал', 'лимонад',
  ]],
  ['frozen', ['קרטיב', 'ארטיק', 'popsicle', 'эскимо']],
  ['cleaning', [
    'מטהר אוויר', 'נייר כסף', 'נייר אלומיניום', 'ניילון נצמד', 'שקיות אוכל', 'שקיות הקפאה', 'כפפות', 'מלח למדיח',
    'מבריק', 'פרסיל', 'סנו', 'נייר אפייה',
    'foil', 'cling', 'gloves', 'dishwasher', 'laundry', 'air freshener', 'baking paper',
    'фольга', 'плёнка', 'пленка', 'перчатк', 'посудомо', 'стирк', 'освежитель',
  ]],
  ['personal', [
    'תרופ', 'אקמול', 'נורופן', 'פלסטר', 'צמר גפן', 'מקלוני אוזניים', 'קרם הגנה', 'חוט דנטלי', 'מי פה', 'סבון', 'מגבונים',
    'soap', 'floss', 'mouthwash', 'sunscreen', 'cotton', 'band-aid', 'pads', 'medicine', 'wipes',
    'мыло', 'зубная нить', 'ополаскиват', 'солнцезащит', 'вата', 'пластыр', 'прокладк', 'лекарств', 'влажные салфетки',
  ]],
];

/** Lower-case, trimmed, single spaces: the key used to remember a product's category. */
export function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLowerCase();
}

/**
 * Best guess from the built-in word list. Returns null when we don't know —
 * the app then asks the user instead of silently filing it under "other".
 */
export function guessCategory(name: string): ShoppingCategory | null {
  const n = normalizeName(name);
  for (const [category, words] of KEYWORDS) {
    if (words.some((w) => n.includes(w))) return category;
  }
  return null;
}

export function isCategory(value: string | null | undefined): value is ShoppingCategory {
  return !!value && (CATEGORY_ORDER as string[]).includes(value);
}
