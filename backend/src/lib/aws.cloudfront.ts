import { CloudFrontClient, CreateInvalidationCommand, CreateInvalidationResult } from '@aws-sdk/client-cloudfront';
import { getLogger } from '@/lib/logger';

const logger = getLogger();

const cloudFrontClient = new CloudFrontClient();

/**
 * Creates a CloudFront cache invalidation for the specified paths.
 *
 * @param distributionId - The CloudFront distribution ID
 * @param paths - Array of paths to invalidate (e.g., ['/cpi/processed/us/*'])
 * @returns - A promise that resolves to the invalidation result
 * @throws - Throws an error if unable to create the invalidation
 */
export const invalidateCache = async (distributionId: string, paths: string[]): Promise<CreateInvalidationResult> => {
  const callerReference = `invalidation-${Date.now()}`;

  logger.info('Creating CloudFront cache invalidation', {
    distributionId,
    paths,
    callerReference,
  });

  try {
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
  } catch (error) {
    logger.error('Error creating CloudFront cache invalidation', {
      error,
      distributionId,
      paths,
    });
    throw error;
  }
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
  // naturally; invalidateCache has already logged the underlying error.
  try {
    return await invalidateCache(distributionId, paths);
  } catch {
    return null;
  }
};
