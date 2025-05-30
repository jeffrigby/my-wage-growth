import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import {
  createMockLambdaContext,
  createMockFetchResponse,
  createMultiSeriesMockBlsResponse,
} from '../lib/test-helpers';

// Mock Lambda Powertools and AWS services
const mockGetAppConfig = vi.fn();
const mockPutS3Object = vi.fn();

vi.mock('@aws-lambda-powertools/parameters/appconfig', () => ({
  getAppConfig: mockGetAppConfig,
}));

vi.mock('@/lib/aws.s3', () => ({
  putS3Object: mockPutS3Object,
}));

describe('get-us-cpi-data handler - unit tests', () => {
  let handler: (event: unknown, context: unknown) => Promise<{ status: string; [key: string]: unknown }>;
  let fetchSpy: ReturnType<typeof vi.spyOn>;
  const mockContext = createMockLambdaContext();

  beforeAll(async () => {
    // Set up fetch spy
    fetchSpy = vi.spyOn(global, 'fetch') as ReturnType<typeof vi.spyOn>;

    // Import handler after mocks are set up
    const handlerModule = await import('@/handlers/get-us-cpi-data');
    handler = handlerModule.handler;
  });

  beforeEach(() => {
    vi.clearAllMocks();

    // Default successful mocks
    mockGetAppConfig.mockResolvedValue({ blsApiKey: 'test-api-key' });
    mockPutS3Object.mockResolvedValue({});
    fetchSpy.mockImplementation(() =>
      createMockFetchResponse({
        status: 'REQUEST_SUCCEEDED',
        Results: { series: [{ seriesID: 'CUUR0000SA0', data: [] }] },
      }),
    );
  });

  describe('successful execution', () => {
    it('should process single series with default parameters', async () => {
      fetchSpy.mockImplementation(() =>
        createMockFetchResponse(
          createMultiSeriesMockBlsResponse([
            {
              seriesId: 'CUUR0000SA0',
              dataPoints: [
                { year: '2023', period: 'M01', periodName: 'January', value: '307.026' },
                { year: '2023', period: 'M02', periodName: 'February', value: '308.026' },
              ],
            },
          ]),
        ),
      );

      const result = await handler({}, mockContext);

      expect(result).toMatchObject({
        status: 'success',
        message: expect.stringContaining('1 series'),
        bucket: 'test-bucket',
        keys: ['data/CPI_U_ALL.json'],
      });

      expect(mockPutS3Object).toHaveBeenCalledWith({
        Bucket: 'test-bucket',
        Key: 'data/CPI_U_ALL.json',
        Body: expect.stringContaining('2023-01'),
      });
    });

    it('should process multiple series successfully', async () => {
      fetchSpy.mockImplementation(() =>
        createMockFetchResponse(
          createMultiSeriesMockBlsResponse([
            {
              seriesId: 'CUUR0000SA0',
              dataPoints: [{ year: '2023', period: 'M01', periodName: 'January', value: '307.026' }],
            },
            {
              seriesId: 'CUUR0000SAF',
              dataPoints: [{ year: '2023', period: 'M01', periodName: 'January', value: '320.123' }],
            },
          ]),
        ),
      );

      const event = { seriesIds: ['CPI_U_ALL', 'CPI_U_FOOD'] };
      const result = await handler(event, mockContext);

      expect(result).toMatchObject({
        status: 'success',
        message: expect.stringContaining('2 series'),
        bucket: 'test-bucket',
        keys: ['data/CPI_U_ALL.json', 'data/CPI_U_FOOD.json'],
      });

      expect(mockPutS3Object).toHaveBeenCalledTimes(2);
    });

    it('should handle custom year ranges', async () => {
      const event = {
        startYear: 2020,
        endYear: 2023,
        seriesIds: ['CPI_U_ALL'],
      };

      const result = await handler(event, mockContext);
      expect(result.status).toBe('success');
      expect(fetchSpy).toHaveBeenCalled();
    });

    it('should handle empty CPI data from BLS API', async () => {
      fetchSpy.mockImplementation(() =>
        createMockFetchResponse({
          status: 'REQUEST_SUCCEEDED',
          Results: { series: [{ seriesID: 'CUUR0000SA0', data: [] }] },
        }),
      );

      const result = await handler({ seriesIds: ['CPI_U_ALL'] }, mockContext);
      expect(result.status).toBe('success');

      expect(mockPutS3Object).toHaveBeenCalledWith({
        Bucket: 'test-bucket',
        Key: 'data/CPI_U_ALL.json',
        Body: expect.stringContaining('"months":{}'),
      });
    });
  });

  describe('error handling', () => {
    it('should handle missing BLS API key', async () => {
      mockGetAppConfig.mockResolvedValue({});

      const result = await handler({}, mockContext);

      expect(result).toMatchObject({
        status: 'error',
        message: 'Failed to download CPI data',
        error: 'BLS API key is not set',
      });

      expect(fetchSpy).not.toHaveBeenCalled();
      expect(mockPutS3Object).not.toHaveBeenCalled();
    });

    it('should handle BLS API errors', async () => {
      fetchSpy.mockRejectedValue(new Error('Network error'));

      const result = await handler({}, mockContext);

      expect(result).toMatchObject({
        status: 'error',
        message: 'Failed to download CPI data',
        error: expect.stringContaining('Network error'),
      });

      expect(mockPutS3Object).not.toHaveBeenCalled();
    }, 10000);

    it('should handle BLS API response errors', async () => {
      fetchSpy.mockImplementation(() => createMockFetchResponse({ error: 'Rate limit exceeded' }, false, 429));

      const result = await handler({}, mockContext);

      expect(result).toMatchObject({
        status: 'error',
        message: 'Failed to download CPI data',
        error: expect.stringContaining('429'),
      });
    }, 10000);

    it('should handle S3 upload errors', async () => {
      fetchSpy.mockImplementation(() =>
        createMockFetchResponse(
          createMultiSeriesMockBlsResponse([
            {
              seriesId: 'CUUR0000SA0',
              dataPoints: [{ year: '2023', period: 'M01', periodName: 'January', value: '307.026' }],
            },
          ]),
        ),
      );

      mockPutS3Object.mockRejectedValue(new Error('S3 Access Denied'));

      const result = await handler({}, mockContext);

      expect(result).toMatchObject({
        status: 'error',
        message: 'Failed to download CPI data',
        error: 'S3 Access Denied',
      });
    });

    it('should handle AppConfig errors', async () => {
      mockGetAppConfig.mockRejectedValue(new Error('Configuration not found'));

      const result = await handler({}, mockContext);

      expect(result).toMatchObject({
        status: 'error',
        message: 'Failed to download CPI data',
        error: 'Configuration not found',
      });
    });
  });

  describe('input validation', () => {
    it('should reject invalid series IDs', async () => {
      const event = { seriesIds: ['INVALID_SERIES_ID'] };
      await expect(handler(event, mockContext)).rejects.toThrow('Invalid series ID');
    });

    it('should reject too many series IDs', async () => {
      const event = { seriesIds: Array(51).fill('CPI_U_ALL') };
      await expect(handler(event, mockContext)).rejects.toThrow('Maximum 50 series IDs allowed');
    });

    it('should reject empty series IDs array', async () => {
      const event = { seriesIds: [] };
      await expect(handler(event, mockContext)).rejects.toThrow('At least one series ID is required');
    });

    it('should reject invalid start year', async () => {
      const event = { startYear: 1900 };
      await expect(handler(event, mockContext)).rejects.toThrow();
    });

    it('should reject future end year', async () => {
      const event = { endYear: new Date().getFullYear() + 1 };
      await expect(handler(event, mockContext)).rejects.toThrow();
    });

    it('should reject invalid event structure', async () => {
      await expect(handler('not an object' as never, mockContext)).rejects.toThrow();
    });
  });

  describe('data transformation', () => {
    it('should correctly group data by series ID', async () => {
      fetchSpy.mockImplementation(() =>
        createMockFetchResponse(
          createMultiSeriesMockBlsResponse([
            {
              seriesId: 'CUUR0000SA0',
              dataPoints: [
                { year: '2023', period: 'M01', periodName: 'January', value: '307.026' },
                { year: '2023', period: 'M02', periodName: 'February', value: '308.026' },
              ],
            },
            {
              seriesId: 'CUUR0000SAF',
              dataPoints: [{ year: '2023', period: 'M01', periodName: 'January', value: '320.123' }],
            },
          ]),
        ),
      );

      const event = { seriesIds: ['CPI_U_ALL', 'CPI_U_FOOD'] };
      await handler(event, mockContext);

      const s3Calls = mockPutS3Object.mock.calls;

      const cpiAllCall = s3Calls.find((call) => call[0].Key === 'data/CPI_U_ALL.json');
      expect(cpiAllCall).toBeDefined();
      const cpiAllData = JSON.parse(cpiAllCall![0].Body as string);
      expect(Object.keys(cpiAllData.months)).toHaveLength(2);
      expect(cpiAllData.months['2023-01']).toBe(307.026);
      expect(cpiAllData.months['2023-02']).toBe(308.026);

      const cpiFoodCall = s3Calls.find((call) => call[0].Key === 'data/CPI_U_FOOD.json');
      expect(cpiFoodCall).toBeDefined();
      const cpiFoodData = JSON.parse(cpiFoodCall![0].Body as string);
      expect(Object.keys(cpiFoodData.months)).toHaveLength(1);
      expect(cpiFoodData.months['2023-01']).toBe(320.123);
    });

    it('should handle data with footnotes', async () => {
      fetchSpy.mockImplementation(() =>
        createMockFetchResponse({
          status: 'REQUEST_SUCCEEDED',
          Results: {
            series: [
              {
                seriesID: 'CUUR0000SA0',
                data: [
                  {
                    year: '2023',
                    period: 'M01',
                    periodName: 'January',
                    value: '307.026',
                    footnotes: [{ text: 'Preliminary data' }, { text: 'Subject to revision' }],
                  },
                ],
              },
            ],
          },
        }),
      );

      const result = await handler({}, mockContext);
      expect(result.status).toBe('success');

      const s3Call = mockPutS3Object.mock.calls[0];
      const uploadedData = JSON.parse(s3Call[0].Body as string);
      expect(uploadedData.months['2023-01']).toBe(307.026);
    });
  });

  describe('performance and edge cases', () => {
    it('should handle large datasets efficiently', async () => {
      const largeDataset = Array.from({ length: 100 }, (_, i) => ({
        year: String(2020 + Math.floor(i / 12)),
        period: `M${String((i % 12) + 1).padStart(2, '0')}`,
        periodName: 'Month',
        value: String(300 + i),
      }));

      fetchSpy.mockImplementation(() =>
        createMockFetchResponse(
          createMultiSeriesMockBlsResponse([
            {
              seriesId: 'CUUR0000SA0',
              dataPoints: largeDataset,
            },
          ]),
        ),
      );

      const result = await handler({}, mockContext);
      expect(result.status).toBe('success');

      const s3Call = mockPutS3Object.mock.calls[0];
      const uploadedData = JSON.parse(s3Call[0].Body as string);
      expect(Object.keys(uploadedData.months)).toHaveLength(100);
    });

    it('should handle BLS API data with missing fields gracefully', async () => {
      fetchSpy.mockImplementation(() =>
        createMockFetchResponse({
          status: 'REQUEST_SUCCEEDED',
          Results: {
            series: [
              {
                seriesID: 'CUUR0000SA0',
                data: [
                  {
                    year: '2023',
                    period: 'M01',
                    value: '307.026',
                    // Missing periodName and footnotes
                  },
                ],
              },
            ],
          },
        }),
      );

      const result = await handler({}, mockContext);
      expect(result.status).toBe('success');
    });

    it('should handle concurrent requests for the same series', async () => {
      const mockResponse = createMultiSeriesMockBlsResponse([
        {
          seriesId: 'CUUR0000SA0',
          dataPoints: [{ year: '2023', period: 'M01', periodName: 'January', value: '307.026' }],
        },
      ]);

      fetchSpy
        .mockImplementationOnce(() => createMockFetchResponse(mockResponse))
        .mockImplementationOnce(() => createMockFetchResponse(mockResponse));

      const event = {};

      // Simulate concurrent requests
      const [result1, result2] = await Promise.all([handler(event, mockContext), handler(event, mockContext)]);

      expect(result1.status).toBe('success');
      expect(result2.status).toBe('success');
      expect(mockPutS3Object).toHaveBeenCalledTimes(2);
    });
  });

  describe('middleware integration', () => {
    it('should successfully process requests through middleware', async () => {
      const result = await handler({ seriesIds: ['CPI_U_ALL'] }, mockContext);
      expect(result.status).toBe('success');
    });
  });
});
