import { setTimeout } from 'node:timers/promises';

interface OnsConfig {
  baseUrl?: string;
  retryAttempts?: number;
}

interface OnsDatasetInfo {
  links: {
    latest_version: {
      id: string;
    };
  };
}

interface CsvRecord {
  v4_0: string;
  'mmm-yy': string;
  Time: string;
  'uk-only': string;
  Geography: string;
  cpih1dim1aggid: string;
  Aggregate: string;
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
 * CPI series IDs for UK ONS CPIH data
 */
export enum CpiSeriesIdUK {
  CPI_UK_ALL = 'CP00',
  CPI_UK_FOOD = 'CP01',
  CPI_UK_ALCOHOL_TOBACCO = 'CP02',
  CPI_UK_CLOTHING = 'CP03',
  CPI_UK_HOUSING = 'CP04',
  CPI_UK_HOUSEHOLD = 'CP05',
  CPI_UK_HEALTH = 'CP06',
  CPI_UK_TRANSPORT = 'CP07',
  CPI_UK_COMMUNICATION = 'CP08',
  CPI_UK_RECREATION = 'CP09',
  CPI_UK_EDUCATION = 'CP10',
  CPI_UK_RESTAURANTS = 'CP11',
  CPI_UK_MISCELLANEOUS = 'CP12',
}

/**
 * Creates a complete configuration object with defaults for optional properties
 */
function getConfig(config: OnsConfig = {}): Required<OnsConfig> {
  return {
    baseUrl: 'https://api.beta.ons.gov.uk/v1',
    retryAttempts: 3,
    ...config,
  };
}

/**
 * Converts ONS time format (mmm-yy) to a JavaScript Date object
 */
function parseOnsDate(timeLabel: string): Date | null {
  try {
    // Format is like "Apr-25", "Feb-21", etc.
    const [monthStr, yearStr] = timeLabel.split('-');
    const yearNum = parseInt(yearStr);

    // Handle 2-digit year conversion: assume years 50+ are 19xx, years <50 are 20xx
    const year = yearNum >= 50 ? 1900 + yearNum : 2000 + yearNum;

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const monthIndex = months.indexOf(monthStr);
    if (monthIndex === -1) return null;

    return new Date(year, monthIndex, 1);
  } catch {
    return null;
  }
}

/**
 * Fetches and parses CSV data from ONS API
 */
async function fetchCsvData(config: Required<OnsConfig>): Promise<CpiDataPoint[]> {
  const { default: pRetry } = await import('p-retry');
  const { parse } = await import('csv-parse');

  return pRetry(
    async () => {
      // Get the latest version info first
      const versionResponse = await fetch(`${config.baseUrl}/datasets/cpih01`);
      if (!versionResponse.ok) {
        throw new Error(`Failed to get dataset info: ${versionResponse.status}`);
      }

      const versionData = (await versionResponse.json()) as OnsDatasetInfo;
      const latestVersionId = versionData.links.latest_version.id;

      // Now get the CSV download URL
      const csvUrl = `https://download.ons.gov.uk/downloads/datasets/cpih01/editions/time-series/versions/${latestVersionId}.csv`;

      const response = await fetch(csvUrl, { redirect: 'follow' });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const csvText = await response.text();

      // Parse CSV data
      const records: CsvRecord[] = await new Promise((resolve, reject) => {
        const output: CsvRecord[] = [];
        const parser = parse(csvText, {
          columns: true,
          skip_empty_lines: true,
        });

        parser
          .on('readable', function () {
            let record;
            while ((record = parser.read()) !== null) {
              output.push(record);
            }
          })
          .on('error', reject)
          .on('end', () => resolve(output));
      });

      // Transform CSV records to CpiDataPoint format
      const dataPoints: CpiDataPoint[] = [];

      for (const record of records) {
        // Skip if missing required fields
        if (!record['Time'] || !record['cpih1dim1aggid'] || !record['v4_0']) {
          continue;
        }

        const value = parseFloat(record['v4_0']);
        if (isNaN(value)) continue;

        const date = parseOnsDate(record['Time']);
        if (!date) continue;

        dataPoints.push({
          seriesId: record['cpih1dim1aggid'], // Use aggregate code (CP00, CP01, etc.)
          year: date.getFullYear(),
          period: record['mmm-yy'] || record['Time'],
          periodName: record['Time'],
          value,
          date,
          footnotes: [],
        });
      }

      // Rate limiting to be respectful to the API
      await setTimeout(100);

      return dataPoints;
    },
    {
      retries: config.retryAttempts,
      onFailedAttempt: ({ error, attemptNumber, retriesLeft }) => {
        console.warn(`Attempt ${attemptNumber} failed. ${retriesLeft} retries left.`);
      },
    },
  );
}

/**
 * Fetches all CPI data for given series from ONS
 * Gets all available historical data for the specified series
 */
export async function fetchAllCpiData(seriesIds: CpiSeriesIdUK[]): Promise<CpiDataPoint[]> {
  const config = getConfig();

  // Get all CSV data
  const allData = await fetchCsvData(config);

  // Filter for requested series
  const requestedSeriesSet = new Set(seriesIds);

  const filteredData = allData.filter((dataPoint) => {
    return requestedSeriesSet.has(dataPoint.seriesId as CpiSeriesIdUK);
  });

  // Return data sorted chronologically
  return filteredData.sort((a, b) => a.date.getTime() - b.date.getTime());
}
