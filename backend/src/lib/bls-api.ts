import { setTimeout } from 'node:timers/promises';

interface BlsConfig {
  apiKey: string;
  baseUrl?: string;
  retryAttempts?: number;
}

interface BlsApiResponse {
  status: string;
  responseTime: number;
  message: string[];
  Results: {
    series: Array<{
      seriesID: string;
      data: Array<{
        year: string;
        period: string;
        periodName: string;
        value: string;
        footnotes: Array<{ code: string; text: string }>;
      }>;
    }>;
  };
}

export interface CpiDataPoint {
  seriesId: string;
  year: number;
  period: string;
  periodName: string;
  value: number;
  date: Date;
  footnotes?: string[];
}

/**
 * CPI series IDs for different categories and regions
 */
export enum CpiSeriesId {
  CPI_U_ALL = 'CUUR0000SA0',
  CPI_U_FOOD = 'CUUR0000SAF',
  CPI_U_ENERGY = 'CUUR0000SAE',
  CPI_U_HOUSING = 'CUUR0000SAH',
  CPI_U_TRANSPORTATION = 'CUUR0000SAT',
  CPI_U_MEDICAL = 'CUUR0000SAM',
  CPI_U_RECREATION = 'CUUR0000SAR',
  CPI_U_EDUCATION = 'CUUR0000SAE1',
  CPI_U_APPAREL = 'CUUR0000SAA',
  CPI_W_ALL = 'CWUR0000SA0',
  CPI_U_CORE = 'CUUR0000SA0L1E',
}

/**
 * Creates a complete configuration object with defaults for optional properties
 */
function getConfig(config: BlsConfig): Required<BlsConfig> {
  return {
    baseUrl: 'https://api.bls.gov/publicAPI/v2/timeseries/data/',
    retryAttempts: 3,
    ...config,
  };
}

/**
 * Splits a year range into smaller chunks to comply with BLS API limits
 */
function createYearRanges(
  startYear: number,
  endYear: number,
  maxYearsPerRequest: number,
): Array<{ start: number; end: number }> {
  const ranges: Array<{ start: number; end: number }> = [];

  for (let year = startYear; year <= endYear; year += maxYearsPerRequest) {
    ranges.push({
      start: year,
      end: Math.min(year + maxYearsPerRequest - 1, endYear),
    });
  }

  return ranges;
}

/**
 * Converts BLS period format to a JavaScript Date object
 */
function periodToDate(year: string, period: string): Date | null {
  const yearNum = parseInt(year);

  if (period === 'M13') {
    return new Date(yearNum, 11, 31);
  }

  if (period.startsWith('M')) {
    const month = parseInt(period.substring(1)) - 1;
    return new Date(yearNum, month, 1);
  }

  return null;
}

/**
 * Transforms raw BLS API response data into structured CPI data points
 */
function processApiResponse(response: BlsApiResponse): CpiDataPoint[] {
  const dataPoints: CpiDataPoint[] = [];

  for (const series of response.Results.series) {
    for (const dataPoint of series.data) {
      const value = parseFloat(dataPoint.value);
      if (isNaN(value)) continue;

      const date = periodToDate(dataPoint.year, dataPoint.period);
      if (!date) continue;

      dataPoints.push({
        seriesId: series.seriesID,
        year: parseInt(dataPoint.year),
        period: dataPoint.period,
        periodName: dataPoint.periodName,
        value,
        date,
        footnotes: dataPoint.footnotes?.map((f) => f.text) || [],
      });
    }
  }

  return dataPoints;
}

/**
 * Fetches CPI data for a specific year range with retry logic
 */
async function fetchDataChunk(
  config: Required<BlsConfig>,
  seriesIds: string[],
  startYear: number,
  endYear: number,
): Promise<CpiDataPoint[]> {
  const { default: pRetry } = await import('p-retry');

  return pRetry(
    async () => {
      const requestBody = {
        seriesid: seriesIds,
        startyear: startYear.toString(),
        endyear: endYear.toString(),
        registrationkey: config.apiKey,
      };

      const response = await fetch(config.baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = (await response.json()) as BlsApiResponse;

      if (data.status !== 'REQUEST_SUCCEEDED') {
        throw new Error(`BLS API Error: ${data.message.join(', ')}`);
      }

      // Rate limiting to be respectful to the API
      await setTimeout(200);

      return processApiResponse(data);
    },
    {
      retries: config.retryAttempts,
      onFailedAttempt: (error) => {
        console.warn(`Attempt ${error.attemptNumber} failed. ${error.retriesLeft} retries left.`);
      },
    },
  );
}

/**
 * Fetches all CPI data for a given series and date range
 * Automatically handles API pagination and rate limiting
 */
export async function fetchAllCpiData(
  apiKey: string,
  seriesId: CpiSeriesId,
  startYear: number = 1913,
  endYear: number = new Date().getFullYear(),
): Promise<CpiDataPoint[]> {
  const config = getConfig({ apiKey });
  const allData: CpiDataPoint[] = [];

  // BLS API allows up to 20 years per request
  const yearRanges = createYearRanges(startYear, endYear, 20);

  for (const yearRange of yearRanges) {
    const data = await fetchDataChunk(config, [seriesId], yearRange.start, yearRange.end);
    allData.push(...data);
  }

  // Return data sorted chronologically
  return allData.sort((a, b) => a.date.getTime() - b.date.getTime());
}

/**
 * Fetches CPI data for multiple series and date range
 * Automatically handles API pagination, rate limiting, and series batching
 */
export async function fetchMultipleCpiData(
  apiKey: string,
  seriesIds: CpiSeriesId[],
  startYear: number = 1913,
  endYear: number = new Date().getFullYear(),
): Promise<CpiDataPoint[]> {
  const config = getConfig({ apiKey });
  const allData: CpiDataPoint[] = [];

  // BLS API allows up to 50 series per request with API key, 25 without
  // We'll use 25 to be safe and work with both registered and unregistered keys
  const maxSeriesPerRequest = 25;

  // Split series into batches
  const seriesBatches: string[][] = [];
  for (let i = 0; i < seriesIds.length; i += maxSeriesPerRequest) {
    seriesBatches.push(seriesIds.slice(i, i + maxSeriesPerRequest));
  }

  // BLS API allows up to 20 years per request
  const yearRanges = createYearRanges(startYear, endYear, 20);

  // Process each combination of series batch and year range
  for (const seriesBatch of seriesBatches) {
    for (const yearRange of yearRanges) {
      const data = await fetchDataChunk(config, seriesBatch, yearRange.start, yearRange.end);
      allData.push(...data);
    }
  }

  // Return data sorted chronologically
  return allData.sort((a, b) => a.date.getTime() - b.date.getTime());
}
