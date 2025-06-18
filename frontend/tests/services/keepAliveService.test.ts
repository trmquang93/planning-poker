import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock fetch globally before importing the service
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock environment variables
vi.mock('../../src/services/keepAliveService', async () => {
  const actual = await vi.importActual('../../src/services/keepAliveService');
  return actual;
});

import { keepAliveService } from '../../src/services/keepAliveService';

// Mock timers
vi.useFakeTimers();

describe('KeepAliveService', () => {
  beforeEach(() => {
    vi.clearAllTimers();
    mockFetch.mockClear();
    keepAliveService.stop(); // Ensure clean state
  });

  afterEach(() => {
    keepAliveService.stop();
    vi.clearAllTimers();
  });

  describe('Production behavior', () => {
    beforeEach(() => {
      // Mock HTTPS environment (production)
      Object.defineProperty(window, 'location', {
        value: {
          protocol: 'https:',
        },
        writable: true,
      });
    });

    it('should start in production environment', () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ status: 'alive', uptime: 100 }),
      });

      keepAliveService.start();
      
      expect(keepAliveService.active).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/keep-alive'),
        expect.objectContaining({
          method: 'GET',
          credentials: 'omit',
        })
      );
    });

    it('should send periodic pings', () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ status: 'alive', uptime: 100 }),
      });

      keepAliveService.start();
      
      // Initial ping
      expect(mockFetch).toHaveBeenCalledTimes(1);
      
      // Advance time by 10 minutes
      vi.advanceTimersByTime(10 * 60 * 1000);
      
      // Should have sent another ping
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should handle failed pings gracefully', () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      keepAliveService.start();
      
      // Should still be active even if ping fails
      expect(keepAliveService.active).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should stop pings when stopped', () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ status: 'alive', uptime: 100 }),
      });

      keepAliveService.start();
      expect(keepAliveService.active).toBe(true);
      
      keepAliveService.stop();
      expect(keepAliveService.active).toBe(false);
      
      const callsBeforeStop = mockFetch.mock.calls.length;
      
      // Advance time - should not send more pings
      vi.advanceTimersByTime(10 * 60 * 1000);
      
      expect(mockFetch).toHaveBeenCalledTimes(callsBeforeStop);
    });
  });

  describe('Development behavior', () => {
    beforeEach(() => {
      // Mock HTTP environment (development)
      Object.defineProperty(window, 'location', {
        value: {
          protocol: 'http:',
        },
        writable: true,
      });
    });

    it('should not start in development environment', () => {
      keepAliveService.start();
      
      expect(keepAliveService.active).toBe(false);
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('Configuration', () => {
    it('should have correct interval in minutes', () => {
      expect(keepAliveService.intervalMinutes).toBe(10);
    });

    it('should not start if already active', () => {
      // Mock production environment
      Object.defineProperty(window, 'location', {
        value: {
          protocol: 'https:',
        },
        writable: true,
      });

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ status: 'alive', uptime: 100 }),
      });

      keepAliveService.start();
      const firstCallCount = mockFetch.mock.calls.length;
      
      keepAliveService.start(); // Try to start again
      
      // Should not make additional calls
      expect(mockFetch).toHaveBeenCalledTimes(firstCallCount);
    });
  });
});