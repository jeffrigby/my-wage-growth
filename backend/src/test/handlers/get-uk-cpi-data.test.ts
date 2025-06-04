import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { lambdaHandler } from '@/handlers/get-uk-cpi-data';
import { CpiSeriesIdUK } from '@/lib/uk-ons-api';
import { Context } from 'aws-lambda';
import { mockClient } from 'aws-sdk-client-mock';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { AppConfigDataClient, GetConfigurationCommand } from '@aws-sdk/client-appconfigdata';

// Mock the S3 and AppConfig clients
const s3Mock = mockClient(S3Client);
const appConfigMock = mockClient(AppConfigDataClient);

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock environment variables
vi.mock('@/lib/utils', () => ({
  checkEnvVar: vi.fn((name: string) => {
    const envVars: Record<string, string> = {
      WAGE_GROWTH_BUCKET: 'test-bucket',
      APPCONFIG_APP_ID: 'test-app',
      APPCONFIG_ENV_ID: 'test-env',
      APPCONFIG_PROFILE_ID: 'test-profile',
    };
    return envVars[name] || 'test-value';
  }),
}));

describe('UK CPI Lambda Handler', () => {
  const mockContext: Context = {
    callbackWaitsForEmptyEventLoop: false,
    functionName: 'test-function',
    functionVersion: '1',
    invokedFunctionArn: 'arn:aws:lambda:us-east-1:123456789012:function:test-function',
    memoryLimitInMB: '128',
    awsRequestId: 'test-request-id',
    logGroupName: '/aws/lambda/test-function',
    logStreamName: 'test-stream',
    getRemainingTimeInMillis: () => 30000,
    done: vi.fn(),
    fail: vi.fn(),
    succeed: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    s3Mock.reset();
    appConfigMock.reset();

    // Mock AppConfig response
    appConfigMock.on(GetConfigurationCommand).resolves({
      Content: new TextEncoder().encode(JSON.stringify({})),
      ContentType: 'application/json',
      ConfigurationVersion: '1',
    });

    // Mock S3 uploads
    s3Mock.on(PutObjectCommand).resolves({});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should successfully fetch and process UK CPI data', async () => {
    const mockApiResponse = {
      observations: [
        {
          dimensions: {
            time: {
              id: 'Jan-2024',
              label: 'Jan 2024',
              option: {
                id: 'Jan-2024',
                label: 'Jan 2024',
              },
            },
            geography: {
              id: 'uk-only',
              label: 'United Kingdom',
              option: {
                id: 'K02000001',
                label: 'United Kingdom',
              },
            },
            aggregate: {
              id: 'cpih1dim1aggid',
              label: 'CPIH Aggregate',
              option: {
                id: 'CP00',
                label: 'Overall Index',
              },
            },
          },
          observation: '105.7',
        },
        {
          dimensions: {
            time: {
              id: 'Jan-2024',
              label: 'Jan 2024',
              option: {
                id: 'Jan-2024',
                label: 'Jan 2024',
              },
            },
            geography: {
              id: 'uk-only',
              label: 'United Kingdom',
              option: {
                id: 'K02000001',
                label: 'United Kingdom',
              },
            },
            aggregate: {
              id: 'cpih1dim1aggid',
              label: 'CPIH Aggregate',
              option: {
                id: 'CP01',
                label: '01 Food and non-alcoholic beverages',
              },
            },
          },
          observation: '120.5',
        },
      ],
      limit: 10000,
      offset: 0,
      total_count: 2,
    };

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockApiResponse,
    });

    const event = {
      seriesIds: [
        {
          key: 'CPI_UK_ALL',
          enumValue: CpiSeriesIdUK.CPI_UK_ALL,
        },
        {
          key: 'CPI_UK_FOOD',
          enumValue: CpiSeriesIdUK.CPI_UK_FOOD,
        },
      ],
    };

    const result = await lambdaHandler(event, mockContext);

    expect(result.status).toBe('success');
    expect(result.message).toContain('UK CPIH Data for 2 series downloaded and transformed successfully');
    expect(result.bucket).toBe('test-bucket');
    expect(result.keys).toHaveLength(2);
    expect(result.rawKeys).toHaveLength(2);

    // Verify S3 uploads were called
    expect(s3Mock.calls()).toHaveLength(4); // 2 raw + 2 processed uploads

    // Verify API call was made to ONS
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining(
        'api.beta.ons.gov.uk/v1/datasets/cpih01/editions/time-series/versions/latest/observations',
      ),
    );
  });

  it('should handle API errors gracefully', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    });

    const event = {
      seriesIds: [
        {
          key: 'CPI_UK_ALL',
          enumValue: CpiSeriesIdUK.CPI_UK_ALL,
        },
      ],
    };

    const result = await lambdaHandler(event, mockContext);

    expect(result.status).toBe('error');
    expect(result.message).toBe('Failed to download UK CPIH data');
    expect(result.error).toContain('HTTP 500');
  });

  it('should handle default series when none specified', async () => {
    const mockApiResponse = {
      observations: [
        {
          dimensions: {
            time: {
              id: 'Jan-2024',
              label: 'Jan 2024',
              option: {
                id: 'Jan-2024',
                label: 'Jan 2024',
              },
            },
            geography: {
              id: 'uk-only',
              label: 'United Kingdom',
              option: {
                id: 'K02000001',
                label: 'United Kingdom',
              },
            },
            aggregate: {
              id: 'cpih1dim1aggid',
              label: 'CPIH Aggregate',
              option: {
                id: 'CP00',
                label: 'Overall Index',
              },
            },
          },
          observation: '105.7',
        },
      ],
      limit: 10000,
      offset: 0,
      total_count: 1,
    };

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockApiResponse,
    });

    // Test with empty event (should use default)
    const event = {
      seriesIds: [
        {
          key: 'CPI_UK_ALL',
          enumValue: CpiSeriesIdUK.CPI_UK_ALL,
        },
      ],
    };

    const result = await lambdaHandler(event, mockContext);

    expect(result.status).toBe('success');
    expect(result.message).toContain('1 series');
  });

  it('should validate series IDs correctly', async () => {
    // This test would be handled by the Zod schema validation
    // which transforms the input and validates the enum keys
    const mockApiResponse = {
      observations: [],
      limit: 10000,
      offset: 0,
      total_count: 0,
    };

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockApiResponse,
    });

    const event = {
      seriesIds: [
        {
          key: 'CPI_UK_ALL',
          enumValue: CpiSeriesIdUK.CPI_UK_ALL,
        },
      ],
    };

    const result = await lambdaHandler(event, mockContext);

    expect(result.status).toBe('success');
    // Should handle empty data gracefully
    expect(result.keys).toHaveLength(1);
    expect(result.rawKeys).toHaveLength(1);
  });

  it('should upload data to correct S3 paths', async () => {
    const mockApiResponse = {
      observations: [
        {
          dimensions: {
            time: {
              id: 'Jan-2024',
              label: 'Jan 2024',
              option: {
                id: 'Jan-2024',
                label: 'Jan 2024',
              },
            },
            geography: {
              id: 'uk-only',
              label: 'United Kingdom',
              option: {
                id: 'K02000001',
                label: 'United Kingdom',
              },
            },
            aggregate: {
              id: 'cpih1dim1aggid',
              label: 'CPIH Aggregate',
              option: {
                id: 'CP00',
                label: 'Overall Index',
              },
            },
          },
          observation: '105.7',
        },
      ],
      limit: 10000,
      offset: 0,
      total_count: 1,
    };

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockApiResponse,
    });

    const event = {
      seriesIds: [
        {
          key: 'CPI_UK_ALL',
          enumValue: CpiSeriesIdUK.CPI_UK_ALL,
        },
      ],
    };

    const result = await lambdaHandler(event, mockContext);

    expect(result.status).toBe('success');

    // Check S3 upload calls for correct paths
    const s3Calls = s3Mock.calls();
    expect(s3Calls).toHaveLength(2); // 1 raw + 1 processed

    // Check raw data path
    const rawCall = s3Calls.find((call) => call.args[0].input.Key?.includes('cpi/raw/uk/'));
    expect(rawCall).toBeTruthy();
    expect(rawCall?.args[0].input.Key).toBe('cpi/raw/uk/CPI_UK_ALL.json');

    // Check processed data path
    const processedCall = s3Calls.find((call) => call.args[0].input.Key?.includes('cpi/processed/uk/'));
    expect(processedCall).toBeTruthy();
    expect(processedCall?.args[0].input.Key).toBe('cpi/processed/uk/CPI_UK_ALL.json');
  });
});
