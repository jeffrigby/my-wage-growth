import { describe, it, expect } from 'vitest';
import { getLogger } from '@/lib/logger';

describe('logger', () => {
  describe('getLogger', () => {
    it('should return a logger instance', () => {
      const logger = getLogger();

      expect(logger).toBeDefined();
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.error).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.debug).toBe('function');
    });

    it('should return the same logger instance on multiple calls', () => {
      const logger1 = getLogger();
      const logger2 = getLogger();

      expect(logger1).toBe(logger2);
    });

    it('should be able to log messages without throwing errors', () => {
      const logger = getLogger();

      // These should not throw errors
      expect(() => {
        logger.info('Test info message');
        logger.warn('Test warning message');
        logger.error('Test error message');
        logger.debug('Test debug message');
      }).not.toThrow();
    });
  });
});
