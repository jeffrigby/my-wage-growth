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

export interface DataValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  totalDataPoints: number;
  seriesWithData: number;
  seriesWithoutData: string[];
}

export interface SeriesMapping<T = string> {
  key: string;
  enumValue: T;
}

/**
 * Validates CPI data before saving to S3
 * @param cpiData - Array of CPI data points from external API
 * @param seriesIds - Array of series mappings that were requested
 * @param minDataPointsPerSeries - Minimum number of data points required per series (default: 12)
 * @returns Validation result with errors and warnings
 */
export function validateCpiData<T>(
  cpiData: CpiDataPoint[],
  seriesIds: SeriesMapping<T>[],
  minDataPointsPerSeries: number = 12,
): DataValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const seriesWithoutData: string[] = [];
  let seriesWithData = 0;

  // Check if we have any data at all
  if (cpiData.length === 0) {
    errors.push('No CPI data returned from API');
    return {
      isValid: false,
      errors,
      warnings,
      totalDataPoints: 0,
      seriesWithData: 0,
      seriesWithoutData: seriesIds.map((s) => String(s.enumValue)),
    };
  }

  // Group data by series ID
  const dataBySeriesId = new Map<string, CpiDataPoint[]>();
  for (const dataPoint of cpiData) {
    if (!dataBySeriesId.has(dataPoint.seriesId)) {
      dataBySeriesId.set(dataPoint.seriesId, []);
    }
    dataBySeriesId.get(dataPoint.seriesId)!.push(dataPoint);
  }

  // Validate each requested series
  for (const series of seriesIds) {
    const seriesId = String(series.enumValue);
    const seriesData = dataBySeriesId.get(seriesId) || [];

    if (seriesData.length === 0) {
      seriesWithoutData.push(seriesId);
      warnings.push(`No data returned for series ${seriesId} (${series.key})`);
    } else {
      seriesWithData++;

      if (seriesData.length < minDataPointsPerSeries) {
        warnings.push(
          `Series ${seriesId} (${series.key}) has only ${seriesData.length} data points, expected at least ${minDataPointsPerSeries}`,
        );
      }

      // Check for recent data (within last 12 months)
      const latestDate = Math.max(...seriesData.map((d) => d.date.getTime()));
      const twelveMonthsAgo = new Date();
      twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

      if (latestDate < twelveMonthsAgo.getTime()) {
        warnings.push(
          `Series ${seriesId} (${series.key}) appears to have stale data, latest date: ${new Date(latestDate).toISOString().slice(0, 7)}`,
        );
      }
    }
  }

  // Critical validation: At least some series must have data
  if (seriesWithData === 0) {
    errors.push('No valid data found for any requested series');
  }

  // Warning if more than half the series are missing
  if (seriesWithoutData.length > seriesIds.length / 2) {
    warnings.push(`More than half of requested series (${seriesWithoutData.length}/${seriesIds.length}) have no data`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    totalDataPoints: cpiData.length,
    seriesWithData,
    seriesWithoutData,
  };
}

/**
 * Validates processed CPI data before saving to S3
 * @param simplifiedData - Transformed CPI data ready for frontend consumption
 * @param seriesIds - Array of series mappings that were requested
 * @param minMonthsPerSeries - Minimum number of months required per series (default: 12)
 * @returns Validation result with errors and warnings
 */
export function validateProcessedCpiData<T>(
  simplifiedData: MultiSeriesSimplifiedCpiData,
  seriesIds: SeriesMapping<T>[],
  minMonthsPerSeries: number = 12,
): DataValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const seriesWithoutData: string[] = [];
  let seriesWithData = 0;
  let totalDataPoints = 0;

  // Validate each requested series
  for (const series of seriesIds) {
    const seriesId = String(series.enumValue);
    const seriesData = simplifiedData.series[seriesId];

    if (!seriesData || Object.keys(seriesData.months).length === 0) {
      seriesWithoutData.push(seriesId);
      warnings.push(`No processed data available for series ${seriesId} (${series.key})`);
    } else {
      seriesWithData++;
      const monthCount = Object.keys(seriesData.months).length;
      totalDataPoints += monthCount;

      if (monthCount < minMonthsPerSeries) {
        warnings.push(
          `Series ${seriesId} (${series.key}) has only ${monthCount} months of data, expected at least ${minMonthsPerSeries}`,
        );
      }

      // Check for recent data in processed format (YYYY-MM)
      const monthKeys = Object.keys(seriesData.months).sort();
      const latestMonth = monthKeys[monthKeys.length - 1];
      if (latestMonth) {
        const latestDate = new Date(latestMonth + '-01');
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

        if (latestDate < threeMonthsAgo) {
          warnings.push(
            `Series ${seriesId} (${series.key}) appears to have stale processed data, latest month: ${latestMonth}`,
          );
        }
      }
    }
  }

  // Critical validation: At least some series must have processed data
  if (seriesWithData === 0) {
    errors.push('No valid processed data found for any requested series');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    totalDataPoints,
    seriesWithData,
    seriesWithoutData,
  };
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
export async function saveRawCpiData<T>(
  rawData: CpiDataPoint[],
  seriesIds: SeriesMapping<T>[],
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
    const seriesData = dataBySeriesId.get(String(series.enumValue)) || [];
    const rawS3Key = `cpi/raw/${country}/${series.key}.json`;
    rawKeys.push(rawS3Key);

    const rawDataExport = {
      lastUpdated: new Date().toISOString(),
      source: `${dataSourceName} ${String(series.enumValue)}`,
      seriesId: String(series.enumValue),
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
export async function saveProcessedCpiData<T>(
  simplifiedData: MultiSeriesSimplifiedCpiData,
  seriesIds: SeriesMapping<T>[],
  country: string,
  dataSourceName: string,
): Promise<string[]> {
  const keys: string[] = [];

  for (const series of seriesIds) {
    const simplifiedSeriesData = simplifiedData.series[String(series.enumValue)];
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
