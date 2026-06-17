const LOWERCASE_PARTICLES = new Set(['da', 'de', 'do', 'das', 'dos', 'e', 'di', 'du', 'van', 'von']);

export function normalizePersonName(value: string): string {
  const words = value
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .split(' ')
    .filter(Boolean);

  return words
    .map((word, index) => {
      if (index > 0 && LOWERCASE_PARTICLES.has(word)) {
        return word;
      }

      return normalizeNameWord(word);
    })
    .join(' ');
}

export function normalizePersonNameInput(value: string): string {
  const hasTrailingSpace = /\s$/.test(value);
  const normalized = normalizePersonName(value);

  return hasTrailingSpace && normalized ? `${normalized} ` : normalized;
}

function normalizeNameWord(word: string): string {
  return word
    .split("'")
    .map((part) => normalizeNamePart(part))
    .join("'");
}

function normalizeNamePart(part: string): string {
  if (!part) {
    return part;
  }

  if (part.startsWith('mc') && part.length > 2) {
    return `Mc${capitalizeFirst(part.slice(2))}`;
  }

  return capitalizeFirst(part);
}

function capitalizeFirst(value: string): string {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}
