import {
  Badge,
  Button,
  Card,
  createTheme,
  CSSVariablesResolver,
  FileInput,
  Modal,
  NumberInput,
  Select,
  Tabs,
  TagsInput,
  Textarea,
  TextInput,
  type MantineColorsTuple,
} from '@mantine/core';

const brand: MantineColorsTuple = [
  '#EEF4FF',
  '#DBE6FE',
  '#B8CEFD',
  '#8FB0FB',
  '#608BF8',
  '#3B6BF2',
  '#2454E8',
  '#1D43C4',
  '#1A389E',
  '#17317E',
];

const amber: MantineColorsTuple = [
  '#FFFBEB',
  '#FEF3C7',
  '#FDE68A',
  '#FCD34D',
  '#FBBF24',
  '#F59E0B',
  '#D97706',
  '#B45309',
  '#92400E',
  '#78350F',
];

export const theme = createTheme({
  primaryColor: 'brand',
  primaryShade: { light: 6, dark: 5 },
  defaultRadius: 'md',
  fontFamily: "'Be Vietnam Pro', system-ui, -apple-system, sans-serif",
  headings: {
    fontFamily: "'Be Vietnam Pro', system-ui, -apple-system, sans-serif",
    fontWeight: '700',
  },
  colors: {
    brand,
    amber,
  },
  components: {
    Card: Card.extend({
      defaultProps: {
        withBorder: true,
        radius: 'md',
        shadow: 'xs',
      },
    }),
    Button: Button.extend({
      defaultProps: {
        fw: 600,
        radius: 'md',
      },
    }),
    Badge: Badge.extend({
      defaultProps: {
        radius: 'sm',
        fw: 600,
        variant: 'light',
      },
    }),
    Modal: Modal.extend({
      defaultProps: {
        centered: true,
        radius: 'lg',
        overlayProps: { backgroundOpacity: 0.45, blur: 3 },
      },
    }),
    TextInput: TextInput.extend({
      defaultProps: { radius: 'md' },
    }),
    Textarea: Textarea.extend({
      defaultProps: { radius: 'md' },
    }),
    Select: Select.extend({
      defaultProps: { radius: 'md' },
    }),
    NumberInput: NumberInput.extend({
      defaultProps: { radius: 'md' },
    }),
    TagsInput: TagsInput.extend({
      defaultProps: { radius: 'md' },
    }),
    FileInput: FileInput.extend({
      defaultProps: { radius: 'md' },
    }),
    Tabs: Tabs.extend({
      defaultProps: { radius: 'md', color: 'brand' },
    }),
  },
});

export const cssVariablesResolver: CSSVariablesResolver = () => ({
  variables: {
    '--app-bottom-nav-h': '4.25rem',
  },
  light: {
    '--app-bg-canvas': '#F8FAFC',
    '--app-bg-surface': '#FFFFFF',
    '--app-border-subtle': '#E2E8F0',
    '--app-text-muted': '#475569',
  },
  dark: {
    '--app-bg-canvas': '#0F172A',
    '--app-bg-surface': '#1E293B',
    '--app-border-subtle': '#334155',
    '--app-text-muted': '#94A3B8',
  },
});
