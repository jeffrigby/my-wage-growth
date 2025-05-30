import { Context } from 'aws-lambda';
import { injectLambdaContext } from '@aws-lambda-powertools/logger/middleware';
import { parser } from '@aws-lambda-powertools/parser/middleware';
import middy from '@middy/core';
import { z } from 'zod';
import { getLogger } from '@/lib/logger';
import { getWageGrowthConfig } from '@/lib/aws.appconfig';
import { fetchMultipleCpiData, CpiSeriesId, CpiDataPoint } from '@/lib/bls-api';
import { putS3Object } from '@/lib/aws.s3';
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
    .transform((keys): { key: string; enumValue: CpiSeriesId }[] => {
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

type SimplifiedCpiData = {
  lastUpdated: string;
  source: string;
  months: Record<string, number>;
};

type MultiSeriesSimplifiedCpiData = {
  lastUpdated: string;
  sources: string[];
  series: Record<string, SimplifiedCpiData>;
};

type CpiExportEvent = {
  seriesIds: { key: string; enumValue: CpiSeriesId }[];
};

type CPILambdaResponse = {
  status: string;
  message: string;
  bucket?: string;
  keys?: string[];
  error?: string;
  data?: MultiSeriesSimplifiedCpiData;
};

/**
 * Transforms BLS CPI data into a simplified format for quick lookups
 * @param cpiData Array of CPI data points from BLS API
 * @param seriesId The series ID used for the data
 * @returns Simplified CPI data structure
 */
function transformCpiDataForLookup(cpiData: CpiDataPoint[], seriesId: CpiSeriesId): SimplifiedCpiData {
  const months: Record<string, number> = {};

  // Convert each data point to YYYY-MM format with CPI value
  for (const dataPoint of cpiData) {
    // Format date as YYYY-MM for easy lookup
    const year = dataPoint.date.getFullYear();
    const month = (dataPoint.date.getMonth() + 1).toString().padStart(2, '0');
    const monthKey = `${year}-${month}`;
    months[monthKey] = dataPoint.value;
  }

  return {
    lastUpdated: new Date().toISOString(),
    source: `BLS Series ${seriesId}`,
    months,
  };
}

/**
 * Transforms multiple series CPI data into a structured format
 * @param cpiData Array of CPI data points from BLS API for multiple series
 * @param seriesIds Array of series IDs that were requested
 * @returns Multi-series simplified CPI data structure
 */
function transformMultiSeriesCpiData(cpiData: CpiDataPoint[], seriesIds: CpiSeriesId[]): MultiSeriesSimplifiedCpiData {
  const series: Record<string, SimplifiedCpiData> = {};
  const sources: string[] = [];

  // Group data by series ID
  const dataBySeriesId = new Map<string, CpiDataPoint[]>();
  for (const dataPoint of cpiData) {
    if (!dataBySeriesId.has(dataPoint.seriesId)) {
      dataBySeriesId.set(dataPoint.seriesId, []);
    }
    dataBySeriesId.get(dataPoint.seriesId)!.push(dataPoint);
  }

  // Transform each series
  for (const seriesId of seriesIds) {
    const seriesData = dataBySeriesId.get(seriesId) || [];
    const transformedData = transformCpiDataForLookup(seriesData, seriesId);
    series[seriesId] = transformedData;
    sources.push(transformedData.source);
  }

  return {
    lastUpdated: new Date().toISOString(),
    sources,
    series,
  };
}

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

    // Transform the data into simplified format
    const simplifiedData = transformMultiSeriesCpiData(
      blsData,
      seriesIds.map((e) => e.enumValue),
    );

    logger.info('BLS Data fetched and transformed', {
      requestedSeries: seriesIds.length,
      originalDataPoints: blsData.length,
      seriesProcessed: Object.keys(simplifiedData.series).length,
      totalMonthsAcrossAllSeries: Object.values(simplifiedData.series).reduce(
        (total, series) => total + Object.keys(series.months).length,
        0,
      ),
    });
    // Upload each series to s3
    const keys: string[] = [];
    for (const series of seriesIds) {
      const simplifiedSeriesData = simplifiedData.series[series.enumValue];
      const s3Key = `data/${series.key}.json`;
      keys.push(s3Key);
      logger.info('Uploading CPI data to S3', {
        bucket: WAGE_GROWTH_BUCKET,
        key: s3Key,
      });
      await putS3Object({
        Bucket: WAGE_GROWTH_BUCKET,
        Key: s3Key,
        Body: JSON.stringify(simplifiedSeriesData),
      });
    }

    return {
      status: 'success',
      message: `CPI Data for ${seriesIds.length} series downloaded and transformed successfully`,
      bucket: WAGE_GROWTH_BUCKET,
      keys,
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
