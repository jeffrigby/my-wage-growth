import { setTimeout } from 'node:timers/promises';
import { parse } from 'csv-parse';
import { pipeline } from 'node:stream/promises';
import { createReadStream, promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import * as unzipper from 'unzipper';

interface StatsCanConfig {
  baseUrl?: string;
  retryAttempts?: number;
}

interface StatsCanApiResponse {
  status: string;
  object: unknown;
}

interface CubeMetadataResponse {
  status: string;
  object: {
    responseStatusCode: number;
    productId: string;
    cubeTitleEn: string;
    cubeStartDate: string;
    cubeEndDate: string;
    nbSeriesCube: number;
    nbDatapointsCube: number;
  };
}

interface FullTableDownloadResponse {
  status: string;
  object: string; // URL to download the ZIP file
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
 * CPI series IDs (vector IDs) for different categories
 * Based on POC results from table 18-10-0004-01
 */
export enum CpiSeriesIdCanada {
  CPI_CA_ALL = 'v41690973', // All-items
  CPI_CA_FOOD = 'v41690974', // Food
  CPI_CA_SHELTER = 'v41691050', // Shelter
  CPI_CA_HOUSEHOLD = 'v41691067', // Household operations, furnishings and equipment
  CPI_CA_CLOTHING = 'v41691108', // Clothing and footwear
  CPI_CA_TRANSPORTATION = 'v41691128', // Transportation
  CPI_CA_HEALTH = 'v41691153', // Health and personal care
  CPI_CA_RECREATION = 'v41691170', // Recreation, education and reading
  CPI_CA_ALCOHOL_TOBACCO = 'v41691206', // Alcoholic beverages, tobacco products and recreational cannabis
  CPI_CA_CORE = 'v41691233', // All-items excluding food and energy
}

/**
 * Product ID for the main CPI table
 */
const CPI_PRODUCT_ID = '18100004';

/**
 * Creates a complete configuration object with defaults for optional properties
 */
function getConfig(config: StatsCanConfig): Required<StatsCanConfig> {
  return {
    baseUrl: 'https://www150.statcan.gc.ca/t1/wds/rest/',
    retryAttempts: 3,
    ...config,
  };
}

/**
 * Converts Statistics Canada date format to JavaScript Date object
 */
function parseStatsCanDate(refDate: string): Date | null {
  // Format is "YYYY-MM" or "YYYY-MM-DD"
  const parts = refDate.split('-');
  if (parts.length >= 2) {
    const year = parseInt(parts[0]);
    const month = parseInt(parts[1]) - 1; // JavaScript months are 0-indexed
    return new Date(year, month, 1);
  }
  return null;
}

/**
 * Fetches metadata for the CPI cube/table
 */
export async function fetchCubeMetadata(config: StatsCanConfig = {}): Promise<CubeMetadataResponse> {
  const { baseUrl, retryAttempts } = getConfig(config);
  const { default: pRetry } = await import('p-retry');

  return pRetry(
    async () => {
      const requestBody = JSON.stringify([{ productId: parseInt(CPI_PRODUCT_ID) }]);

      const response = await fetch(`${baseUrl}getCubeMetadata`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: requestBody,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = (await response.json()) as StatsCanApiResponse[];

      if (data[0]?.status !== 'SUCCESS') {
        throw new Error(`Stats Canada API Error: ${JSON.stringify(data)}`);
      }

      return data[0] as CubeMetadataResponse;
    },
    {
      retries: retryAttempts,
      onFailedAttempt: (error) => {
        console.warn(`Attempt ${error.attemptNumber} failed. ${error.retriesLeft} retries left.`);
      },
    },
  );
}

/**
 * Gets the URL to download the full CPI table as CSV
 */
export async function getFullTableDownloadUrl(config: StatsCanConfig = {}): Promise<string> {
  const { baseUrl, retryAttempts } = getConfig(config);
  const { default: pRetry } = await import('p-retry');

  return pRetry(
    async () => {
      const response = await fetch(`${baseUrl}getFullTableDownloadCSV/${CPI_PRODUCT_ID}/en`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = (await response.json()) as FullTableDownloadResponse;

      if (data.status !== 'SUCCESS' || !data.object) {
        throw new Error(`Stats Canada API Error: ${JSON.stringify(data)}`);
      }

      return data.object;
    },
    {
      retries: retryAttempts,
      onFailedAttempt: (error) => {
        console.warn(`Attempt ${error.attemptNumber} failed. ${error.retriesLeft} retries left.`);
      },
    },
  );
}

/**
 * Downloads and extracts the CSV file from the ZIP archive
 */
async function downloadAndExtractCsv(downloadUrl: string): Promise<string> {
  const tempDir = tmpdir();
  const zipPath = join(tempDir, `cpi-${Date.now()}.zip`);
  const extractDir = join(tempDir, `cpi-extract-${Date.now()}`);

  // Download the ZIP file
  const response = await fetch(downloadUrl);
  if (!response.ok) {
    throw new Error(`Failed to download CSV: ${response.statusText}`);
  }

  const buffer = await response.arrayBuffer();
  await fs.writeFile(zipPath, Buffer.from(buffer));

  // Create extraction directory
  await fs.mkdir(extractDir, { recursive: true });

  // Extract the ZIP file using unzipper
  await pipeline(createReadStream(zipPath), unzipper.Extract({ path: extractDir }));

  // Find the CSV file
  const files = await fs.readdir(extractDir);
  const csvFile = files.find((file) => file === `${CPI_PRODUCT_ID}.csv`);
  if (!csvFile) {
    throw new Error('CSV file not found in ZIP archive');
  }

  const csvPath = join(extractDir, csvFile);

  // Clean up ZIP file
  await fs.unlink(zipPath);

  return csvPath;
}

/**
 * Parses the CSV file and extracts CPI data points for specified series
 */
async function parseCsvData(csvPath: string, seriesIds: string[]): Promise<CpiDataPoint[]> {
  const dataPoints: CpiDataPoint[] = [];
  const seriesSet = new Set(seriesIds);

  const parser = parse({
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true,
  });

  const stream = createReadStream(csvPath);

  return new Promise((resolve, reject) => {
    parser.on('readable', function () {
      let record;
      while ((record = parser.read()) !== null) {
        // Check if this is a series we're interested in
        if (seriesSet.has(record.VECTOR)) {
          // Only process records for Canada and with base year 2002=100
          if (record.GEO === 'Canada' && record.UOM === '2002=100') {
            const value = parseFloat(record.VALUE);
            if (!isNaN(value)) {
              const date = parseStatsCanDate(record.REF_DATE);
              if (date) {
                // Extract month name from date
                const monthName = date.toLocaleDateString('en-US', { month: 'long' });

                dataPoints.push({
                  seriesId: record.VECTOR,
                  year: date.getFullYear(),
                  period: `M${String(date.getMonth() + 1).padStart(2, '0')}`,
                  periodName: monthName,
                  value,
                  date,
                  footnotes: record.STATUS ? [record.STATUS] : [],
                });
              }
            }
          }
        }
      }
    });

    parser.on('error', reject);
    parser.on('end', () => resolve(dataPoints));

    stream.pipe(parser);
  });
}

/**
 * Fetches all CPI data for multiple series from Statistics Canada
 * Downloads the full table and extracts data for specified series
 */
export async function fetchAllCpiData(
  seriesIds: CpiSeriesIdCanada[],
  config: StatsCanConfig = {},
): Promise<CpiDataPoint[]> {
  let csvPath: string | null = null;

  try {
    // Get download URL
    const downloadUrl = await getFullTableDownloadUrl(config);

    // Download and extract CSV
    csvPath = await downloadAndExtractCsv(downloadUrl);

    // Parse CSV and extract data points
    const dataPoints = await parseCsvData(csvPath, seriesIds);

    // Sort chronologically
    return dataPoints.sort((a, b) => a.date.getTime() - b.date.getTime());
  } finally {
    // Clean up temporary CSV file
    if (csvPath) {
      try {
        await fs.unlink(csvPath);
      } catch (error) {
        console.warn('Failed to clean up temporary CSV file:', error);
      }
    }
  }
}

/**
 * Fetches recent CPI data using vector IDs (for incremental updates)
 * Note: This is limited by the latestN parameter and won't return full history
 */
export async function fetchRecentCpiData(
  seriesIds: CpiSeriesIdCanada[],
  latestN: number = 12,
  config: StatsCanConfig = {},
): Promise<CpiDataPoint[]> {
  const { baseUrl, retryAttempts } = getConfig(config);
  const { default: pRetry } = await import('p-retry');

  const allData: CpiDataPoint[] = [];

  for (const seriesId of seriesIds) {
    const data = await pRetry(
      async () => {
        // Remove 'v' prefix and convert to number
        const vectorId = parseInt(seriesId.substring(1));

        const requestBody = JSON.stringify([
          {
            vectorId,
            latestN,
          },
        ]);

        const response = await fetch(`${baseUrl}getDataFromVectorsAndLatestNPeriods`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: requestBody,
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = (await response.json()) as StatsCanApiResponse[];

        if (result[0]?.status !== 'SUCCESS') {
          throw new Error(`Stats Canada API Error: ${JSON.stringify(result)}`);
        }

        interface VectorDataPoint {
          refPer: string;
          value: string | number;
        }

        const responseObject = result[0].object as { vectorDataPoint?: VectorDataPoint[] };
        const vectorData = responseObject.vectorDataPoint || [];

        const dataPoints: (CpiDataPoint | null)[] = vectorData.map((point) => {
          const date = parseStatsCanDate(point.refPer);
          if (!date) return null;

          const monthName = date.toLocaleDateString('en-US', { month: 'long' });
          const value = typeof point.value === 'string' ? parseFloat(point.value) : point.value;

          return {
            seriesId,
            year: date.getFullYear(),
            period: `M${String(date.getMonth() + 1).padStart(2, '0')}`,
            periodName: monthName,
            value,
            date,
            footnotes: [],
          };
        });

        return dataPoints.filter((point): point is CpiDataPoint => point !== null);
      },
      {
        retries: retryAttempts,
        onFailedAttempt: (error) => {
          console.warn(`Attempt ${error.attemptNumber} failed. ${error.retriesLeft} retries left.`);
        },
      },
    );

    allData.push(...data);

    // Rate limiting
    await setTimeout(200);
  }

  return allData.sort((a, b) => a.date.getTime() - b.date.getTime());
}
