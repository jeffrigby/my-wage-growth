import { Context } from 'aws-lambda';
import { injectLambdaContext } from '@aws-lambda-powertools/logger/middleware';
import { parser } from '@aws-lambda-powertools/parser/middleware';
import middy from '@middy/core';
import { z } from 'zod';
import { getLogger } from '@/lib/logger';
import { getWageGrowthConfig } from '@/lib/aws.appconfig';
import { fetchAllCpiData, CpiSeriesIdUK } from '@/lib/uk-ons-api';
import {
  CPILambdaResponse,
  SeriesMapping,
  transformMultiSeriesCpiData,
  saveRawCpiData,
  saveProcessedCpiData,
  validateCpiData,
  validateProcessedCpiData,
} from '@/lib/cpi-shared';
import { checkEnvVar } from '@/lib/utils';

const WAGE_GROWTH_BUCKET = checkEnvVar('WAGE_GROWTH_BUCKET');

const logger = getLogger();

const cpiExportEventSchema = z.object({
  seriesIds: z
    .array(z.string())
    .min(1, 'At least one series ID is required')
    .max(50, 'Maximum 50 series IDs allowed')
    .optional()
    .default(['CPI_UK_ALL'])
    .refine(
      (keys) => {
        // Validate that all keys exist in the enum
        return keys.every((key) => key in CpiSeriesIdUK);
      },
      (keys) => {
        const invalidKey = keys.find((key) => !(key in CpiSeriesIdUK));
        return {
          message: `Invalid series ID: ${invalidKey}. Must be one of: ${Object.keys(CpiSeriesIdUK).join(', ')}`,
        };
      },
    )
    .transform((keys): SeriesMapping<CpiSeriesIdUK>[] => {
      return keys.map((key) => {
        // Keys are already validated by refine, safe to transform
        return {
          key,
          enumValue: CpiSeriesIdUK[key as keyof typeof CpiSeriesIdUK],
        };
      });
    }),
});

type CpiExportEvent = {
  seriesIds: SeriesMapping<CpiSeriesIdUK>[];
};

export const lambdaHandler = async (event: CpiExportEvent, context: Context): Promise<CPILambdaResponse> => {
  try {
    await getWageGrowthConfig(); // Ensure config is loaded
    const { seriesIds } = event;

    // Note: ONS API doesn't require authentication
    const onsData = await fetchAllCpiData(seriesIds.map((e) => e.enumValue));

    // Validate raw data before processing
    const rawValidation = validateCpiData(onsData, seriesIds);

    // Log validation results
    if (rawValidation.warnings.length > 0) {
      logger.warn('Data validation warnings for raw ONS CPIH data', {
        warnings: rawValidation.warnings,
        seriesWithData: rawValidation.seriesWithData,
        totalRequested: seriesIds.length,
      });
    }

    if (!rawValidation.isValid) {
      logger.error('Critical data validation errors for raw ONS CPIH data', {
        errors: rawValidation.errors,
        seriesWithoutData: rawValidation.seriesWithoutData,
      });
      throw new Error(`Data validation failed: ${rawValidation.errors.join(', ')}`);
    }

    // Save raw data for troubleshooting
    const rawKeys = await saveRawCpiData(onsData, seriesIds, 'uk', 'ONS CPIH Series');

    // Transform the data into simplified format
    const simplifiedData = transformMultiSeriesCpiData(
      onsData,
      seriesIds.map((e) => e.enumValue),
      'ONS CPIH Series',
    );

    // Validate processed data before saving
    const processedValidation = validateProcessedCpiData(simplifiedData, seriesIds);

    // Log validation results for processed data
    if (processedValidation.warnings.length > 0) {
      logger.warn('Data validation warnings for processed ONS CPIH data', {
        warnings: processedValidation.warnings,
        seriesWithData: processedValidation.seriesWithData,
        totalRequested: seriesIds.length,
      });
    }

    if (!processedValidation.isValid) {
      logger.error('Critical data validation errors for processed ONS CPIH data', {
        errors: processedValidation.errors,
        seriesWithoutData: processedValidation.seriesWithoutData,
      });
      throw new Error(`Processed data validation failed: ${processedValidation.errors.join(', ')}`);
    }

    const totalMonths = Object.values(simplifiedData.series).reduce(
      (total, series) => total + Object.keys(series.months).length,
      0,
    );

    logger.info('ONS CPIH Data fetched and transformed', {
      requestedSeries: seriesIds.length,
      originalDataPoints: onsData.length,
      seriesProcessed: Object.keys(simplifiedData.series).length,
      totalMonthsAcrossAllSeries: totalMonths,
      validationResult: {
        seriesWithData: processedValidation.seriesWithData,
        totalDataPoints: processedValidation.totalDataPoints,
        warningCount: processedValidation.warnings.length,
      },
    });

    // Save processed data to S3
    const keys = await saveProcessedCpiData(simplifiedData, seriesIds, 'uk', 'ONS CPIH');

    return {
      status: 'success',
      message: `UK CPIH Data for ${seriesIds.length} series downloaded and transformed successfully`,
      bucket: WAGE_GROWTH_BUCKET,
      keys,
      rawKeys,
    };
  } catch (error) {
    logger.error('Error downloading UK CPIH data', { error, event, context });
    return {
      status: 'error',
      message: 'Failed to download UK CPIH data',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  } finally {
    // Clean up resources if needed
  }
};

export const handler = middy(lambdaHandler)
  .use(parser({ schema: cpiExportEventSchema }))
  .use(injectLambdaContext(logger, { logEvent: true }));
