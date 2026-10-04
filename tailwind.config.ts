import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
    './types/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        paper: 'rgb(var(--color-paper) / <alpha-value>)',
        ink: 'rgb(var(--color-ink) / <alpha-value>)',
        muted: 'rgb(var(--color-muted) / <alpha-value>)',
        line: 'rgb(var(--color-line) / <alpha-value>)',
        accent: 'rgb(var(--color-accent) / <alpha-value>)',
        accentSoft: 'rgb(var(--color-accent-soft) / <alpha-value>)',
        success: 'rgb(var(--color-success) / <alpha-value>)',
        successInk: 'rgb(var(--color-success-ink) / <alpha-value>)',
        warning: 'rgb(var(--color-warning) / <alpha-value>)',
        warningInk: 'rgb(var(--color-warning-ink) / <alpha-value>)',
        danger: 'rgb(var(--color-danger) / <alpha-value>)',
        dangerInk: 'rgb(var(--color-danger-ink) / <alpha-value>)'
      },
      letterSpacing: {
        terminal: '0.14em',
      },
      fontFamily: {
        sans: ['var(--font-geist)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        serif: ['ui-serif', 'Georgia', 'serif'],
        mono: ['var(--font-geist-mono)', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
