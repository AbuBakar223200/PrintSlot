import { BadRequestException } from '@nestjs/common';

/**
 * Parses a page range string (e.g., "1-3,5,7-9") and returns an ordered,
 * deduplicated array of page numbers.
 *
 * @param rangeStr The page range string to parse.
 * @param totalPages The total pages available (for boundary checking).
 * @throws BadRequestException if the format is invalid, contains non-positive pages, reverse ranges, or exceeds totalPages.
 */
export function parsePageRange(
  rangeStr: string | null | undefined,
  totalPages: number | null | undefined,
): number[] {
  if (!rangeStr || rangeStr.trim() === '') {
    if (totalPages !== undefined && totalPages !== null && totalPages > 0) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    return [];
  }

  const cleanStr = rangeStr.replace(/\s+/g, '');
  const tokens = cleanStr.split(',');
  const pagesSet = new Set<number>();

  for (const token of tokens) {
    if (token === '') {
      throw new BadRequestException('Invalid page range format');
    }

    if (/^\d+$/.test(token)) {
      const page = parseInt(token, 10);
      if (page < 1) {
        throw new BadRequestException('Page numbers must be positive integers');
      }
      if (totalPages !== undefined && totalPages !== null && page > totalPages) {
        throw new BadRequestException(`Page ${page} exceeds total ${totalPages}`);
      }
      pagesSet.add(page);
    } else if (/^\d+-\d+$/.test(token)) {
      const parts = token.split('-');
      const start = parseInt(parts[0], 10);
      const end = parseInt(parts[1], 10);

      if (start < 1 || end < 1) {
        throw new BadRequestException('Page numbers must be positive integers');
      }
      if (start > end) {
        throw new BadRequestException(`Invalid range ${token}: start page cannot exceed end page`);
      }
      if (totalPages !== undefined && totalPages !== null && end > totalPages) {
        throw new BadRequestException(`Page ${end} exceeds total ${totalPages}`);
      }

      for (let i = start; i <= end; i++) {
        pagesSet.add(i);
      }
    } else {
      throw new BadRequestException('Invalid page range format');
    }
  }

  return Array.from(pagesSet).sort((a, b) => a - b);
}

/**
 * Returns true if the page range string is structurally and logically valid.
 */
export function isValidPageRange(
  rangeStr: string | null | undefined,
  totalPages: number | null | undefined,
): boolean {
  try {
    parsePageRange(rangeStr, totalPages);
    return true;
  } catch {
    return false;
  }
}
