export type SelectOption<T extends string = string> = {
  value: T
  label: string
}

export type ActiveIndexKey = 'ArrowDown' | 'ArrowUp' | 'Home' | 'End'

const DIACRITICS = /\p{Diacritic}/gu

/**
 * Folds one character to its lowercase, accent-free base. Each input character maps to exactly
 * one output character, so indexes found on folded text are valid on the original label.
 */
function foldCharacter(character: string): string {
  const lower = character.toLowerCase()
  if (lower === 'đ') return 'd'
  const folded = lower.normalize('NFD').replace(DIACRITICS, '')
  return folded.length === 1 ? folded : lower
}

function foldText(text: string): string {
  return Array.from(text, foldCharacter).join('')
}

export function normalizeSearchText(text: string): string {
  // Some Vietnamese input methods emit decomposed (NFD) text; compose it before folding.
  return foldText(text.normalize('NFC')).trim()
}

export function filterOptions<T extends string>(options: SelectOption<T>[], query: string): SelectOption<T>[] {
  const needle = normalizeSearchText(query)
  if (!needle) return options
  return options.filter((option) => foldText(option.label).includes(needle))
}

export function getMatchRange(label: string, query: string): [number, number] | null {
  const needle = normalizeSearchText(query)
  if (!needle) return null
  const start = foldText(label).indexOf(needle)
  return start < 0 ? null : [start, start + needle.length]
}

export function moveActiveIndex(key: ActiveIndexKey, current: number, count: number): number {
  if (count <= 0) return -1
  switch (key) {
    case 'Home':
      return 0
    case 'End':
      return count - 1
    case 'ArrowDown':
      return current < 0 || current >= count - 1 ? 0 : current + 1
    case 'ArrowUp':
      return current <= 0 ? count - 1 : current - 1
  }
}
