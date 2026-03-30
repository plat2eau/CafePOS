export const colorSchemeStorageKey = 'cafepos-color-scheme'

export const colorSchemes = [{ id: 'light' }, { id: 'dark' }] as const

export type ColorSchemeId = (typeof colorSchemes)[number]['id']

export const defaultColorScheme: ColorSchemeId = 'light'

export const colorSchemeIds = colorSchemes.map((scheme) => scheme.id)

export function getColorSchemeBootScript() {
  return `
    (() => {
      const storageKey = '${colorSchemeStorageKey}';
      const fallback = '${defaultColorScheme}';
      const validThemes = new Set(${JSON.stringify(colorSchemeIds)});

      try {
        const storedTheme = window.localStorage.getItem(storageKey);
        const nextTheme = storedTheme && validThemes.has(storedTheme) ? storedTheme : fallback;
        document.documentElement.dataset.colorScheme = nextTheme;
      } catch {
        document.documentElement.dataset.colorScheme = fallback;
      }
    })();
  `
}
