/**
 * Parses a page range string (e.g., "1-3,5,7-9") and returns an ordered,
 * deduplicated array of page numbers.
 *
 * @param rangeStr The page range string to parse.
 * @param totalPages The total pages available (for boundary checking).
 * @throws Error if the format is invalid, contains non-positive pages, reverse ranges, or exceeds totalPages.
 */
export function parsePageRange(
  rangeStr: string | null | undefined,
  totalPages: number | null,
): number[] {
  if (!rangeStr || rangeStr.trim() === '') {
    if (totalPages !== null && totalPages > 0) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    return [];
  }

  const cleanStr = rangeStr.replace(/\s+/g, '');
  const tokens = cleanStr.split(',');
  const pagesSet = new Set<number>();

  for (const token of tokens) {
    if (token === '') {
      throw new Error('Invalid format');
    }

    if (/^\d+$/.test(token)) {
      const page = parseInt(token, 10);
      if (page < 1) {
        throw new Error('Page numbers must be positive integers');
      }
      if (totalPages !== null && page > totalPages) {
        throw new Error(`Page ${page} exceeds total ${totalPages}`);
      }
      pagesSet.add(page);
    } else if (/^\d+-\d+$/.test(token)) {
      const parts = token.split('-');
      const start = parseInt(parts[0], 10);
      const end = parseInt(parts[1], 10);

      if (start < 1 || end < 1) {
        throw new Error('Page numbers must be positive integers');
      }
      if (start > end) {
        throw new Error(`Invalid range ${token}: start page cannot exceed end page`);
      }
      if (totalPages !== null && end > totalPages) {
        throw new Error(`Page ${end} exceeds total ${totalPages}`);
      }

      for (let i = start; i <= end; i++) {
        pagesSet.add(i);
      }
    } else {
      throw new Error('Invalid format');
    }
  }

  return Array.from(pagesSet).sort((a, b) => a - b);
}

/**
 * Returns true if the page range string is structurally and logically valid.
 */
export function isValidPageRange(
  rangeStr: string | null | undefined,
  totalPages: number | null,
): boolean {
  try {
    parsePageRange(rangeStr, totalPages);
    return true;
  } catch {
    return false;
  }
}
