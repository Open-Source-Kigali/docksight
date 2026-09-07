import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  copyToClipboard,
  formatBytes,
  formatDateTime,
  formatPercent,
  formatRelativeTime,
  initialsFor,
  osLabel,
  shortId,
  shortImage,
} from './format';

describe('format', () => {
  describe('formatDateTime', () => {
    it('returns "Never" for null, undefined, or empty values', () => {
      expect(formatDateTime(null)).toBe('Never');
      expect(formatDateTime(undefined)).toBe('Never');
      expect(formatDateTime('')).toBe('Never');
    });

    it('returns original raw value when date parsing fails', () => {
      expect(formatDateTime('invalid-date-string')).toBe('invalid-date-string');
    });

    it('formats a valid date string', () => {
      const result = formatDateTime('2026-01-15T10:30:00Z');
      expect(result).not.toBe('Never');
      expect(result).toContain('2026');
    });
  });

  describe('formatRelativeTime', () => {
    const NOW = new Date('2026-01-01T12:00:00Z').getTime();

    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(NOW);
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('returns "Never" for null, undefined, or empty values', () => {
      expect(formatRelativeTime(null)).toBe('Never');
      expect(formatRelativeTime(undefined)).toBe('Never');
      expect(formatRelativeTime('')).toBe('Never');
    });

    it('returns original raw value when date parsing fails', () => {
      expect(formatRelativeTime('not-a-date')).toBe('not-a-date');
    });

    it('returns "just now" for future dates (clock drift safety)', () => {
      const futureDate = new Date(NOW + 5000).toISOString();
      expect(formatRelativeTime(futureDate)).toBe('just now');
    });

    it('formats past times into appropriate relative units', () => {
      const tenSecsAgo = new Date(NOW - 10 * 1000).toISOString();
      expect(formatRelativeTime(tenSecsAgo)).toMatch(/10 sec/);

      const fiveMinsAgo = new Date(NOW - 5 * 60 * 1000).toISOString();
      expect(formatRelativeTime(fiveMinsAgo)).toMatch(/5 min/);

      const twoHoursAgo = new Date(NOW - 2 * 60 * 60 * 1000).toISOString();
      expect(formatRelativeTime(twoHoursAgo)).toMatch(/2 hr|2 hour/);
    });
  });

  describe('shortId', () => {
    it('returns "—" for empty strings or falsy inputs', () => {
      expect(shortId('')).toBe('—');
    });

    it('truncates IDs longer than default length (12)', () => {
      expect(shortId('1234567890123456')).toBe('123456789012');
    });

    it('returns full ID if shorter than maximum length', () => {
      expect(shortId('abc-123')).toBe('abc-123');
    });

    it('respects custom length overrides', () => {
      expect(shortId('1234567890123456', 5)).toBe('12345');
    });
  });

  describe('shortImage', () => {
    it('returns "—" for empty strings', () => {
      expect(shortImage('')).toBe('—');
    });

    it('leaves simple image names intact', () => {
      expect(shortImage('nginx:latest')).toBe('nginx:latest');
    });

    it('strips registry domain and keeps last two path segments', () => {
      expect(shortImage('registry.example.com/team/app:tag')).toBe(
        'team/app:tag',
      );
      expect(shortImage('docker.io/library/ubuntu:22.04')).toBe(
        'library/ubuntu:22.04',
      );
    });
  });
  describe('formatBytes', () => {
    it('returns "0 B" for 0, negative numbers, NaN, or non-finite inputs', () => {
      expect(formatBytes(0)).toBe('0 B');
      expect(formatBytes(-500)).toBe('0 B');
      expect(formatBytes(NaN)).toBe('0 B');
      expect(formatBytes(Infinity)).toBe('0 B');
    });

    it('formats byte-level amounts accurately', () => {
      expect(formatBytes(500)).toBe('500 B');
    });

    it('formats KB, MB, GB, and TB scaling with rounding rules', () => {
      expect(formatBytes(1536)).toBe('1.5 KB');
      expect(formatBytes(10240)).toBe('10 KB');
      expect(formatBytes(1048576)).toBe('1.0 MB');
      expect(formatBytes(1073741824)).toBe('1.0 GB');
    });
  });

  describe('osLabel', () => {
    it('returns "Unknown" or fallback for empty/unrecognized OS strings', () => {
      expect(osLabel('')).toBe('Unknown');
      expect(osLabel('FreeBSD')).toBe('FreeBSD');
    });

    it('identifies OS platforms case-insensitively', () => {
      expect(osLabel('win32')).toBe('Windows');
      expect(osLabel('WINDOWS_NT')).toBe('Windows');
      expect(osLabel('macOS')).toBe('macOS');
      expect(osLabel('Mac OS X')).toBe('macOS');
      expect(osLabel('linux-x64')).toBe('Linux');
    });
  });

  describe('formatPercent', () => {
    it('rounds percentage numbers to nearest integer', () => {
      expect(formatPercent(50)).toBe('50%');
      expect(formatPercent(45.6)).toBe('46%');
      expect(formatPercent(45.4)).toBe('45%');
    });
  });
  describe('copyToClipboard', () => {
    it('returns true when writeText succeeds', async () => {
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      vi.stubGlobal('navigator', { clipboard: { writeText: writeTextMock } });

      const result = await copyToClipboard('test string');
      expect(result).toBe(true);
      expect(writeTextMock).toHaveBeenCalledWith('test string');

      vi.unstubAllGlobals();
    });

    it('returns false when clipboard write throws an error', async () => {
      const writeTextMock = vi
        .fn()
        .mockRejectedValue(new Error('Permission denied'));
      vi.stubGlobal('navigator', { clipboard: { writeText: writeTextMock } });

      const result = await copyToClipboard('test string');
      expect(result).toBe(false);

      vi.unstubAllGlobals();
    });
  });

  describe('initialsFor', () => {
    it('returns "??" when email is missing or empty', () => {
      expect(initialsFor(undefined)).toBe('??');
      expect(initialsFor('')).toBe('??');
    });

    it('returns first two letters for single-word local email parts', () => {
      expect(initialsFor('sam@x.io')).toBe('SA');
      expect(initialsFor('a@x.io')).toBe('A');
    });

    it('extracts initial letters from delimited email parts', () => {
      expect(initialsFor('sam.r@x.io')).toBe('SR');
      expect(initialsFor('john-doe@x.io')).toBe('JD');
      expect(initialsFor('jane_smith@x.io')).toBe('JS');
      expect(initialsFor('alex.b.c@x.io')).toBe('AB');
    });
  });
});
