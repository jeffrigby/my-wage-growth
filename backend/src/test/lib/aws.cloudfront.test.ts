import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import { CloudFrontClient, CreateInvalidationCommand } from '@aws-sdk/client-cloudfront';
import { invalidateCache, invalidateCPICache } from '@/lib/aws.cloudfront';

const cloudFrontMock = mockClient(CloudFrontClient);

describe('aws.cloudfront', () => {
  beforeEach(() => {
    cloudFrontMock.reset();
    vi.clearAllMocks();
  });

  describe('invalidateCache', () => {
    it('sends a CreateInvalidationCommand with the given distribution and paths', async () => {
      cloudFrontMock.on(CreateInvalidationCommand).resolves({
        Invalidation: { Id: 'I-123', Status: 'InProgress', CreateTime: new Date(), InvalidationBatch: undefined },
      });

      const result = await invalidateCache('DIST123', ['/cpi/processed/us/*']);

      const calls = cloudFrontMock.commandCalls(CreateInvalidationCommand);
      expect(calls).toHaveLength(1);

      const { input } = calls[0].args[0];
      expect(input.DistributionId).toBe('DIST123');
      expect(input.InvalidationBatch?.Paths?.Quantity).toBe(1);
      expect(input.InvalidationBatch?.Paths?.Items).toEqual(['/cpi/processed/us/*']);
      expect(input.InvalidationBatch?.CallerReference).toMatch(/^invalidation-\d+$/);
      expect(result.Invalidation?.Id).toBe('I-123');
    });

    it('propagates errors from the CloudFront client', async () => {
      cloudFrontMock.on(CreateInvalidationCommand).rejects(new Error('AccessDenied'));

      await expect(invalidateCache('DIST123', ['/x/*'])).rejects.toThrow('AccessDenied');
    });
  });

  describe('invalidateCPICache', () => {
    const originalDistId = process.env.CLOUDFRONT_DISTRIBUTION_ID;

    afterEach(() => {
      if (originalDistId === undefined) {
        delete process.env.CLOUDFRONT_DISTRIBUTION_ID;
      } else {
        process.env.CLOUDFRONT_DISTRIBUTION_ID = originalDistId;
      }
    });

    it('returns null and skips CloudFront when the distribution id is not configured', async () => {
      delete process.env.CLOUDFRONT_DISTRIBUTION_ID;

      const result = await invalidateCPICache('us');

      expect(result).toBeNull();
      expect(cloudFrontMock.commandCalls(CreateInvalidationCommand)).toHaveLength(0);
    });

    it('invalidates the country-scoped CPI path when configured', async () => {
      process.env.CLOUDFRONT_DISTRIBUTION_ID = 'DIST999';
      cloudFrontMock.on(CreateInvalidationCommand).resolves({ Invalidation: { Id: 'I-9', Status: 'InProgress' } });

      const result = await invalidateCPICache('ca');

      const calls = cloudFrontMock.commandCalls(CreateInvalidationCommand);
      expect(calls).toHaveLength(1);
      expect(calls[0].args[0].input.DistributionId).toBe('DIST999');
      expect(calls[0].args[0].input.InvalidationBatch?.Paths?.Items).toEqual(['/cpi/processed/ca/*']);
      expect(result?.Invalidation?.Id).toBe('I-9');
    });

    it('is best-effort: resolves to null (does not throw) when invalidation fails', async () => {
      process.env.CLOUDFRONT_DISTRIBUTION_ID = 'DIST999';
      cloudFrontMock.on(CreateInvalidationCommand).rejects(new Error('TooManyInvalidationsInProgress'));

      await expect(invalidateCPICache('uk')).resolves.toBeNull();
    });
  });
});
