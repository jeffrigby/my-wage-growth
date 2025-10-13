import { Context } from 'aws-lambda';
import { injectLambdaContext } from '@aws-lambda-powertools/logger/middleware';
import { parser } from '@aws-lambda-powertools/parser/middleware';
import middy from '@middy/core';
import { z } from 'zod';
import { getLogger } from '@/lib/logger';
import { getWageGrowthConfig } from '@/lib/aws.appconfig';
import { fetchMultipleCpiData, CpiSeriesId } from '@/lib/bls-api';
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
  startYear: z.number().min(1913).max(new Date().getFullYear()).optional().default(1913),
  endYear: z.number().min(1913).max(new Date().getFullYear()).optional().default(new Date().getFullYear()),
  seriesIds: z
    .array(z.string())
    .min(1, 'At least one series ID is required')
    .max(50, 'Maximum 50 series IDs allowed')
    .optional()
    .default(['CPI_U_ALL'])
    .refine(
      (keys) => {
        // Validate that all keys exist in the enum
        return keys.every((key) => key in CpiSeriesId);
      },
      (keys) => {
        const invalidKey = keys.find((key) => !(key in CpiSeriesId));
        return {
          message: `Invalid series ID: ${invalidKey}. Must be one of: ${Object.keys(CpiSeriesId).join(', ')}`,
        };
      },
    )
    .transform((keys): SeriesMapping<CpiSeriesId>[] => {
      return keys.map((key) => {
        // Keys are already validated by refine, safe to transform
        return {
          key,
          enumValue: CpiSeriesId[key as keyof typeof CpiSeriesId],
        };
      });
    }),
});

type CpiExportEvent = {
  seriesIds: SeriesMapping<CpiSeriesId>[];
};

export const lambdaHandler = async (event: CpiExportEvent, context: Context): Promise<CPILambdaResponse> => {
  try {
    const config = await getWageGrowthConfig();
    const { seriesIds } = event;
    const { blsApiKey } = config;

    if (!blsApiKey) {
      throw new Error('BLS API key is not set');
    }

    const blsData = await fetchMultipleCpiData(
      blsApiKey,
      seriesIds.map((e) => e.enumValue),
    );

    // Validate raw data before processing
    const rawValidation = validateCpiData(blsData, seriesIds);

    // Log validation results
    if (rawValidation.warnings.length > 0) {
      logger.warn('Data validation warnings for raw BLS data', {
        warnings: rawValidation.warnings,
        seriesWithData: rawValidation.seriesWithData,
        totalRequested: seriesIds.length,
      });
    }

    if (!rawValidation.isValid) {
      logger.error('Critical data validation errors for raw BLS data', {
        errors: rawValidation.errors,
        seriesWithoutData: rawValidation.seriesWithoutData,
      });
      throw new Error(`Data validation failed: ${rawValidation.errors.join(', ')}`);
    }

    // Save raw data for troubleshooting
    const rawKeys = await saveRawCpiData(blsData, seriesIds, 'us', 'BLS Series');

    // Transform the data into simplified format
    const simplifiedData = transformMultiSeriesCpiData(
      blsData,
      seriesIds.map((e) => e.enumValue),
      'BLS Series',
    );

    // Validate processed data before saving
    const processedValidation = validateProcessedCpiData(simplifiedData, seriesIds);

    // Log validation results for processed data
    if (processedValidation.warnings.length > 0) {
      logger.warn('Data validation warnings for processed BLS data', {
        warnings: processedValidation.warnings,
        seriesWithData: processedValidation.seriesWithData,
        totalRequested: seriesIds.length,
      });
    }

    if (!processedValidation.isValid) {
      logger.error('Critical data validation errors for processed BLS data', {
        errors: processedValidation.errors,
        seriesWithoutData: processedValidation.seriesWithoutData,
      });
      throw new Error(`Processed data validation failed: ${processedValidation.errors.join(', ')}`);
    }

    const totalMonths = Object.values(simplifiedData.series).reduce(
      (total, series) => total + Object.keys(series.months).length,
      0,
    );

    logger.info('BLS Data fetched and transformed', {
      requestedSeries: seriesIds.length,
      originalDataPoints: blsData.length,
      seriesProcessed: Object.keys(simplifiedData.series).length,
      totalMonthsAcrossAllSeries: totalMonths,
      validationResult: {
        seriesWithData: processedValidation.seriesWithData,
        totalDataPoints: processedValidation.totalDataPoints,
        warningCount: processedValidation.warnings.length,
      },
    });

    // Save processed data to S3
    const keys = await saveProcessedCpiData(simplifiedData, seriesIds, 'us', 'BLS');

    return {
      status: 'success',
      message: `CPI Data for ${seriesIds.length} series downloaded and transformed successfully`,
      bucket: WAGE_GROWTH_BUCKET,
      keys,
      rawKeys,
    };
  } catch (error) {
    logger.error('Error downloading CPI data', { error, event, context });
    return {
      status: 'error',
      message: 'Failed to download CPI data',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  } finally {
    // Clean up resources if needed
  }
};

export const handler = middy(lambdaHandler)
  .use(parser({ schema: cpiExportEventSchema }))
  .use(injectLambdaContext(logger, { logEvent: true }));
