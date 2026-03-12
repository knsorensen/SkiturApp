import { useColorScheme } from 'react-native';
import { PALETTES } from '../constants';
import { useThemeStore } from '../stores/themeStore';

export function useTheme() {
  const systemScheme = useColorScheme();
  const { preference, palette: paletteId } = useThemeStore();

  const resolvedScheme =
    preference === 'system' ? (systemScheme ?? 'light') : preference;

  const palette = PALETTES[paletteId] ?? PALETTES.nordic;
  const colors = resolvedScheme === 'dark' ? palette.dark : palette.light;

  return { colors, isDark: resolvedScheme === 'dark' };
}
