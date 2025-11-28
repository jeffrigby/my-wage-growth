import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { createMockLambdaContext } from '../lib/test-helpers';
import type { CpiDataPoint } from '@/lib/cpi-shared';

// Mock Lambda Powertools and AWS services
const mockGetAppConfig = vi.fn();
const mockPutS3Object = vi.fn();
const mockFetchAllCpiData = vi.fn();

vi.mock('@aws-lambda-powertools/parameters/appconfig', () => ({
  getAppConfig: mockGetAppConfig,
}));

vi.mock('@/lib/aws.s3', () => ({
  putS3Object: mockPutS3Object,
}));

// Mock the stats-canada-api module to avoid complex ZIP/CSV operations
vi.mock('@/lib/stats-canada-api', () => ({
  fetchAllCpiData: mockFetchAllCpiData,
  CpiSeriesIdCanada: {
    CPI_CA_ALL: 'v41690973',
    CPI_CA_FOOD: 'v41690974',
    CPI_CA_SHELTER: 'v41691050',
    CPI_CA_HOUSEHOLD: 'v41691067',
    CPI_CA_CLOTHING: 'v41691108',
    CPI_CA_TRANSPORTATION: 'v41691128',
    CPI_CA_HEALTH: 'v41691153',
    CPI_CA_RECREATION: 'v41691170',
    CPI_CA_ALCOHOL_TOBACCO: 'v41691206',
    CPI_CA_CORE: 'v41691233',
  },
}));

/**
 * Helper to generate mock CPI data points that pass validation
 */
function generateMockCpiData(seriesId: string, months: number = 12): CpiDataPoint[] {
  return Array.from({ length: months }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    return {
      seriesId,
      year: date.getFullYear(),
      period: `M${String(date.getMonth() + 1).padStart(2, '0')}`,
      periodName: date.toLocaleString('default', { month: 'long' }),
      value: 160 + Math.random() * 10,
      date,
      footnotes: [],
    };
  });
}

describe('get-canadian-cpi-data handler - unit tests', () => {
  let handler: (event: unknown, context: unknown) => Promise<{ status: string; [key: string]: unknown }>;
  const mockContext = createMockLambdaContext();

  beforeAll(async () => {
    // Import handler after mocks are set up
    const handlerModule = await import('@/handlers/get-canadian-cpi-data');
    handler = handlerModule.handler;
  });

  beforeEach(() => {
    vi.clearAllMocks();

    // Default successful mocks
    mockGetAppConfig.mockResolvedValue({});
    mockPutS3Object.mockResolvedValue({});
    // Default: return valid data for CPI_CA_ALL
    mockFetchAllCpiData.mockResolvedValue(generateMockCpiData('v41690973'));
  });

  describe('successful execution', () => {
    it('should process single series with default parameters', async () => {
      // Default mock is already set in beforeEach
      const result = await handler({}, mockContext);

      expect(result).toMatchObject({
        status: 'success',
        message: expect.stringContaining('1 series'),
        bucket: 'test-bucket',
      });

      expect(result.keys).toHaveLength(1);
      expect(result.rawKeys).toHaveLength(1);

      // Verify S3 uploads (1 raw + 1 processed)
      expect(mockPutS3Object).toHaveBeenCalledTimes(2);
    });

    it('should process multiple series successfully', async () => {
      // Mock data for two series
      const mockData = [
        ...generateMockCpiData('v41690973'), // CPI_CA_ALL
        ...generateMockCpiData('v41690974'), // CPI_CA_FOOD
      ];
      mockFetchAllCpiData.mockResolvedValue(mockData);

      const event = { seriesIds: ['CPI_CA_ALL', 'CPI_CA_FOOD'] };
      const result = await handler(event, mockContext);

      expect(result).toMatchObject({
        status: 'success',
        message: expect.stringContaining('2 series'),
        bucket: 'test-bucket',
      });

      expect(result.keys).toHaveLength(2);
      expect(result.rawKeys).toHaveLength(2);

      // Verify S3 uploads (2 raw + 2 processed)
      expect(mockPutS3Object).toHaveBeenCalledTimes(4);
    });

    it('should handle empty data as validation error', async () => {
      mockFetchAllCpiData.mockResolvedValue([]);

      const result = await handler({ seriesIds: ['CPI_CA_ALL'] }, mockContext);

      // Empty data now fails validation (critical error: no data returned)
      expect(result.status).toBe('error');
      expect(result.error).toContain('No CPI data returned from API');
    });

    it('should upload data to correct S3 paths', async () => {
      // Default mock is already set in beforeEach
      const event = { seriesIds: ['CPI_CA_ALL'] };
      const result = await handler(event, mockContext);

      expect(result.status).toBe('success');

      // Check S3 upload calls for correct paths
      const s3Calls = mockPutS3Object.mock.calls;
      expect(s3Calls).toHaveLength(2); // 1 raw + 1 processed

      // Check raw data path
      const rawCall = s3Calls.find((call) => call[0].Key?.includes('cpi/raw/ca/'));
      expect(rawCall).toBeTruthy();
      expect(rawCall?.[0].Key).toBe('cpi/raw/ca/CPI_CA_ALL.json');

      // Check processed data path
      const processedCall = s3Calls.find((call) => call[0].Key?.includes('cpi/processed/ca/'));
      expect(processedCall).toBeTruthy();
      expect(processedCall?.[0].Key).toBe('cpi/processed/ca/CPI_CA_ALL.json');
    });
  });

  describe('error handling', () => {
    it('should handle API errors gracefully', async () => {
      mockFetchAllCpiData.mockRejectedValue(new Error('HTTP 500: Internal Server Error'));

      const event = { seriesIds: ['CPI_CA_ALL'] };
      const result = await handler(event, mockContext);

      expect(result.status).toBe('error');
      expect(result.message).toBe('Failed to download Canadian CPI data');
      expect(result.error).toContain('HTTP 500');
    });

    it('should handle network errors', async () => {
      mockFetchAllCpiData.mockRejectedValue(new Error('Network error'));

      const event = { seriesIds: ['CPI_CA_ALL'] };
      const result = await handler(event, mockContext);

      expect(result).toMatchObject({
        status: 'error',
        message: 'Failed to download Canadian CPI data',
        error: expect.stringContaining('Network error'),
      });
    });

    it('should handle S3 upload errors', async () => {
      // Default mock provides valid data, but S3 upload fails
      mockPutS3Object.mockRejectedValue(new Error('S3 Access Denied'));

      const event = { seriesIds: ['CPI_CA_ALL'] };
      const result = await handler(event, mockContext);

      expect(result).toMatchObject({
        status: 'error',
        message: 'Failed to download Canadian CPI data',
        error: 'S3 Access Denied',
      });
    });

    it('should handle AppConfig errors', async () => {
      mockGetAppConfig.mockRejectedValue(new Error('Configuration not found'));

      const event = { seriesIds: ['CPI_CA_ALL'] };
      const result = await handler(event, mockContext);

      expect(result).toMatchObject({
        status: 'error',
        message: 'Failed to download Canadian CPI data',
        error: 'Configuration not found',
      });
    });
  });

  describe('input validation', () => {
    it('should reject invalid series IDs', async () => {
      const event = { seriesIds: ['INVALID_SERIES_ID'] };
      // Parser middleware returns generic "Failed to parse schema" for Zod validation errors
      await expect(handler(event, mockContext)).rejects.toThrow('Failed to parse schema');
    });

    it('should reject too many series IDs', async () => {
      const event = { seriesIds: Array(51).fill('CPI_CA_ALL') };
      // Parser middleware returns generic "Failed to parse schema" for Zod validation errors
      await expect(handler(event, mockContext)).rejects.toThrow('Failed to parse schema');
    });

    it('should reject empty series IDs array', async () => {
      const event = { seriesIds: [] };
      // Parser middleware returns generic "Failed to parse schema" for Zod validation errors
      await expect(handler(event, mockContext)).rejects.toThrow('Failed to parse schema');
    });
  });
});
