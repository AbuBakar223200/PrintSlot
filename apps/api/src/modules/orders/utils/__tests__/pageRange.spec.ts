import { parsePageRange, isValidPageRange } from '../pageRange';
import { BadRequestException } from '@nestjs/common';

describe('Server pageRange Utility', () => {
  it('1. parsePageRange("1-3", 10) returns [1, 2, 3]', () => {
    expect(parsePageRange('1-3', 10)).toEqual([1, 2, 3]);
  });

  it('2. parsePageRange("1,3,5", 10) returns [1, 3, 5]', () => {
    expect(parsePageRange('1,3,5', 10)).toEqual([1, 3, 5]);
  });

  it('3. parsePageRange("1-3,5-7", 10) returns [1, 2, 3, 5, 6, 7]', () => {
    expect(parsePageRange('1-3,5-7', 10)).toEqual([1, 2, 3, 5, 6, 7]);
  });

  it('4. parsePageRange("abc", 10) throws BadRequestException', () => {
    expect(() => parsePageRange('abc', 10)).toThrow(BadRequestException);
  });

  it('5. parsePageRange("1-15", 10) throws Page 15 exceeds total 10', () => {
    expect(() => parsePageRange('1-15', 10)).toThrow(BadRequestException);
  });

  it('6. parsePageRange("", 10) returns full range [1..10]', () => {
    expect(parsePageRange('', 10)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(parsePageRange(null, 10)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it('7. parsePageRange("5-3", 10) throws (reverse range)', () => {
    expect(() => parsePageRange('5-3', 10)).toThrow(BadRequestException);
  });

  it('8. parsePageRange("1-3, 5 ", 10) strips whitespace and parses correctly', () => {
    expect(parsePageRange('1-3,  5 ', 10)).toEqual([1, 2, 3, 5]);
  });

  it('9. parsePageRange("1-3,2", 10) handles duplicates correctly', () => {
    expect(parsePageRange('1-3,2', 10)).toEqual([1, 2, 3]);
  });

  it('10. parsePageRange("1-3", null) ignores bounds check when totalPages is null', () => {
    expect(parsePageRange('1-3', null)).toEqual([1, 2, 3]);
  });

  it('11. parsePageRange("0-3", 10) throws positive integer error', () => {
    expect(() => parsePageRange('0-3', 10)).toThrow(BadRequestException);
  });

  it('12. isValidPageRange returns boolean status', () => {
    expect(isValidPageRange('1-3', 10)).toBe(true);
    expect(isValidPageRange('1-15', 10)).toBe(false);
    expect(isValidPageRange('abc', 10)).toBe(false);
  });
});
