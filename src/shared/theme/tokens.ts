export const colors = {
  light: {
    background: '#F7F8F5', surface: '#FFFFFF', surfaceMuted: '#E9EEE9',
    text: '#1C2B24', textMuted: '#4C6054', border: '#718476',
    accent: '#245B44', onAccent: '#FFFFFF', selected: '#DAECDD',
    danger: '#AC2334', dangerSurface: '#FDEDEE', focus: '#245B44', skeleton: '#D0DCD3',
    disabledBackground: '#E3E8E3', disabledText: '#526458',
  },
  dark: {
    background: '#111B16', surface: '#1D2A22', surfaceMuted: '#283A2F',
    text: '#F1F6EF', textMuted: '#B8CABC', border: '#6E8775',
    accent: '#ACD5B4', onAccent: '#12271B', selected: '#334D3D',
    danger: '#FFAFB8', dangerSurface: '#412329', focus: '#ACD5B4', skeleton: '#3B5042',
    disabledBackground: '#283A2F', disabledText: '#B8CABC',
  },
} as const;
export type ResolvedTheme = keyof typeof colors;
export type ThemeMode = 'system' | ResolvedTheme;
export function resolveTheme(mode: ThemeMode, system: string | null | undefined): ResolvedTheme {
  return mode === 'system' ? system === 'dark' ? 'dark' : 'light' : mode;
}
export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, section: 48 } as const;
export const radius = { control: 12, card: 20, pill: 999 } as const;
export const typography = {
  title: { fontSize: 32, lineHeight: 42, fontWeight: '700' },
  heading: { fontSize: 22, lineHeight: 30, fontWeight: '700' },
  body: { fontSize: 16, lineHeight: 25, fontWeight: '400' },
  label: { fontSize: 16, lineHeight: 24, fontWeight: '600' },
  caption: { fontSize: 13, lineHeight: 20, fontWeight: '400' },
} as const;
export const motion = { feedback: 120, transition: 220, skeleton: 1100 } as const;
export const layout = { contentWidth: 760, touchTarget: 48, thumbnailSize: 80, borderWidth: 1, focusWidth: 2 } as const;
