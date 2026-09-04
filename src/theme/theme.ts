import { createTheme, MantineColorsTuple } from '@mantine/core';

// 10-shade Fastrack Red Palette
const fastrackRed: MantineColorsTuple = [
  '#fff0f2', // 0: softest tint / light pill background
  '#ffe0e4', // 1: light badge background
  '#f9b8c0', // 2: soft border
  '#f38a97', // 3: light accent
  '#eb5969', // 4: vibrant secondary
  '#e01a2b', // 5: [PRIMARY] Fastrack Corporate Red
  '#cb1323', // 6: [HOVER] Deep Crimson
  '#a80d1a', // 7: dark active
  '#870914', // 8: dark accent
  '#68040d', // 9: deepest wine
];

// 10-shade Fastrack Orange Palette
const fastrackOrange: MantineColorsTuple = [
  '#fff7ed', // 0: softest cream
  '#ffedd5', // 1: light badge background
  '#fed7aa', // 2: soft border
  '#fdba74', // 3: warm accent
  '#fb923c', // 4: vibrant secondary
  '#f97316', // 5: [PRIMARY] Fastrack Orange
  '#ea580c', // 6: [HOVER] Deep Orange
  '#c2410c', // 7: dark active
  '#9a3412', // 8: dark accent
  '#7c2d12', // 9: deepest amber
];

// Obsidian Charcoal Scale (The "Touch of Black")
const obsidian: MantineColorsTuple = [
  '#f8fafc', // 0: platinum surface
  '#f1f5f9', // 1: slate surface
  '#e2e8f0', // 2: light border
  '#cbd5e1', // 3: muted border
  '#94a3b8', // 4: slate muted
  '#64748b', // 5: slate body
  '#475569', // 6: slate heading
  '#334155', // 7: dark slate
  '#1e293b', // 8: midnight card
  '#0f172a', // 9: deep obsidian black
];

export const theme = createTheme({
  primaryColor: 'fastrackRed',
  colors: {
    fastrackRed,
    fastrackOrange,
    obsidian,
  },
  fontFamily: 'var(--font-inter), -apple-system, BlinkMacSystemFont, sans-serif',
  headings: {
    fontFamily: 'var(--font-heading), "Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, sans-serif',
    fontWeight: '700',
    sizes: {
      h1: { fontSize: '3.25rem', lineHeight: '1.1', fontWeight: '800' },
      h2: { fontSize: '2.25rem', lineHeight: '1.2', fontWeight: '700' },
      h3: { fontSize: '1.6rem', lineHeight: '1.3', fontWeight: '700' },
      h4: { fontSize: '1.25rem', lineHeight: '1.35', fontWeight: '600' },
    },
  },
  defaultRadius: 'md',
  cursorType: 'pointer',
  components: {
    Button: {
      defaultProps: {
        radius: 'xl',
      },
    },
    Badge: {
      defaultProps: {
        radius: 'xl',
      },
    },
    Card: {
      defaultProps: {
        radius: 'lg',
        padding: 'xl',
      },
    },
  },
});
