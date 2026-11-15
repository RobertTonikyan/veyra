// Warm Ember — Veyra design tokens

export const colors = {
  bg: '#1A1614',
  surface: '#24201D',
  raised: '#2E2925',
  sunken: '#141110',
  hairline: 'rgba(243,236,230,0.08)',
  border: 'rgba(243,236,230,0.12)',

  text: '#F3ECE6',
  textSoft: '#CFC5BB',
  textMuted: '#A89C91',

  accent: '#F08A6C',
  onAccent: '#2A1510',
  honey: '#EBB656',
  sage: '#9CC6A3',
  rose: '#E86A7E',
  roseText: '#F29AA8',
} as const;

export type ColorName = keyof typeof colors;

// One color per household member, in join order. Always shown with the
// member's initial, never color alone.
export const memberColors = [
  '#F08A6C', // coral
  '#8EB4F0', // sky
  '#9CC6A3', // sage
  '#EBB656', // honey
  '#B79CF0', // lavender
  '#6FC9C2', // teal
  '#EE9CC1', // pink
  '#D9C2A0', // sand
] as const;

export function memberColor(index: number): string {
  return memberColors[((index % memberColors.length) + memberColors.length) % memberColors.length];
}

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  xxxl: 40,
} as const;

export const radius = {
  sm: 12,
  md: 16,
  lg: 22,
  xl: 28,
  pill: 999,
} as const;

export const fonts = {
  regular: 'Rubik_400Regular',
  medium: 'Rubik_500Medium',
  semibold: 'Rubik_600SemiBold',
  bold: 'Rubik_700Bold',
  extrabold: 'Rubik_800ExtraBold',
} as const;

export type FontWeight = keyof typeof fonts;

type TypeStyle = {
  size: number;
  line: number;
  weight: FontWeight;
  tracking?: number;
};

export const typography = {
  display: { size: 30, line: 36, weight: 'bold', tracking: -0.5 },
  title: { size: 24, line: 30, weight: 'bold', tracking: -0.3 },
  heading: { size: 17, line: 24, weight: 'semibold' },
  body: { size: 15, line: 22, weight: 'regular' },
  bodyStrong: { size: 15, line: 22, weight: 'semibold' },
  small: { size: 13, line: 19, weight: 'regular' },
  label: { size: 12, line: 16, weight: 'semibold', tracking: 0.4 },
  number: { size: 28, line: 34, weight: 'bold' },
} as const satisfies Record<string, TypeStyle>;

export type TypographyVariant = keyof typeof typography;


export const touch = {
  min: 44,
} as const;