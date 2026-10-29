import { Platform, useColorScheme } from 'react-native';

const isIOS = Platform.OS === 'ios';

// --- Dark Luxury / Obsidian Palette ---
export const darkColors = {
  ink: '#030712',
  navy: '#0B132B',
  blue: '#3B82F6',
  cyan: '#38BDF8',
  violet: '#8B5CF6',
  magenta: '#EC4899',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#F43F5E',
  background: '#090D16', // Deep obsidian canvas
  surface: '#111827', // Luxury elevated card
  surfaceElevated: '#162032', // Higher elevation
  surfaceContainer: '#1E293B',
  surfaceVariant: '#334155',
  text: '#FFFFFF', // High-contrast stark white
  secondary: '#94A3B8', // Sleek slate gray
  muted: '#64748B',
  border: 'rgba(255,255,255,0.08)', // Fine micro-border
  borderBright: 'rgba(255,255,255,0.16)',
  cardShadow: '#000000',
  cardShadowOpacity: 0.35,
  white: '#FFFFFF',
  ripple: 'rgba(59,130,246,0.15)',
  isDark: true,
};

// --- Light Luxury / Apple Everyday Palette ---
export const lightColors = {
  ink: '#030712',
  navy: '#0B132B',
  blue: '#2563EB',
  cyan: '#0284C7',
  violet: '#7C3AED',
  magenta: '#DB2777',
  success: '#10B981',
  warning: '#D97706',
  danger: '#E11D48',
  background: '#F8FAFC', // Crisp soft slate-50 canvas
  surface: '#FFFFFF', // Elevated pure white card
  surfaceElevated: '#F1F5F9',
  surfaceContainer: '#E2E8F0',
  surfaceVariant: '#CBD5E1',
  text: '#0F172A', // Deep stark slate navy text
  secondary: '#64748B', // Elegant muted slate
  muted: '#94A3B8',
  border: 'rgba(15,23,42,0.08)', // Crisp micro-border
  borderBright: 'rgba(15,23,42,0.15)',
  cardShadow: '#0F172A',
  cardShadowOpacity: 0.05,
  white: '#FFFFFF',
  ripple: 'rgba(37,99,235,0.10)',
  isDark: false,
};

export type ThemeColors = typeof darkColors;

// Backwards-compatible default colors export
export const colors = darkColors;

// Responsive hook that listens to the phone's system Dark/Light mode
export function useAppTheme(): ThemeColors {
  const scheme = useColorScheme();
  return scheme === 'dark' ? darkColors : lightColors;
}

export function getSubjectThemes(isDark: boolean): Record<
  string,
  { primary: string; light: string; border: string; code: string }
> {
  return {
    '1': {
      primary: isDark ? '#38BDF8' : '#2563EB',
      light: isDark ? 'rgba(56,189,248,0.15)' : '#EFF6FF',
      border: isDark ? 'rgba(56,189,248,0.35)' : '#BFDBFE',
      code: 'UU.APP.DEV',
    },
    '2': {
      primary: isDark ? '#C084FC' : '#7C3AED',
      light: isDark ? 'rgba(192,132,252,0.15)' : '#F5F3FF',
      border: isDark ? 'rgba(192,132,252,0.35)' : '#DDD6FE',
      code: 'UU.DB.SYS',
    },
    '3': {
      primary: isDark ? '#34D399' : '#0D9488',
      light: isDark ? 'rgba(52,211,153,0.15)' : '#F0FDF4',
      border: isDark ? 'rgba(52,211,153,0.35)' : '#BBF7D0',
      code: 'UU.SWE.ENG',
    },
    '4': {
      primary: isDark ? '#F59E0B' : '#D97706',
      light: isDark ? 'rgba(245,158,11,0.15)' : '#FFFBEB',
      border: isDark ? 'rgba(245,158,11,0.35)' : '#FDE68A',
      code: 'UU.WEB.TECH',
    },
    '5': {
      primary: isDark ? '#F43F5E' : '#E11D48',
      light: isDark ? 'rgba(244,63,94,0.15)' : '#FFF1F2',
      border: isDark ? 'rgba(244,63,94,0.35)' : '#FECDD3',
      code: 'UU.ARC.DES',
    },
    '6': {
      primary: isDark ? '#818CF8' : '#4F46E5',
      light: isDark ? 'rgba(129,140,248,0.15)' : '#EEF2FF',
      border: isDark ? 'rgba(129,140,248,0.35)' : '#C7D2FE',
      code: 'UU.DES.UX',
    },
    '7': {
      primary: isDark ? '#2DD4BF' : '#0F766E',
      light: isDark ? 'rgba(45,212,191,0.15)' : '#F0FDFA',
      border: isDark ? 'rgba(45,212,191,0.35)' : '#99F6E4',
      code: 'UU.PRJ.SEM',
    },
  };
}

export const shadows = {
  card: {
    shadowColor: '#000',
    shadowOpacity: isIOS ? 0.35 : 0.45,
    shadowRadius: isIOS ? 20 : 8,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  hero: {
    shadowColor: '#3B82F6',
    shadowOpacity: isIOS ? 0.25 : 0.35,
    shadowRadius: isIOS ? 28 : 14,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  },
  floating: {
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
  },
};

export const radius = {
  small: isIOS ? 12 : 8,
  medium: isIOS ? 20 : 16,
  large: isIOS ? 28 : 24,
  pill: 9999,
};

export const spacing = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 22,
  xl: 30,
};

export const typography = {
  titleLarge: {
    fontSize: isIOS ? 34 : 32,
    fontWeight: isIOS ? ('800' as const) : ('700' as const),
    letterSpacing: isIOS ? 0.37 : 0,
    fontFamily: isIOS ? 'System' : undefined,
  },
  titleMedium: {
    fontSize: isIOS ? 20 : 22,
    fontWeight: isIOS ? ('700' as const) : ('600' as const),
    fontFamily: isIOS ? 'System' : undefined,
  },
  body: {
    fontSize: isIOS ? 16 : 15,
    fontWeight: '400' as const,
  },
  caption: {
    fontSize: isIOS ? 12 : 12,
    fontWeight: isIOS ? ('600' as const) : ('500' as const),
    letterSpacing: isIOS ? 0.4 : 0.2,
  },
};
