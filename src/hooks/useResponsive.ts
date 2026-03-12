import { useWindowDimensions } from 'react-native';

export type Breakpoint = 'mobile' | 'tablet' | 'desktop';

export function useResponsive() {
  const { width } = useWindowDimensions();

  const breakpoint: Breakpoint =
    width >= 1024 ? 'desktop' : width >= 768 ? 'tablet' : 'mobile';

  return {
    width,
    breakpoint,
    isMobile: breakpoint === 'mobile',
    isTablet: breakpoint === 'tablet',
    isDesktop: breakpoint === 'desktop',
    isWide: breakpoint !== 'mobile',
    contentMaxWidth: breakpoint === 'desktop' ? 960 : breakpoint === 'tablet' ? 720 : undefined,
    columns: breakpoint === 'desktop' ? 3 : breakpoint === 'tablet' ? 2 : 1,
  };
}
