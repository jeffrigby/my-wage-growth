import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { handler } from '@/handlers/get-canadian-cpi-data';
import { getLogger } from '@/lib/logger';
import * as statsCanadaApi from '@/lib/stats-canada-api';
import * as awsS3 from '@/lib/aws.s3';
import * as awsAppconfig from '@/lib/aws.appconfig';
import { cleanupMockLogger, createMockContext, mockLogger } from '../lib/test-helpers';

// Mock external dependencies
vi.mock('@/lib/logger');
vi.mock('@/lib/stats-canada-api');
vi.mock('@/lib/aws.s3');
vi.mock('@/lib/aws.appconfig');

// Mock environment variables
process.env.WAGE_GROWTH_BUCKET = 'test-bucket';

describe('GetCanadianCPIData Handler', () => {
  const mockContext = createMockContext();

  beforeEach(() => {
    vi.clearAllMocks();
    mockLogger();

    // Mock AWS AppConfig
    vi.mocked(awsAppconfig.getWageGrowthConfig).mockResolvedValue({
      blsApiKey: 'not-used-for-canada',
      appName: 'wage-growth',
      environment: 'test',
    });

    // Mock S3 operations
    vi.mocked(awsS3.putS3Object).mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanupMockLogger();
  });

  it('should successfully fetch and store Canadian CPI data', async () => {
    const mockCpiData = [
      {
        seriesId: 'v41690973',
        year: 2024,
        period: 'M01',
        periodName: 'January',
        value: 163.4,
        date: new Date('2024-01-01'),
        footnotes: [],
      },
      {
        seriesId: 'v41690973',
        year: 2024,
        period: 'M02',
        periodName: 'February',
        value: 164.1,
        date: new Date('2024-02-01'),
        footnotes: [],
      },
    ];

    vi.mocked(statsCanadaApi.fetchAllCpiData).mockResolvedValue(mockCpiData);

    const event = {
      seriesIds: ['CPI_CA_ALL'],
    };

    const result = await handler(event, mockContext);

    expect(result).toEqual({
      statusCode: 200,
      body: JSON.stringify({
        status: 'success',
        message: 'Canadian CPI Data for 1 series downloaded and transformed successfully',
        bucket: 'test-bucket',
        keys: ['data/ca/CPI_CA_ALL.json'],
        rawKeys: ['data/raw/ca/CPI_CA_ALL.json'],
      }),
    });

    // Verify Stats Canada API was called
    expect(statsCanadaApi.fetchAllCpiData).toHaveBeenCalledWith([statsCanadaApi.CpiSeriesIdCanada.CPI_CA_ALL]);

    // Verify S3 uploads
    expect(awsS3.putS3Object).toHaveBeenCalledTimes(2); // Raw + processed

    // Verify raw data upload
    expect(awsS3.putS3Object).toHaveBeenCalledWith(
      expect.objectContaining({
        Bucket: 'test-bucket',
        Key: 'data/raw/ca/CPI_CA_ALL.json',
        Body: expect.stringContaining('"seriesId":"v41690973"'),
      }),
    );

    // Verify processed data upload
    expect(awsS3.putS3Object).toHaveBeenCalledWith(
      expect.objectContaining({
        Bucket: 'test-bucket',
        Key: 'data/ca/CPI_CA_ALL.json',
        Body: expect.stringContaining('"2024-01":163.4'),
      }),
    );
  });

  it('should handle multiple series', async () => {
    const mockCpiData = [
      {
        seriesId: 'v41690973',
        year: 2024,
        period: 'M01',
        periodName: 'January',
        value: 163.4,
        date: new Date('2024-01-01'),
        footnotes: [],
      },
      {
        seriesId: 'v41690974',
        year: 2024,
        period: 'M01',
        periodName: 'January',
        value: 194.5,
        date: new Date('2024-01-01'),
        footnotes: [],
      },
    ];

    vi.mocked(statsCanadaApi.fetchAllCpiData).mockResolvedValue(mockCpiData);

    const event = {
      seriesIds: ['CPI_CA_ALL', 'CPI_CA_FOOD'],
    };

    const result = await handler(event, mockContext);

    expect(result).toEqual({
      statusCode: 200,
      body: JSON.stringify({
        status: 'success',
        message: 'Canadian CPI Data for 2 series downloaded and transformed successfully',
        bucket: 'test-bucket',
        keys: ['data/ca/CPI_CA_ALL.json', 'data/ca/CPI_CA_FOOD.json'],
        rawKeys: ['data/raw/ca/CPI_CA_ALL.json', 'data/raw/ca/CPI_CA_FOOD.json'],
      }),
    });

    expect(awsS3.putS3Object).toHaveBeenCalledTimes(4); // 2 raw + 2 processed
  });

  it('should handle API errors gracefully', async () => {
    vi.mocked(statsCanadaApi.fetchAllCpiData).mockRejectedValue(new Error('Stats Canada API Error'));

    const event = {
      seriesIds: ['CPI_CA_ALL'],
    };

    const result = await handler(event, mockContext);

    expect(result).toEqual({
      statusCode: 200,
      body: JSON.stringify({
        status: 'error',
        message: 'Failed to download Canadian CPI data',
        error: 'Stats Canada API Error',
      }),
    });

    const logger = getLogger();
    expect(logger.error).toHaveBeenCalledWith(
      'Error downloading Canadian CPI data',
      expect.objectContaining({
        error: expect.any(Error),
      }),
    );
  });

  it('should validate series IDs', async () => {
    const event = {
      seriesIds: ['INVALID_SERIES'],
    };

    const result = await handler(event, mockContext);

    expect(result).toEqual({
      statusCode: 400,
      body: expect.stringContaining('Invalid series ID: INVALID_SERIES'),
    });
  });

  it('should use default series if none provided', async () => {
    vi.mocked(statsCanadaApi.fetchAllCpiData).mockResolvedValue([]);

    const event = {};

    await handler(event, mockContext);

    expect(statsCanadaApi.fetchAllCpiData).toHaveBeenCalledWith([statsCanadaApi.CpiSeriesIdCanada.CPI_CA_ALL]);
  });
});
