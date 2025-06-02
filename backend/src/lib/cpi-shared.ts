import { putS3Object } from '@/lib/aws.s3';
import { getLogger } from '@/lib/logger';
import { checkEnvVar } from '@/lib/utils';

const WAGE_GROWTH_BUCKET = checkEnvVar('WAGE_GROWTH_BUCKET');
const logger = getLogger();

export interface CpiDataPoint {
  seriesId: string;
  year: number;
  period: string;
  periodName: string;
  value: number;
  date: Date;
  footnotes?: string[];
}

export type SimplifiedCpiData = {
  lastUpdated: string;
  source: string;
  months: Record<string, number>;
};

export type MultiSeriesSimplifiedCpiData = {
  lastUpdated: string;
  sources: string[];
  series: Record<string, SimplifiedCpiData>;
};

export type CPILambdaResponse = {
  status: string;
  message: string;
  bucket?: string;
  keys?: string[];
  rawKeys?: string[];
  error?: string;
  data?: MultiSeriesSimplifiedCpiData;
};

export interface SeriesMapping {
  key: string;
  enumValue: string;
}

/**
 * Transforms CPI data into a simplified format for quick lookups
 * @param cpiData - Array of CPI data points from external API
 * @param seriesId - The series ID identifier for the data
 * @param sourcePrefix - Source name prefix (e.g., "BLS Series", "Statistics Canada Series")
 * @returns Simplified CPI data structure with monthly lookup format
 */
export function transformCpiDataForLookup(
  cpiData: CpiDataPoint[],
  seriesId: string,
  sourcePrefix: string,
): SimplifiedCpiData {
  const months: Record<string, number> = {};

  for (const dataPoint of cpiData) {
    const year = dataPoint.date.getFullYear();
    const month = (dataPoint.date.getMonth() + 1).toString().padStart(2, '0');
    const monthKey = `${year}-${month}`;
    months[monthKey] = dataPoint.value;
  }

  return {
    lastUpdated: new Date().toISOString(),
    source: `${sourcePrefix} ${seriesId}`,
    months,
  };
}

/**
 * Transforms multiple series CPI data into a structured format
 * @param cpiData - Array of CPI data points from external API for multiple series
 * @param seriesIds - Array of series IDs that were requested
 * @param sourcePrefix - Source name prefix (e.g., "BLS Series", "Statistics Canada Series")
 * @returns Multi-series simplified CPI data structure
 */
export function transformMultiSeriesCpiData<T extends string>(
  cpiData: CpiDataPoint[],
  seriesIds: T[],
  sourcePrefix: string,
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
    const transformedData = transformCpiDataForLookup(seriesData, seriesId, sourcePrefix);
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
 * Saves raw CPI data for troubleshooting purposes
 * @param rawData - Array of raw CPI data points from external API
 * @param seriesIds - Array of series mappings that were requested
 * @param country - Country code for S3 path (e.g., "us", "ca", "uk")
 * @param dataSourceName - Name of the data source (e.g., "BLS Series", "Statistics Canada Series")
 * @returns Array of S3 keys where raw data was stored
 */
export async function saveRawCpiData(
  rawData: CpiDataPoint[],
  seriesIds: SeriesMapping[],
  country: string,
  dataSourceName: string,
): Promise<string[]> {
  // Group raw data by series ID for individual file storage
  const dataBySeriesId = new Map<string, CpiDataPoint[]>();
  for (const dataPoint of rawData) {
    if (!dataBySeriesId.has(dataPoint.seriesId)) {
      dataBySeriesId.set(dataPoint.seriesId, []);
    }
    dataBySeriesId.get(dataPoint.seriesId)!.push(dataPoint);
  }

  // Save raw data for each series
  const rawKeys: string[] = [];
  for (const series of seriesIds) {
    const seriesData = dataBySeriesId.get(series.enumValue) || [];
    const rawS3Key = `cpi/raw/${country}/${series.key}.json`;
    rawKeys.push(rawS3Key);

    const rawDataExport = {
      lastUpdated: new Date().toISOString(),
      source: `${dataSourceName} ${series.enumValue}`,
      seriesId: series.enumValue,
      dataPoints: seriesData,
      totalPoints: seriesData.length,
    };

    logger.info(`Uploading raw ${dataSourceName} CPI data to S3`, {
      bucket: WAGE_GROWTH_BUCKET,
      key: rawS3Key,
      dataPoints: seriesData.length,
    });

    await putS3Object({
      Bucket: WAGE_GROWTH_BUCKET,
      Key: rawS3Key,
      Body: JSON.stringify(rawDataExport, null, 2),
    });
  }

  return rawKeys;
}

/**
 * Saves processed CPI data to S3
 * @param simplifiedData - Transformed CPI data ready for frontend consumption
 * @param seriesIds - Array of series mappings that were requested
 * @param country - Country code for S3 path (e.g., "us", "ca", "uk")
 * @param dataSourceName - Name of the data source for logging (e.g., "BLS", "Statistics Canada")
 * @returns Array of S3 keys where processed data was stored
 */
export async function saveProcessedCpiData(
  simplifiedData: MultiSeriesSimplifiedCpiData,
  seriesIds: SeriesMapping[],
  country: string,
  dataSourceName: string,
): Promise<string[]> {
  const keys: string[] = [];

  for (const series of seriesIds) {
    const simplifiedSeriesData = simplifiedData.series[series.enumValue];
    const s3Key = `cpi/processed/${country}/${series.key}.json`;
    keys.push(s3Key);

    logger.info(`Uploading ${dataSourceName} CPI data to S3`, {
      bucket: WAGE_GROWTH_BUCKET,
      key: s3Key,
    });

    await putS3Object({
      Bucket: WAGE_GROWTH_BUCKET,
      Key: s3Key,
      Body: JSON.stringify(simplifiedSeriesData),
    });
  }

  return keys;
}
