import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { createMockLambdaContext, createMockFetchResponse } from '../lib/test-helpers';

// Mock Lambda Powertools and AWS services
const mockGetAppConfig = vi.fn();
const mockPutS3Object = vi.fn();

vi.mock('@aws-lambda-powertools/parameters/appconfig', () => ({
  getAppConfig: mockGetAppConfig,
}));

vi.mock('@/lib/aws.s3', () => ({
  putS3Object: mockPutS3Object,
}));

describe('get-canadian-cpi-data handler - unit tests', () => {
  let handler: (event: unknown, context: unknown) => Promise<{ status: string; [key: string]: unknown }>;
  let fetchSpy: ReturnType<typeof vi.spyOn>;
  const mockContext = createMockLambdaContext();

  beforeAll(async () => {
    // Set up fetch spy
    fetchSpy = vi.spyOn(global, 'fetch') as ReturnType<typeof vi.spyOn>;

    // Import handler after mocks are set up
    const handlerModule = await import('@/handlers/get-canadian-cpi-data');
    handler = handlerModule.handler;
  });

  beforeEach(() => {
    vi.clearAllMocks();

    // Default successful mocks
    mockGetAppConfig.mockResolvedValue({});
    mockPutS3Object.mockResolvedValue({});
    fetchSpy.mockImplementation(() =>
      createMockFetchResponse({
        object: [],
      }),
    );
  });

  describe('successful execution', () => {
    it('should process single series with default parameters', async () => {
      const mockStatsCanResponse = {
        object: [
          {
            refPer: '2024-01',
            vectorId: 'v41690973',
            value: '163.4',
          },
          {
            refPer: '2024-02',
            vectorId: 'v41690973',
            value: '164.1',
          },
        ],
      };

      fetchSpy.mockImplementation(() => createMockFetchResponse(mockStatsCanResponse));

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
      const mockStatsCanResponse = {
        object: [
          {
            refPer: '2024-01',
            vectorId: 'v41690973',
            value: '163.4',
          },
          {
            refPer: '2024-01',
            vectorId: 'v41690974',
            value: '194.5',
          },
        ],
      };

      fetchSpy.mockImplementation(() => createMockFetchResponse(mockStatsCanResponse));

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

    it('should handle empty data gracefully', async () => {
      const mockStatsCanResponse = {
        object: [],
      };

      fetchSpy.mockImplementation(() => createMockFetchResponse(mockStatsCanResponse));

      const result = await handler({ seriesIds: ['CPI_CA_ALL'] }, mockContext);

      expect(result.status).toBe('success');
      expect(result.keys).toHaveLength(1);
      expect(result.rawKeys).toHaveLength(1);
    });

    it('should upload data to correct S3 paths', async () => {
      const mockStatsCanResponse = {
        object: [
          {
            refPer: '2024-01',
            vectorId: 'v41690973',
            value: '163.4',
          },
        ],
      };

      fetchSpy.mockImplementation(() => createMockFetchResponse(mockStatsCanResponse));

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
      fetchSpy.mockImplementation(() =>
        createMockFetchResponse(
          {
            message: 'Internal Server Error',
          },
          false,
          500,
        ),
      );

      const event = { seriesIds: ['CPI_CA_ALL'] };
      const result = await handler(event, mockContext);

      expect(result.status).toBe('error');
      expect(result.message).toBe('Failed to download Canadian CPI data');
      expect(result.error).toContain('HTTP 500');
    });

    it('should handle network errors', async () => {
      fetchSpy.mockRejectedValue(new Error('Network error'));

      const event = { seriesIds: ['CPI_CA_ALL'] };
      const result = await handler(event, mockContext);

      expect(result).toMatchObject({
        status: 'error',
        message: 'Failed to download Canadian CPI data',
        error: expect.stringContaining('Network error'),
      });
    }, 10000);

    it('should handle S3 upload errors', async () => {
      const mockStatsCanResponse = {
        object: [
          {
            refPer: '2024-01',
            vectorId: 'v41690973',
            value: '163.4',
          },
        ],
      };

      fetchSpy.mockImplementation(() => createMockFetchResponse(mockStatsCanResponse));
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
