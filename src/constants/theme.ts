
import { Platform } from 'react-native';

export const colors = {
  brand: {
    primary: '#059669',
    primaryDark: '#047857',
    primaryLight: '#D1FAE5',
  },

  background: {
    light: '#F8FAFC',
    dark: '#101828',
    card: '#FFFFFF',
    elevated: '#FFFFFF',
  },

  text: {
    primary: '#101828',
    secondary: '#667085',
    muted: '#98A2B3',
    inverse: '#FFFFFF',
  },

  border: {
    default: '#E5E7EB',
    subtle: '#F1F5F9',
  },

  status: {
    success: '#16A34A',
    warning: '#D97706',
    error: '#DC2626',
    info: '#2563EB',
  },
} as const;

/**
 * Compatibility theme for existing Expo template components.
 * MediVault currently uses a consistent light appearance.
 */
export const Colors = {
  light: {
    text: colors.text.primary,
    background: colors.background.light,
    backgroundElement: colors.background.card,
    backgroundSelected: colors.brand.primaryLight,
    textSecondary: colors.text.secondary,
    tint: colors.brand.primary,
    border: colors.border.default,
  },

  dark: {
    text: colors.text.primary,
    background: colors.background.light,
    backgroundElement: colors.background.card,
    backgroundSelected: colors.brand.primaryLight,
    textSecondary: colors.text.secondary,
    tint: colors.brand.primary,
    border: colors.border.default,
  },
} as const;

export type ThemeColor =
  keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },

  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },

  web: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'system-ui',
    mono: 'ui-monospace',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 48,
  seven: 64,
} as const;

export const Radius = {
  small: 8,
  medium: 12,
  large: 16,
  extraLarge: 24,
  full: 999,
} as const;

export const BottomTabInset = Platform.select({
  ios: 50,
  android: 80,
}) ?? 0;

export const MaxContentWidth = 800;
