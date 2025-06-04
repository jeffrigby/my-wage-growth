import { Context } from 'aws-lambda';
import { injectLambdaContext } from '@aws-lambda-powertools/logger/middleware';
import { parser } from '@aws-lambda-powertools/parser/middleware';
import middy from '@middy/core';
import { z } from 'zod';
import { getLogger } from '@/lib/logger';
import { getWageGrowthConfig } from '@/lib/aws.appconfig';
import { fetchAllCpiData, CpiSeriesIdCanada } from '@/lib/stats-canada-api';
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
    .default(['CPI_CA_ALL'])
    .transform((keys): SeriesMapping<CpiSeriesIdCanada>[] => {
      return keys.map((key) => {
        // Validate that the key exists in the enum
        if (!(key in CpiSeriesIdCanada)) {
          throw new Error(`Invalid series ID: ${key}. Must be one of: ${Object.keys(CpiSeriesIdCanada).join(', ')}`);
        }
        // Return both the original key and the enum value
        return {
          key,
          enumValue: CpiSeriesIdCanada[key as keyof typeof CpiSeriesIdCanada],
        };
      });
    }),
});

type CpiExportEvent = {
  seriesIds: SeriesMapping<CpiSeriesIdCanada>[];
};

export const lambdaHandler = async (event: CpiExportEvent, context: Context): Promise<CPILambdaResponse> => {
  try {
    await getWageGrowthConfig(); // Ensure config is loaded
    const { seriesIds } = event;

    // Note: Statistics Canada API doesn't require authentication
    const statsCanData = await fetchAllCpiData(seriesIds.map((e) => e.enumValue));

    // Validate raw data before processing
    const rawValidation = validateCpiData(statsCanData, seriesIds);

    // Log validation results
    if (rawValidation.warnings.length > 0) {
      logger.warn('Data validation warnings for raw Statistics Canada data', {
        warnings: rawValidation.warnings,
        seriesWithData: rawValidation.seriesWithData,
        totalRequested: seriesIds.length,
      });
    }

    if (!rawValidation.isValid) {
      logger.error('Critical data validation errors for raw Statistics Canada data', {
        errors: rawValidation.errors,
        seriesWithoutData: rawValidation.seriesWithoutData,
      });
      throw new Error(`Data validation failed: ${rawValidation.errors.join(', ')}`);
    }

    // Save raw data for troubleshooting
    const rawKeys = await saveRawCpiData(statsCanData, seriesIds, 'ca', 'Statistics Canada Series');

    // Transform the data into simplified format
    const simplifiedData = transformMultiSeriesCpiData(
      statsCanData,
      seriesIds.map((e) => e.enumValue),
      'Statistics Canada Series',
    );

    // Validate processed data before saving
    const processedValidation = validateProcessedCpiData(simplifiedData, seriesIds);

    // Log validation results for processed data
    if (processedValidation.warnings.length > 0) {
      logger.warn('Data validation warnings for processed Statistics Canada data', {
        warnings: processedValidation.warnings,
        seriesWithData: processedValidation.seriesWithData,
        totalRequested: seriesIds.length,
      });
    }

    if (!processedValidation.isValid) {
      logger.error('Critical data validation errors for processed Statistics Canada data', {
        errors: processedValidation.errors,
        seriesWithoutData: processedValidation.seriesWithoutData,
      });
      throw new Error(`Processed data validation failed: ${processedValidation.errors.join(', ')}`);
    }

    const totalMonths = Object.values(simplifiedData.series).reduce(
      (total, series) => total + Object.keys(series.months).length,
      0,
    );

    logger.info('Statistics Canada Data fetched and transformed', {
      requestedSeries: seriesIds.length,
      originalDataPoints: statsCanData.length,
      seriesProcessed: Object.keys(simplifiedData.series).length,
      totalMonthsAcrossAllSeries: totalMonths,
      validationResult: {
        seriesWithData: processedValidation.seriesWithData,
        totalDataPoints: processedValidation.totalDataPoints,
        warningCount: processedValidation.warnings.length,
      },
    });

    // Save processed data to S3
    const keys = await saveProcessedCpiData(simplifiedData, seriesIds, 'ca', 'Statistics Canada');

    return {
      status: 'success',
      message: `Canadian CPI Data for ${seriesIds.length} series downloaded and transformed successfully`,
      bucket: WAGE_GROWTH_BUCKET,
      keys,
      rawKeys,
    };
  } catch (error) {
    logger.error('Error downloading Canadian CPI data', { error, event, context });
    return {
      status: 'error',
      message: 'Failed to download Canadian CPI data',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  } finally {
    // Clean up resources if needed
  }
};

export const handler = middy(lambdaHandler)
  .use(parser({ schema: cpiExportEventSchema }))
  .use(injectLambdaContext(logger, { logEvent: true }));
