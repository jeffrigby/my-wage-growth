import { Context } from 'aws-lambda';
import { injectLambdaContext } from '@aws-lambda-powertools/logger/middleware';
import { parser } from '@aws-lambda-powertools/parser/middleware';
import middy from '@middy/core';
import { z } from 'zod';
import { getLogger } from '@/lib/logger';
import { getWageGrowthConfig } from '@/lib/aws.appconfig';
import { fetchAllCpiData, CpiSeriesIdCanada, CpiDataPoint } from '@/lib/stats-canada-api';
import { putS3Object } from '@/lib/aws.s3';
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
    .transform((keys): { key: string; enumValue: CpiSeriesIdCanada }[] => {
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
  seriesIds: { key: string; enumValue: CpiSeriesIdCanada }[];
};

type CPILambdaResponse = {
  status: string;
  message: string;
  bucket?: string;
  keys?: string[];
  rawKeys?: string[];
  error?: string;
  data?: MultiSeriesSimplifiedCpiData;
};

/**
 * Transforms Statistics Canada CPI data into a simplified format for quick lookups
 * @param cpiData Array of CPI data points from Stats Canada API
 * @param seriesId The series ID used for the data
 * @returns Simplified CPI data structure
 */
function transformCpiDataForLookup(cpiData: CpiDataPoint[], seriesId: CpiSeriesIdCanada): SimplifiedCpiData {
  const months: Record<string, number> = {};

  // Convert each data point to monthly format
  for (const dataPoint of cpiData) {
    const year = dataPoint.date.getFullYear();
    // Monthly data - format as YYYY-MM for easy lookup
    const month = (dataPoint.date.getMonth() + 1).toString().padStart(2, '0');
    const monthKey = `${year}-${month}`;
    months[monthKey] = dataPoint.value;
  }

  return {
    lastUpdated: new Date().toISOString(),
    source: `Statistics Canada Series ${seriesId}`,
    months,
  };
}

/**
 * Transforms multiple series CPI data into a structured format
 * @param cpiData Array of CPI data points from Stats Canada API for multiple series
 * @param seriesIds Array of series IDs that were requested
 * @returns Multi-series simplified CPI data structure
 */
function transformMultiSeriesCpiData(
  cpiData: CpiDataPoint[],
  seriesIds: CpiSeriesIdCanada[],
): MultiSeriesSimplifiedCpiData {
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

/**
 * Saves raw Statistics Canada data for troubleshooting purposes
 * @param statsCanData Array of raw CPI data points from Stats Canada API
 * @param seriesIds Array of series that were requested
 */
async function saveRawStatsCanData(
  statsCanData: CpiDataPoint[],
  seriesIds: { key: string; enumValue: CpiSeriesIdCanada }[],
): Promise<string[]> {
  // Group raw data by series ID for individual file storage
  const dataBySeriesId = new Map<string, CpiDataPoint[]>();
  for (const dataPoint of statsCanData) {
    if (!dataBySeriesId.has(dataPoint.seriesId)) {
      dataBySeriesId.set(dataPoint.seriesId, []);
    }
    dataBySeriesId.get(dataPoint.seriesId)!.push(dataPoint);
  }

  // Save raw data for each series
  const rawKeys: string[] = [];
  for (const series of seriesIds) {
    const seriesData = dataBySeriesId.get(series.enumValue) || [];
    const rawS3Key = `cpi/raw/ca/${series.key}.json`;
    rawKeys.push(rawS3Key);

    const rawDataExport = {
      lastUpdated: new Date().toISOString(),
      source: `Statistics Canada Series ${series.enumValue}`,
      seriesId: series.enumValue,
      dataPoints: seriesData,
      totalPoints: seriesData.length,
    };

    logger.info('Uploading raw Canadian CPI data to S3', {
      bucket: WAGE_GROWTH_BUCKET,
      key: rawS3Key,
      dataPoints: seriesData.length,
    });

    await putS3Object({
      Bucket: WAGE_GROWTH_BUCKET,
      Key: rawS3Key,
      Body: JSON.stringify(rawDataExport, null, 2), // Pretty-print for easier troubleshooting
    });
  }

  return rawKeys;
}

export const lambdaHandler = async (event: CpiExportEvent, context: Context): Promise<CPILambdaResponse> => {
  try {
    await getWageGrowthConfig(); // Ensure config is loaded
    const { seriesIds } = event;

    // Note: Statistics Canada API doesn't require authentication
    const statsCanData = await fetchAllCpiData(seriesIds.map((e) => e.enumValue));

    // First, save raw data for troubleshooting
    const rawKeys = await saveRawStatsCanData(statsCanData, seriesIds);

    // Transform the data into simplified format
    const simplifiedData = transformMultiSeriesCpiData(
      statsCanData,
      seriesIds.map((e) => e.enumValue),
    );

    const totalMonths = Object.values(simplifiedData.series).reduce(
      (total, series) => total + Object.keys(series.months).length,
      0,
    );

    logger.info('Statistics Canada Data fetched and transformed', {
      requestedSeries: seriesIds.length,
      originalDataPoints: statsCanData.length,
      seriesProcessed: Object.keys(simplifiedData.series).length,
      totalMonthsAcrossAllSeries: totalMonths,
    });

    // Upload each series to s3
    const keys: string[] = [];
    for (const series of seriesIds) {
      const simplifiedSeriesData = simplifiedData.series[series.enumValue];
      const s3Key = `cpi/processed/ca/${series.key}.json`;
      keys.push(s3Key);
      logger.info('Uploading Canadian CPI data to S3', {
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
