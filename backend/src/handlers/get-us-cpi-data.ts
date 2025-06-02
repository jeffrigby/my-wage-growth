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
    .transform((keys): SeriesMapping[] => {
      return keys.map((key) => {
        // Validate that the key exists in the enum
        if (!(key in CpiSeriesId)) {
          throw new Error(`Invalid series ID: ${key}. Must be one of: ${Object.keys(CpiSeriesId).join(', ')}`);
        }
        // Return both the original key and the enum value
        return {
          key,
          enumValue: CpiSeriesId[key as keyof typeof CpiSeriesId],
        };
      });
    }),
});

type CpiExportEvent = {
  seriesIds: SeriesMapping[];
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

    // Save raw data for troubleshooting
    const rawKeys = await saveRawCpiData(blsData, seriesIds, 'us', 'BLS Series');

    // Transform the data into simplified format
    const simplifiedData = transformMultiSeriesCpiData(
      blsData,
      seriesIds.map((e) => e.enumValue),
      'BLS Series',
    );

    const totalMonths = Object.values(simplifiedData.series).reduce(
      (total, series) => total + Object.keys(series.months).length,
      0,
    );

    logger.info('BLS Data fetched and transformed', {
      requestedSeries: seriesIds.length,
      originalDataPoints: blsData.length,
      seriesProcessed: Object.keys(simplifiedData.series).length,
      totalMonthsAcrossAllSeries: totalMonths,
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
