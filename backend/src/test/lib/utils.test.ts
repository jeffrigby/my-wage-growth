import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { checkEnvVar } from '@/lib/utils';

describe('utils', () => {
  describe('checkEnvVar', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      // Reset process.env for each test
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      // Restore original environment
      process.env = originalEnv;
    });

    it('should return the environment variable value when it exists', () => {
      process.env.TEST_VAR = 'test-value';

      const result = checkEnvVar('TEST_VAR');

      expect(result).toBe('test-value');
    });

    it('should return the default value when environment variable is not defined', () => {
      delete process.env.TEST_VAR;

      const result = checkEnvVar('TEST_VAR', 'default-value');

      expect(result).toBe('default-value');
    });

    it('should return empty string when environment variable is not defined and no default provided', () => {
      delete process.env.TEST_VAR;

      expect(() => checkEnvVar('TEST_VAR')).toThrow("Environment variable 'TEST_VAR' is not defined");
    });

    it('should return environment variable even when default is provided', () => {
      process.env.TEST_VAR = 'env-value';

      const result = checkEnvVar('TEST_VAR', 'default-value');

      expect(result).toBe('env-value');
    });

    it('should handle empty string environment variables', () => {
      process.env.TEST_VAR = '';

      const result = checkEnvVar('TEST_VAR', 'default-value');

      expect(result).toBe('');
    });

    it('should handle undefined environment variables with empty string default', () => {
      delete process.env.TEST_VAR;

      expect(() => checkEnvVar('TEST_VAR', '')).toThrow("Environment variable 'TEST_VAR' is not defined");
    });

    it('should work with numeric-like string values', () => {
      process.env.PORT = '3000';

      const result = checkEnvVar('PORT');

      expect(result).toBe('3000');
    });
  });
});
