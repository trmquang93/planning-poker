import { describe, it, expect } from '@jest/globals';
import {
  generateSessionCode,
  generateSessionId,
  generateParticipantId,
  generateStoryId,
  calculateAverage,
  calculateMedian,
  suggestEstimate,
  isValidEstimationValue,
  formatDuration,
  isSessionExpired,
  getSessionExpiryTime,
} from '../src/utils';
import type { EstimationValue } from '../src/types';

describe('Utility Functions', () => {
  describe('ID Generation', () => {
    it('generates session codes with correct format', () => {
      const code = generateSessionCode();
      expect(code).toMatch(/^[A-Z0-9]{6}$/);
      expect(code).toHaveLength(6);
    });

    it('generates unique session codes', () => {
      const codes = Array.from({ length: 100 }, () => generateSessionCode());
      const uniqueCodes = new Set(codes);
      expect(uniqueCodes.size).toBe(100);
    });

    it('generates session IDs with correct prefix', () => {
      const id = generateSessionId();
      expect(id).toMatch(/^session_\d+_[a-z0-9]+$/);
    });

    it('generates participant IDs with correct prefix', () => {
      const id = generateParticipantId();
      expect(id).toMatch(/^participant_\d+_[a-z0-9]+$/);
    });

    it('generates story IDs with correct prefix', () => {
      const id = generateStoryId();
      expect(id).toMatch(/^story_\d+_[a-z0-9]+$/);
    });
  });

  describe('Estimation Calculations', () => {
    describe('calculateAverage', () => {
      it('calculates average of numeric votes', () => {
        const votes: EstimationValue[] = [1, 2, 3, 5, 8];
        expect(calculateAverage(votes)).toBe(3.8);
      });

      it('ignores non-numeric votes', () => {
        const votes: EstimationValue[] = [1, 2, '?', 5, '∞'];
        expect(calculateAverage(votes)).toBeCloseTo(2.67, 2); // (1+2+5)/3 rounded
      });

      it('returns null for no numeric votes', () => {
        const votes: EstimationValue[] = ['?', '∞', 'XS'];
        expect(calculateAverage(votes)).toBeNull();
      });

      it('returns null for empty votes', () => {
        const votes: EstimationValue[] = [];
        expect(calculateAverage(votes)).toBeNull();
      });
    });

    describe('calculateMedian', () => {
      it('calculates median of odd number of votes', () => {
        const votes: EstimationValue[] = [1, 3, 5];
        expect(calculateMedian(votes)).toBe(3);
      });

      it('calculates median of even number of votes', () => {
        const votes: EstimationValue[] = [1, 2, 3, 5];
        expect(calculateMedian(votes)).toBe(2.5);
      });

      it('ignores non-numeric votes', () => {
        const votes: EstimationValue[] = [1, '?', 3, 5];
        expect(calculateMedian(votes)).toBe(3);
      });

      it('returns null for no numeric votes', () => {
        const votes: EstimationValue[] = ['?', 'XS'];
        expect(calculateMedian(votes)).toBeNull();
      });
    });

    describe('suggestEstimate', () => {
      it('returns most frequent vote', () => {
        const votes: EstimationValue[] = [3, 5, 3, 8, 3];
        expect(suggestEstimate(votes)).toBe(3);
      });

      it('returns first most frequent vote when tied', () => {
        const votes: EstimationValue[] = [3, 5, 3, 5];
        expect(suggestEstimate(votes)).toBe(3);
      });

      it('handles string votes', () => {
        const votes: EstimationValue[] = ['?', '∞', '?'];
        expect(suggestEstimate(votes)).toBe('?');
      });

      it('returns null for empty votes', () => {
        const votes: EstimationValue[] = [];
        expect(suggestEstimate(votes)).toBeNull();
      });
    });
  });

  describe('Validation', () => {
    describe('isValidEstimationValue', () => {
      it('validates Fibonacci values', () => {
        expect(isValidEstimationValue(1, 'FIBONACCI')).toBe(true);
        expect(isValidEstimationValue(13, 'FIBONACCI')).toBe(true);
        expect(isValidEstimationValue('?', 'FIBONACCI')).toBe(true);
        expect(isValidEstimationValue('∞', 'FIBONACCI')).toBe(true);
        expect(isValidEstimationValue(4, 'FIBONACCI')).toBe(false);
      });

      it('validates T-shirt values', () => {
        expect(isValidEstimationValue('XS', 'T_SHIRT')).toBe(true);
        expect(isValidEstimationValue('XXL', 'T_SHIRT')).toBe(true);
        expect(isValidEstimationValue('XXXL', 'T_SHIRT')).toBe(false);
      });

      it('rejects invalid types', () => {
        expect(isValidEstimationValue(null, 'FIBONACCI')).toBe(false);
        expect(isValidEstimationValue(undefined, 'FIBONACCI')).toBe(false);
        expect(isValidEstimationValue({}, 'FIBONACCI')).toBe(false);
      });
    });
  });

  describe('Time Utilities', () => {
    describe('formatDuration', () => {
      it('formats duration in minutes', () => {
        const start = new Date('2023-01-01T10:00:00Z');
        const end = new Date('2023-01-01T10:30:00Z');
        expect(formatDuration(start, end)).toBe('30m');
      });

      it('formats duration in hours and minutes', () => {
        const start = new Date('2023-01-01T10:00:00Z');
        const end = new Date('2023-01-01T12:15:00Z');
        expect(formatDuration(start, end)).toBe('2h 15m');
      });

      it('uses current time when end is not provided', () => {
        const start = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes ago
        const result = formatDuration(start);
        expect(result).toMatch(/^30m$|^29m$/); // Allow for slight timing differences
      });
    });

    describe('isSessionExpired', () => {
      it('returns true for past expiry date', () => {
        const pastDate = new Date(Date.now() - 1000);
        expect(isSessionExpired(pastDate)).toBe(true);
      });

      it('returns false for future expiry date', () => {
        const futureDate = new Date(Date.now() + 1000);
        expect(isSessionExpired(futureDate)).toBe(false);
      });
    });

    describe('getSessionExpiryTime', () => {
      it('calculates expiry time with default hours', () => {
        const created = new Date('2023-01-01T10:00:00Z');
        const expiry = getSessionExpiryTime(created);
        expect(expiry).toEqual(new Date('2023-01-01T12:00:00Z'));
      });

      it('calculates expiry time with custom hours', () => {
        const created = new Date('2023-01-01T10:00:00Z');
        const expiry = getSessionExpiryTime(created, 4);
        expect(expiry).toEqual(new Date('2023-01-01T14:00:00Z'));
      });
    });
  });
});