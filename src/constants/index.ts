export type PaletteId = 'nordic' | 'alpine' | 'mountain';

export type ColorSet = { [K in keyof typeof LIGHT_COLORS]: string };

// ============================================================
// PALETTE A: "Nordic Clean" — Skandinavisk, blå, ren
// Tenk Yr.no / Entur — rolig blå med hvit bakgrunn
// ============================================================
export const LIGHT_COLORS = {
  primary: '#1B6DB2',
  primaryLight: '#E6F4FE',
  secondary: '#2E7D5B',
  accent: '#F97316',
  background: '#F5F7FA',
  surface: '#FFFFFF',
  surfaceHover: '#F8FAFC',
  text: '#1A1A2E',
  textSecondary: '#6B7280',
  border: '#E5E7EB',
  borderLight: '#F0F1F3',
  error: '#DC2626',
  success: '#16A34A',
  warning: '#F59E0B',
  shadow: 'rgba(0, 0, 0, 0.08)',
} as const;

export const DARK_COLORS = {
  primary: '#4A9FE5',
  primaryLight: '#1A3A5C',
  secondary: '#3DA878',
  accent: '#FB923C',
  background: '#121212',
  surface: '#1E1E1E',
  surfaceHover: '#262626',
  text: '#E5E5E5',
  textSecondary: '#9CA3AF',
  border: '#2D2D2D',
  borderLight: '#242424',
  error: '#EF4444',
  success: '#22C55E',
  warning: '#FBBF24',
  shadow: 'rgba(0, 0, 0, 0.3)',
} as const;

// ============================================================
// PALETTE B: "Alpine Sunset" — Varm, oransje/brent, premium
// Tenk Strava / hyttetur — varm oransje primær, kremhvit bakgrunn
// ============================================================
const ALPINE_LIGHT = {
  primary: '#C2410C',
  primaryLight: '#FFF1E6',
  secondary: '#92400E',
  accent: '#EA580C',
  background: '#FFFAF5',
  surface: '#FFFFFF',
  surfaceHover: '#FFF5EB',
  text: '#431407',
  textSecondary: '#9A6B4E',
  border: '#F5D5B8',
  borderLight: '#FAEBD7',
  error: '#B91C1C',
  success: '#15803D',
  warning: '#D97706',
  shadow: 'rgba(194, 65, 12, 0.1)',
} as const;

const ALPINE_DARK = {
  primary: '#FB923C',
  primaryLight: '#431407',
  secondary: '#FBBF24',
  accent: '#F97316',
  background: '#1C1008',
  surface: '#2A1A0E',
  surfaceHover: '#3D2616',
  text: '#FDE8D0',
  textSecondary: '#C9A882',
  border: '#4D3320',
  borderLight: '#3A2515',
  error: '#FCA5A5',
  success: '#4ADE80',
  warning: '#FCD34D',
  shadow: 'rgba(0, 0, 0, 0.5)',
} as const;

// ============================================================
// PALETTE C: "Mountain Neon" — Sporty, mørkt, neon-cyan
// Tenk Suunto / Coros — mørke flater selv i lys modus, neon-aksenter
// ============================================================
const MOUNTAIN_LIGHT = {
  primary: '#06B6D4',
  primaryLight: '#164E63',
  secondary: '#8B5CF6',
  accent: '#22D3EE',
  background: '#0F172A',
  surface: '#1E293B',
  surfaceHover: '#283548',
  text: '#F1F5F9',
  textSecondary: '#94A3B8',
  border: '#334155',
  borderLight: '#293548',
  error: '#FB7185',
  success: '#34D399',
  warning: '#FBBF24',
  shadow: 'rgba(6, 182, 212, 0.15)',
} as const;

const MOUNTAIN_DARK = {
  primary: '#22D3EE',
  primaryLight: '#0C4A5E',
  secondary: '#A78BFA',
  accent: '#67E8F9',
  background: '#020617',
  surface: '#0F172A',
  surfaceHover: '#1A2540',
  text: '#E2E8F0',
  textSecondary: '#64748B',
  border: '#1E293B',
  borderLight: '#162032',
  error: '#FB7185',
  success: '#34D399',
  warning: '#FCD34D',
  shadow: 'rgba(0, 0, 0, 0.6)',
} as const;

export const PALETTES: Record<PaletteId, { label: string; light: ColorSet; dark: ColorSet; preview: [string, string, string] }> = {
  nordic:   { label: 'Nordic Clean',   light: LIGHT_COLORS,   dark: DARK_COLORS,   preview: ['#1B6DB2', '#F5F7FA', '#F97316'] },
  alpine:   { label: 'Alpine Sunset',  light: ALPINE_LIGHT,   dark: ALPINE_DARK,   preview: ['#C2410C', '#FFFAF5', '#EA580C'] },
  mountain: { label: 'Mountain Neon',  light: MOUNTAIN_LIGHT, dark: MOUNTAIN_DARK, preview: ['#06B6D4', '#0F172A', '#22D3EE'] },
};

/** @deprecated Use useTheme() hook instead. Kept for backward compatibility. */
export const COLORS = LIGHT_COLORS;

export const TRACKING = {
  intervalMs: 5000,
  syncIntervalMs: 30000,
  lowBatteryIntervalMs: 30000,
} as const;

export const WEATHER = {
  userAgent: 'SkiturApp/1.0 github.com/knsorensen/SkiturApp',
  baseUrl: 'https://api.met.no/weatherapi/locationforecast/2.0/',
  refreshIntervalMs: 3600000, // 1 hour
} as const;
