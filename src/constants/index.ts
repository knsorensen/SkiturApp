export const COLORS = {
  primary: '#1B6DB2',
  primaryLight: '#E6F4FE',
  secondary: '#2E7D5B',
  background: '#F5F7FA',
  surface: '#FFFFFF',
  text: '#1A1A2E',
  textSecondary: '#6B7280',
  border: '#E5E7EB',
  error: '#DC2626',
  success: '#16A34A',
  warning: '#F59E0B',
} as const;

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
