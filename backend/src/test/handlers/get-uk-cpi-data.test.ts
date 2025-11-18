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

// Helper to create mock CSV data
function createMockCsvData(data: Array<{ value: string; time: string; series: string; label: string }>): string {
  const header = 'v4_0,mmm-yy,Time,uk-only,Geography,cpih1dim1aggid,Aggregate';
  const rows = data.map((d) => `${d.value},${d.time},${d.time},K02000001,United Kingdom,${d.series},${d.label}`);
  return [header, ...rows].join('\n');
}

describe('get-uk-cpi-data handler - unit tests', () => {
  let handler: (event: unknown, context: unknown) => Promise<{ status: string; [key: string]: unknown }>;
  let fetchSpy: ReturnType<typeof vi.spyOn>;
  const mockContext = createMockLambdaContext();

  beforeAll(async () => {
    // Set up fetch spy
    fetchSpy = vi.spyOn(global, 'fetch') as ReturnType<typeof vi.spyOn>;

    // Import handler after mocks are set up
    const handlerModule = await import('@/handlers/get-uk-cpi-data');
    handler = handlerModule.handler;
  });

  beforeEach(() => {
    vi.clearAllMocks();

    // Default successful mocks
    mockGetAppConfig.mockResolvedValue({});
    mockPutS3Object.mockResolvedValue({});

    // Mock fetch to handle UK ONS API's two-step process
    fetchSpy.mockImplementation((url: string) => {
      // First call: Get dataset info
      if (url.includes('/datasets/cpih01') && !url.includes('download.ons.gov.uk')) {
        return createMockFetchResponse({
          links: {
            latest_version: {
              id: '18',
            },
          },
        });
      }
      // Second call: Get CSV data
      if (url.includes('download.ons.gov.uk')) {
        // Return empty CSV with headers
        return Promise.resolve({
          ok: true,
          status: 200,
          text: async () => 'v4_0,mmm-yy,Time,uk-only,Geography,cpih1dim1aggid,Aggregate\n',
        } as Response);
      }
      return createMockFetchResponse({});
    });
  });

  describe('successful execution', () => {
    it('should successfully fetch and process UK CPI data', async () => {
      const mockCsvData = createMockCsvData([
        { value: '105.7', time: 'Jan-24', series: 'CP00', label: 'Overall Index' },
        { value: '120.5', time: 'Jan-24', series: 'CP01', label: '01 Food' },
        { value: '106.2', time: 'Feb-24', series: 'CP00', label: 'Overall Index' },
        { value: '121.0', time: 'Feb-24', series: 'CP01', label: '01 Food' },
      ]);

      fetchSpy.mockImplementation((url: string) => {
        if (url.includes('/datasets/cpih01') && !url.includes('download.ons.gov.uk')) {
          return createMockFetchResponse({
            links: {
              latest_version: {
                id: '18',
              },
            },
          });
        }
        if (url.includes('download.ons.gov.uk')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            text: async () => mockCsvData,
          } as Response);
        }
        return createMockFetchResponse({});
      });

      const event = { seriesIds: ['CPI_UK_ALL', 'CPI_UK_FOOD'] };
      const result = await handler(event, mockContext);

      expect(result).toMatchObject({
        status: 'success',
        message: expect.stringContaining('2 series'),
        bucket: 'test-bucket',
      });

      expect(result.keys).toHaveLength(2);
      expect(result.rawKeys).toHaveLength(2);

      // Verify S3 uploads were called (2 raw + 2 processed)
      expect(mockPutS3Object).toHaveBeenCalledTimes(4);
    });

    it('should handle default series when none specified', async () => {
      const mockCsvData = createMockCsvData([
        { value: '105.7', time: 'Jan-24', series: 'CP00', label: 'Overall Index' },
      ]);

      fetchSpy.mockImplementation((url: string) => {
        if (url.includes('/datasets/cpih01') && !url.includes('download.ons.gov.uk')) {
          return createMockFetchResponse({
            links: {
              latest_version: {
                id: '18',
              },
            },
          });
        }
        if (url.includes('download.ons.gov.uk')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            text: async () => mockCsvData,
          } as Response);
        }
        return createMockFetchResponse({});
      });

      const result = await handler({}, mockContext);

      expect(result.status).toBe('success');
      expect(result.message).toContain('1 series');
    });

    it('should upload data to correct S3 paths', async () => {
      const mockCsvData = createMockCsvData([
        { value: '105.7', time: 'Jan-24', series: 'CP00', label: 'Overall Index' },
      ]);

      fetchSpy.mockImplementation((url: string) => {
        if (url.includes('/datasets/cpih01') && !url.includes('download.ons.gov.uk')) {
          return createMockFetchResponse({
            links: {
              latest_version: {
                id: '18',
              },
            },
          });
        }
        if (url.includes('download.ons.gov.uk')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            text: async () => mockCsvData,
          } as Response);
        }
        return createMockFetchResponse({});
      });

      const event = { seriesIds: ['CPI_UK_ALL'] };
      const result = await handler(event, mockContext);

      expect(result.status).toBe('success');

      // Check S3 upload calls for correct paths
      const s3Calls = mockPutS3Object.mock.calls;
      expect(s3Calls).toHaveLength(2); // 1 raw + 1 processed

      // Check raw data path
      const rawCall = s3Calls.find((call) => call[0].Key?.includes('cpi/raw/uk/'));
      expect(rawCall).toBeTruthy();
      expect(rawCall?.[0].Key).toBe('cpi/raw/uk/CPI_UK_ALL.json');

      // Check processed data path
      const processedCall = s3Calls.find((call) => call[0].Key?.includes('cpi/processed/uk/'));
      expect(processedCall).toBeTruthy();
      expect(processedCall?.[0].Key).toBe('cpi/processed/uk/CPI_UK_ALL.json');
    });

    it('should handle empty observations gracefully', async () => {
      // Empty CSV should trigger validation error (no data returned)
      const result = await handler({ seriesIds: ['CPI_UK_ALL'] }, mockContext);

      // Validation now treats no data as an error condition
      expect(result.status).toBe('error');
      expect(result.message).toBe('Failed to download UK CPIH data');
      expect(result.error).toContain('No CPI data returned');
    });
  });

  describe('error handling', () => {
    it('should handle API errors gracefully', async () => {
      fetchSpy.mockImplementation((url: string) => {
        if (url.includes('/datasets/cpih01')) {
          return createMockFetchResponse(
            {
              message: 'Internal Server Error',
            },
            false,
            500,
          );
        }
        return createMockFetchResponse({});
      });

      const event = { seriesIds: ['CPI_UK_ALL'] };
      const result = await handler(event, mockContext);

      expect(result.status).toBe('error');
      expect(result.message).toBe('Failed to download UK CPIH data');
      expect(result.error).toContain('500');
    }, 10000);

    it('should handle network errors', async () => {
      fetchSpy.mockRejectedValue(new Error('Network error'));

      const event = { seriesIds: ['CPI_UK_ALL'] };
      const result = await handler(event, mockContext);

      expect(result).toMatchObject({
        status: 'error',
        message: 'Failed to download UK CPIH data',
        error: expect.stringContaining('Network error'),
      });
    }, 10000);

    it('should handle S3 upload errors', async () => {
      const mockCsvData = createMockCsvData([
        { value: '105.7', time: 'Jan-24', series: 'CP00', label: 'Overall Index' },
      ]);

      fetchSpy.mockImplementation((url: string) => {
        if (url.includes('/datasets/cpih01') && !url.includes('download.ons.gov.uk')) {
          return createMockFetchResponse({
            links: {
              latest_version: {
                id: '18',
              },
            },
          });
        }
        if (url.includes('download.ons.gov.uk')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            text: async () => mockCsvData,
          } as Response);
        }
        return createMockFetchResponse({});
      });

      mockPutS3Object.mockRejectedValue(new Error('S3 Access Denied'));

      const event = { seriesIds: ['CPI_UK_ALL'] };
      const result = await handler(event, mockContext);

      expect(result).toMatchObject({
        status: 'error',
        message: 'Failed to download UK CPIH data',
        error: 'S3 Access Denied',
      });
    });

    it('should handle AppConfig errors', async () => {
      mockGetAppConfig.mockRejectedValue(new Error('Configuration not found'));

      const event = { seriesIds: ['CPI_UK_ALL'] };
      const result = await handler(event, mockContext);

      expect(result).toMatchObject({
        status: 'error',
        message: 'Failed to download UK CPIH data',
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
      const event = { seriesIds: Array(51).fill('CPI_UK_ALL') };
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
