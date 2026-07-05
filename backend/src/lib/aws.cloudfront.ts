import { CloudFrontClient, CreateInvalidationCommand, CreateInvalidationResult } from '@aws-sdk/client-cloudfront';
import { randomUUID } from 'node:crypto';
import { getLogger } from '@/lib/logger';

const logger = getLogger();

const cloudFrontClient = new CloudFrontClient();

/**
 * Creates a CloudFront cache invalidation for the specified paths.
 *
 * @param distributionId - The CloudFront distribution ID
 * @param paths - Array of paths to invalidate (e.g., ['/cpi/processed/us/*'])
 * @returns - A promise that resolves to the invalidation result
 * @throws - Throws (without logging) if unable to create the invalidation, so the
 *   caller decides the severity — a strict caller can log at error, while the
 *   best-effort invalidateCPICache logs at warn.
 */
export const invalidateCache = async (distributionId: string, paths: string[]): Promise<CreateInvalidationResult> => {
  // Include a UUID so concurrent invocations in the same millisecond can't collide
  // on CallerReference (CloudFront rejects a duplicate reference with a different batch).
  const callerReference = `invalidation-${Date.now()}-${randomUUID()}`;

  logger.info('Creating CloudFront cache invalidation', {
    distributionId,
    paths,
    callerReference,
  });

  const command = new CreateInvalidationCommand({
    DistributionId: distributionId,
    InvalidationBatch: {
      CallerReference: callerReference,
      Paths: {
        Quantity: paths.length,
        Items: paths,
      },
    },
  });

  const result = await cloudFrontClient.send(command);

  logger.info('CloudFront cache invalidation created', {
    invalidationId: result.Invalidation?.Id,
    status: result.Invalidation?.Status,
  });

  return result;
};

/**
 * Invalidates CPI data cache for a specific country.
 *
 * @param country - The country code (e.g., 'us', 'ca', 'uk')
 * @returns - A promise that resolves to the invalidation result, or null if no distribution ID configured
 */
export const invalidateCPICache = async (country: string): Promise<CreateInvalidationResult | null> => {
  const distributionId = process.env.CLOUDFRONT_DISTRIBUTION_ID;

  if (!distributionId) {
    logger.warn('CLOUDFRONT_DISTRIBUTION_ID not set, skipping cache invalidation');
    return null;
  }

  const paths = [`/cpi/processed/${country}/*`];

  // Best-effort: a failed invalidation must not fail the caller's data refresh.
  // The processed data is already saved to S3 and the CloudFront cache expires
  // naturally. Log at warn (not error) so an expected, non-fatal outcome — e.g.
  // TooManyInvalidationsInProgress throttling — doesn't inflate the error signal.
  try {
    return await invalidateCache(distributionId, paths);
  } catch (error) {
    logger.warn('CloudFront cache invalidation failed; continuing (best-effort)', {
      error,
      country,
      paths,
    });
    return null;
  }
};
