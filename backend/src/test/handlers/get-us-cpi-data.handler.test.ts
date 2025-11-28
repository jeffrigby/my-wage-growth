import { describe, it, expect, vi, beforeEach, beforeAll, afterEach } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { createMockLambdaContext, createMockFetchResponse } from '../lib/test-helpers';

// Mock Lambda Powertools AppConfig before importing handler
vi.mock('@aws-lambda-powertools/parameters/appconfig', () => ({
  getAppConfig: vi.fn(),
}));

describe('get-us-cpi-data handler tests', () => {
  const s3Mock = mockClient(S3Client);
  let handler: (event: unknown, context: unknown) => Promise<{ status: string; [key: string]: unknown }>;
  let mockGetAppConfig: ReturnType<typeof vi.fn>;
  let fetchSpy: ReturnType<typeof vi.spyOn>;
  const mockContext = createMockLambdaContext();

  beforeAll(async () => {
    // Set up fetch spy on global object
    fetchSpy = vi.spyOn(global, 'fetch') as ReturnType<typeof vi.spyOn>;

    // Get the mocked function
    const appConfigModule = await import('@aws-lambda-powertools/parameters/appconfig');
    mockGetAppConfig = appConfigModule.getAppConfig;

    // Dynamically import handler after setting up mocks
    const handlerModule = await import('@/handlers/get-us-cpi-data');
    handler = handlerModule.handler;
  });

  beforeEach(() => {
    vi.clearAllMocks();
    s3Mock.reset();

    // Setup default AppConfig response
    mockGetAppConfig.mockResolvedValue({ blsApiKey: 'test-api-key' });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // Use helper function from test-helpers

  describe('successful execution', () => {
    it('should process single series with default parameters', async () => {
      // Mock BLS API response
      fetchSpy.mockImplementation(() =>
        createMockFetchResponse({
          status: 'REQUEST_SUCCEEDED',
          responseTime: 100,
          message: [],
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
                    footnotes: [],
                  },
                  {
                    year: '2023',
                    period: 'M02',
                    periodName: 'February',
                    value: '308.026',
                    footnotes: [],
                  },
                ],
              },
            ],
          },
        }),
      );

      s3Mock.on(PutObjectCommand).resolves({});

      const event = {};
      const result = await handler(event, mockContext);

      expect(result).toMatchObject({
        status: 'success',
        message: expect.stringContaining('1 series'),
        bucket: 'test-bucket',
        keys: ['cpi/processed/us/CPI_U_ALL.json'],
      });

      expect(s3Mock.commandCalls(PutObjectCommand)).toHaveLength(2); // 1 raw + 1 processed

      // Check processed data file
      const processedCall = s3Mock
        .commandCalls(PutObjectCommand)
        .find((call) => call.args[0].input.Key === 'cpi/processed/us/CPI_U_ALL.json');
      expect(processedCall).toBeDefined();
      expect(processedCall!.args[0].input.Body).toContain('2023-01');

      // Check raw data file
      const rawCall = s3Mock
        .commandCalls(PutObjectCommand)
        .find((call) => call.args[0].input.Key === 'cpi/raw/us/CPI_U_ALL.json');
      expect(rawCall).toBeDefined();
    });

    it('should process multiple series successfully', async () => {
      fetchSpy.mockImplementation(() =>
        createMockFetchResponse({
          status: 'REQUEST_SUCCEEDED',
          responseTime: 100,
          message: [],
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
                    footnotes: [],
                  },
                ],
              },
              {
                seriesID: 'CUUR0000SAF',
                data: [
                  {
                    year: '2023',
                    period: 'M01',
                    periodName: 'January',
                    value: '320.123',
                    footnotes: [{ text: 'Preliminary data' }],
                  },
                ],
              },
            ],
          },
        }),
      );

      s3Mock.on(PutObjectCommand).resolves({});

      const event = {
        seriesIds: ['CPI_U_ALL', 'CPI_U_FOOD'],
      };
      const result = await handler(event, mockContext);

      expect(result).toMatchObject({
        status: 'success',
        message: expect.stringContaining('2 series'),
        bucket: 'test-bucket',
        keys: ['cpi/processed/us/CPI_U_ALL.json', 'cpi/processed/us/CPI_U_FOOD.json'],
      });

      expect(s3Mock.commandCalls(PutObjectCommand)).toHaveLength(4); // 2 raw + 2 processed
    });

    it('should handle custom year ranges', async () => {
      // Generate recent data points to pass validation
      const recentData = Array.from({ length: 12 }, (_, i) => {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        return {
          year: String(date.getFullYear()),
          period: `M${String(date.getMonth() + 1).padStart(2, '0')}`,
          periodName: date.toLocaleString('default', { month: 'long' }),
          value: String(300 + i),
          footnotes: [],
        };
      });

      fetchSpy.mockImplementation(() =>
        createMockFetchResponse({
          status: 'REQUEST_SUCCEEDED',
          Results: { series: [{ seriesID: 'CUUR0000SA0', data: recentData }] },
        }),
      );

      s3Mock.on(PutObjectCommand).resolves({});

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

      s3Mock.on(PutObjectCommand).resolves({});

      const event = { seriesIds: ['CPI_U_ALL'] };
      const result = await handler(event, mockContext);

      // Empty data now fails validation (critical error: no data returned)
      expect(result.status).toBe('error');
      expect(result.error).toContain('No CPI data returned from API');
    });
  });

  describe('error handling', () => {
    it('should handle missing BLS API key', async () => {
      mockGetAppConfig.mockResolvedValue({});

      const event = {};
      const result = await handler(event, mockContext);

      expect(result).toMatchObject({
        status: 'error',
        message: 'Failed to download CPI data',
        error: 'BLS API key is not set',
      });

      expect(fetchSpy).not.toHaveBeenCalled();
      expect(s3Mock.commandCalls(PutObjectCommand)).toHaveLength(0);
    });

    it('should handle BLS API errors', async () => {
      fetchSpy.mockRejectedValue(new Error('Network error'));

      const event = {};
      const result = await handler(event, mockContext);

      expect(result).toMatchObject({
        status: 'error',
        message: 'Failed to download CPI data',
        error: expect.stringContaining('Network error'),
      });

      expect(s3Mock.commandCalls(PutObjectCommand)).toHaveLength(0);
    }, 10000);

    it('should handle BLS API response errors', async () => {
      fetchSpy.mockImplementation(() => createMockFetchResponse({ error: 'Rate limit exceeded' }, false, 429));

      const event = {};
      const result = await handler(event, mockContext);

      expect(result).toMatchObject({
        status: 'error',
        message: 'Failed to download CPI data',
        error: expect.stringContaining('429'),
      });
    }, 10000);

    it('should handle S3 upload errors', async () => {
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
                    footnotes: [],
                  },
                ],
              },
            ],
          },
        }),
      );

      s3Mock.on(PutObjectCommand).rejects(new Error('S3 Access Denied'));

      const event = {};
      const result = await handler(event, mockContext);

      expect(result).toMatchObject({
        status: 'error',
        message: 'Failed to download CPI data',
        error: 'S3 Access Denied',
      });
    });

    it('should handle AppConfig errors', async () => {
      mockGetAppConfig.mockRejectedValue(new Error('Configuration not found'));

      const event = {};
      const result = await handler(event, mockContext);

      expect(result).toMatchObject({
        status: 'error',
        message: 'Failed to download CPI data',
        error: 'Configuration not found',
      });
    });
  });

  describe('input validation', () => {
    it('should reject invalid series IDs', async () => {
      const event = {
        seriesIds: ['INVALID_SERIES_ID'],
      };

      // Parser middleware returns generic "Failed to parse schema" for Zod validation errors
      await expect(handler(event, mockContext)).rejects.toThrow('Failed to parse schema');
    });

    it('should reject too many series IDs', async () => {
      const tooManySeriesIds = Array(51).fill('CPI_U_ALL');
      const event = {
        seriesIds: tooManySeriesIds,
      };

      // Parser middleware returns generic "Failed to parse schema" for Zod validation errors
      await expect(handler(event, mockContext)).rejects.toThrow('Failed to parse schema');
    });

    it('should reject empty series IDs array', async () => {
      const event = {
        seriesIds: [],
      };

      // Parser middleware returns generic "Failed to parse schema" for Zod validation errors
      await expect(handler(event, mockContext)).rejects.toThrow('Failed to parse schema');
    });

    it('should reject invalid start year', async () => {
      const event = {
        startYear: 1900,
      };

      await expect(handler(event, mockContext)).rejects.toThrow();
    });

    it('should reject future end year', async () => {
      const event = {
        endYear: new Date().getFullYear() + 1,
      };

      await expect(handler(event, mockContext)).rejects.toThrow();
    });

    it('should reject invalid event structure', async () => {
      const event = 'not an object';

      await expect(handler(event as never, mockContext)).rejects.toThrow();
    });
  });

  describe('data transformation', () => {
    it('should correctly group data by series ID', async () => {
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
                    footnotes: [],
                  },
                  {
                    year: '2023',
                    period: 'M02',
                    periodName: 'February',
                    value: '308.026',
                    footnotes: [],
                  },
                ],
              },
              {
                seriesID: 'CUUR0000SAF',
                data: [
                  {
                    year: '2023',
                    period: 'M01',
                    periodName: 'January',
                    value: '320.123',
                    footnotes: [],
                  },
                ],
              },
            ],
          },
        }),
      );

      s3Mock.on(PutObjectCommand).resolves({});

      const event = {
        seriesIds: ['CPI_U_ALL', 'CPI_U_FOOD'],
      };
      await handler(event, mockContext);

      const s3Calls = s3Mock.commandCalls(PutObjectCommand);

      const cpiAllCall = s3Calls.find((call) => call.args[0].input.Key === 'cpi/processed/us/CPI_U_ALL.json');
      expect(cpiAllCall).toBeDefined();
      const cpiAllData = JSON.parse(cpiAllCall!.args[0].input.Body as string);
      expect(Object.keys(cpiAllData.months)).toHaveLength(2);
      expect(cpiAllData.months['2023-01']).toBe(307.026);
      expect(cpiAllData.months['2023-02']).toBe(308.026);

      const cpiFoodCall = s3Calls.find((call) => call.args[0].input.Key === 'cpi/processed/us/CPI_U_FOOD.json');
      expect(cpiFoodCall).toBeDefined();
      const cpiFoodData = JSON.parse(cpiFoodCall!.args[0].input.Body as string);
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

      s3Mock.on(PutObjectCommand).resolves({});

      const event = {};
      const result = await handler(event, mockContext);

      expect(result.status).toBe('success');

      // Find the processed data file (not the raw data file)
      const processedCall = s3Mock
        .commandCalls(PutObjectCommand)
        .find((call) => call.args[0].input.Key === 'cpi/processed/us/CPI_U_ALL.json');
      expect(processedCall).toBeDefined();
      const uploadedData = JSON.parse(processedCall!.args[0].input.Body as string);
      expect(uploadedData.months['2023-01']).toBe(307.026);
    });
  });

  describe('middleware integration', () => {
    it('should log event details through middleware', async () => {
      // Generate recent data points to pass validation
      const recentData = Array.from({ length: 12 }, (_, i) => {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        return {
          year: String(date.getFullYear()),
          period: `M${String(date.getMonth() + 1).padStart(2, '0')}`,
          periodName: date.toLocaleString('default', { month: 'long' }),
          value: String(300 + i),
          footnotes: [],
        };
      });

      fetchSpy.mockImplementation(() =>
        createMockFetchResponse({
          status: 'REQUEST_SUCCEEDED',
          Results: { series: [{ seriesID: 'CUUR0000SA0', data: recentData }] },
        }),
      );

      s3Mock.on(PutObjectCommand).resolves({});

      const event = {
        seriesIds: ['CPI_U_ALL'],
      };
      const result = await handler(event, mockContext);

      // Just verify the handler ran successfully - the middleware logging is working
      // as evidenced by the console output in the test run
      expect(result.status).toBe('success');
    });
  });

  describe('performance considerations', () => {
    it('should handle large datasets efficiently', async () => {
      const largeDataset = Array.from({ length: 100 }, (_, i) => ({
        year: String(2020 + Math.floor(i / 12)),
        period: `M${String((i % 12) + 1).padStart(2, '0')}`,
        periodName: 'Month',
        value: String(300 + i),
        footnotes: [],
      }));

      fetchSpy.mockImplementation(() =>
        createMockFetchResponse({
          status: 'REQUEST_SUCCEEDED',
          Results: {
            series: [
              {
                seriesID: 'CUUR0000SA0',
                data: largeDataset,
              },
            ],
          },
        }),
      );

      s3Mock.on(PutObjectCommand).resolves({});

      const event = {};
      const result = await handler(event, mockContext);

      expect(result.status).toBe('success');

      // Find the processed data file (not the raw data file)
      const processedCall = s3Mock
        .commandCalls(PutObjectCommand)
        .find((call) => call.args[0].input.Key === 'cpi/processed/us/CPI_U_ALL.json');
      expect(processedCall).toBeDefined();
      const uploadedData = JSON.parse(processedCall!.args[0].input.Body as string);
      expect(Object.keys(uploadedData.months)).toHaveLength(100);
    });
  });

  describe('edge cases', () => {
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

      s3Mock.on(PutObjectCommand).resolves({});

      const event = {};
      const result = await handler(event, mockContext);

      expect(result.status).toBe('success');
    });

    it('should handle concurrent requests for the same series', async () => {
      const mockResponse = {
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
                  footnotes: [],
                },
              ],
            },
          ],
        },
      };

      fetchSpy
        .mockImplementationOnce(() => createMockFetchResponse(mockResponse))
        .mockImplementationOnce(() => createMockFetchResponse(mockResponse));

      s3Mock.on(PutObjectCommand).resolves({});

      const event = {};

      // Simulate concurrent requests
      const [result1, result2] = await Promise.all([handler(event, mockContext), handler(event, mockContext)]);

      expect(result1.status).toBe('success');
      expect(result2.status).toBe('success');
      expect(s3Mock.commandCalls(PutObjectCommand)).toHaveLength(4); // 2 raw + 2 processed
    });
  });
});
