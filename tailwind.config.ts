import type { Config } from 'tailwindcss';
import defaultTheme from 'tailwindcss/defaultTheme';

/**
 * PoolMate design tokens.
 *
 * The colour palette REPLACES Tailwind's defaults on purpose: only neutral
 * tokens exist, so purple/violet/neon utilities cannot be used by accident.
 * Values are CSS variables defined in src/styles/index.css.
 */
const token = (name: string) => `rgb(var(--pm-${name}) / <alpha-value>)`;

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      white: '#FFFFFF',
      black: '#0A0A0A',

      // Raw neutral scale (prefer semantic tokens below in components).
      grey: {
        50: '#FAFAF9',
        100: '#F5F5F4',
        150: '#EEEEEC',
        200: '#E7E7E5',
        300: '#D4D4D1',
        400: '#A8A8A4',
        500: '#737371',
        600: '#5E5E5C',
        700: '#404040',
        800: '#262626',
        900: '#171717',
        950: '#0A0A0A',
      },

      // Semantic tokens.
      canvas: token('canvas'),
      surface: {
        DEFAULT: token('surface'),
        muted: token('surface-muted'),
        sunken: token('surface-sunken'),
        inverse: token('surface-inverse'),
      },
      line: {
        DEFAULT: token('line'),
        strong: token('line-strong'),
      },
      ink: {
        DEFAULT: token('ink'),
        secondary: token('ink-secondary'),
        tertiary: token('ink-tertiary'),
        disabled: token('ink-disabled'),
        inverse: token('ink-inverse'),
      },
      primary: {
        DEFAULT: token('primary'),
        hover: token('primary-hover'),
        foreground: token('primary-foreground'),
      },
      backdrop: token('backdrop'),
    },
    extend: {
      fontFamily: {
        sans: ['"Inter Variable"', 'Inter', ...defaultTheme.fontFamily.sans],
      },
      // [size, { lineHeight, letterSpacing, fontWeight }]
      fontSize: {
        display: ['2.5rem', { lineHeight: '1.1', letterSpacing: '-0.025em', fontWeight: '650' }],
        'title-lg': ['2rem', { lineHeight: '1.15', letterSpacing: '-0.02em', fontWeight: '650' }],
        title: ['1.5rem', { lineHeight: '1.25', letterSpacing: '-0.015em', fontWeight: '600' }],
        heading: ['1.125rem', { lineHeight: '1.4', letterSpacing: '-0.01em', fontWeight: '600' }],
        'body-lg': ['1rem', { lineHeight: '1.6' }],
        body: ['0.9375rem', { lineHeight: '1.55' }],
        'body-sm': ['0.875rem', { lineHeight: '1.5' }],
        caption: ['0.8125rem', { lineHeight: '1.45' }],
        micro: ['0.6875rem', { lineHeight: '1.3', letterSpacing: '0.04em', fontWeight: '600' }],
      },
      borderRadius: {
        sm: '6px',
        DEFAULT: '8px',
        md: '10px',
        lg: '12px',
        xl: '16px',
        sheet: '20px',
      },
      boxShadow: {
        xs: '0 1px 2px rgb(10 10 10 / 0.04)',
        sm: '0 1px 3px rgb(10 10 10 / 0.06), 0 1px 2px rgb(10 10 10 / 0.04)',
        md: '0 4px 12px rgb(10 10 10 / 0.06), 0 1px 3px rgb(10 10 10 / 0.05)',
        lg: '0 12px 32px rgb(10 10 10 / 0.10), 0 2px 6px rgb(10 10 10 / 0.05)',
        sheet: '0 -6px 24px rgb(10 10 10 / 0.08)',
      },
      // Defaults are emitted into Tailwind's base layer, which cannot resolve
      // <alpha-value> templates — so these use concrete values.
      borderColor: {
        DEFAULT: 'rgb(var(--pm-line))',
      },
      ringColor: {
        DEFAULT: '#111111',
      },
      ringOffsetColor: {
        DEFAULT: '#FFFFFF',
      },
      spacing: {
        topbar: '4rem',
        sidenav: '15rem',
        panel: '25rem',
      },
      maxWidth: {
        page: '72rem',
      },
    },
  },
  plugins: [],
};

export default config;
