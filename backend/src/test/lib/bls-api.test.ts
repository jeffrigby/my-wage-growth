import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CpiSeriesId, fetchAllCpiData, fetchMultipleCpiData } from '@/lib/bls-api';
import { createMockBlsResponse } from '@/test/lib/test-helpers';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock p-retry to avoid delays in tests
vi.mock('p-retry', () => ({
  default: (fn: () => Promise<unknown>) => fn(),
}));

// Mock setTimeout to avoid delays
vi.mock('node:timers/promises', () => ({
  setTimeout: vi.fn().mockResolvedValue(undefined),
}));

describe('bls-api', () => {
  describe('CpiSeriesId enum', () => {
    it('should contain expected series IDs', () => {
      expect(CpiSeriesId.CPI_U_ALL).toBe('CUUR0000SA0');
      expect(CpiSeriesId.CPI_U_FOOD).toBe('CUUR0000SAF');
      expect(CpiSeriesId.CPI_U_ENERGY).toBe('CUUR0000SAE');
      expect(CpiSeriesId.CPI_U_HOUSING).toBe('CUUR0000SAH');
    });
  });

  describe('fetchAllCpiData', () => {
    beforeEach(() => {
      vi.clearAllMocks();
      mockFetch.mockReset();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should fetch CPI data for a single series', async () => {
      const mockResponse = createMockBlsResponse('CUUR0000SA0', [
        { year: '2023', period: 'M01', periodName: 'January', value: '299.170' },
        { year: '2023', period: 'M02', periodName: 'February', value: '300.840' },
      ]);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await fetchAllCpiData('test-api-key', CpiSeriesId.CPI_U_ALL, 2023, 2023);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.bls.gov/publicAPI/v2/timeseries/data/',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            seriesid: ['CUUR0000SA0'],
            startyear: '2023',
            endyear: '2023',
            registrationkey: 'test-api-key',
          }),
        }),
      );

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        seriesId: 'CUUR0000SA0',
        year: 2023,
        period: 'M01',
        value: 299.17,
      });
      expect(result[0].date).toEqual(new Date(2023, 0, 1));
    });

    it('should handle year ranges that require multiple requests', async () => {
      // Create mock responses for multiple year ranges
      const mockResponse1 = createMockBlsResponse('CUUR0000SA0', [
        { year: '2000', period: 'M01', periodName: 'January', value: '168.800' },
      ]);
      const mockResponse2 = createMockBlsResponse('CUUR0000SA0', [
        { year: '2020', period: 'M01', periodName: 'January', value: '257.971' },
      ]);

      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => mockResponse1 })
        .mockResolvedValueOnce({ ok: true, json: async () => mockResponse2 });

      const result = await fetchAllCpiData('test-api-key', CpiSeriesId.CPI_U_ALL, 2000, 2023);

      // Should make 2 requests (2000-2019, 2020-2023)
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result).toHaveLength(2);
      expect(result[0].year).toBe(2000);
      expect(result[1].year).toBe(2020);
    });

    it('should handle API errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(fetchAllCpiData('test-api-key', CpiSeriesId.CPI_U_ALL, 2023, 2023)).rejects.toThrow('Network error');
    });

    it('should handle BLS API error responses', async () => {
      const errorResponse = {
        status: 'REQUEST_FAILED',
        responseTime: 100,
        message: ['Invalid API key'],
        Results: { series: [] },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => errorResponse,
      });

      await expect(fetchAllCpiData('test-api-key', CpiSeriesId.CPI_U_ALL, 2023, 2023)).rejects.toThrow(
        'BLS API Error: Invalid API key',
      );
    });

    it('should filter out invalid data points', async () => {
      const mockResponse = createMockBlsResponse('CUUR0000SA0', [
        { year: '2023', period: 'M01', periodName: 'January', value: '299.170' },
        { year: '2023', period: 'M02', periodName: 'February', value: 'NaN' }, // Invalid value
        { year: '2023', period: 'Q01', periodName: 'Q1', value: '300.000' }, // Quarterly data
        { year: '2023', period: 'M03', periodName: 'March', value: '301.550' },
      ]);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await fetchAllCpiData('test-api-key', CpiSeriesId.CPI_U_ALL, 2023, 2023);

      // Should only include valid monthly data points
      expect(result).toHaveLength(2);
      expect(result[0].period).toBe('M01');
      expect(result[1].period).toBe('M03');
    });
  });

  describe('fetchMultipleCpiData', () => {
    beforeEach(() => {
      vi.clearAllMocks();
      mockFetch.mockReset();
    });

    it('should fetch data for multiple series', async () => {
      const mockResponse = {
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
                  value: '299.170',
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
                  value: '328.049',
                  footnotes: [],
                },
              ],
            },
          ],
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await fetchMultipleCpiData(
        'test-api-key',
        [CpiSeriesId.CPI_U_ALL, CpiSeriesId.CPI_U_FOOD],
        2023,
        2023,
      );

      expect(result).toHaveLength(2);
      expect(result.find((d) => d.seriesId === 'CUUR0000SA0')).toBeDefined();
      expect(result.find((d) => d.seriesId === 'CUUR0000SAF')).toBeDefined();
    });

    it('should batch series when exceeding API limits', async () => {
      // Create array of 30 series IDs (exceeds 25 limit)
      const manySeriesIds = Array(30)
        .fill(null)
        .map((_, i) => `SERIES${i}`);

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          status: 'REQUEST_SUCCEEDED',
          responseTime: 100,
          message: [],
          Results: { series: [] },
        }),
      });

      await fetchMultipleCpiData('test-api-key', manySeriesIds as CpiSeriesId[], 2023, 2023);

      // Should make 2 requests (25 + 5 series)
      expect(mockFetch).toHaveBeenCalledTimes(2);

      // First call should have 25 series
      const firstCall = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(firstCall.seriesid).toHaveLength(25);

      // Second call should have 5 series
      const secondCall = JSON.parse(mockFetch.mock.calls[1][1].body);
      expect(secondCall.seriesid).toHaveLength(5);
    });

    it('should handle HTTP errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      await expect(fetchMultipleCpiData('test-api-key', [CpiSeriesId.CPI_U_ALL], 2023, 2023)).rejects.toThrow(
        'HTTP 500: Internal Server Error',
      );
    });
  });

  describe('edge cases', () => {
    it('should handle M13 periods (annual average)', async () => {
      const mockResponse = createMockBlsResponse('CUUR0000SA0', [
        { year: '2023', period: 'M13', periodName: 'Annual', value: '304.702' },
      ]);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await fetchAllCpiData('test-api-key', CpiSeriesId.CPI_U_ALL, 2023, 2023);

      expect(result).toHaveLength(1);
      expect(result[0].date.getFullYear()).toBe(2023);
      expect(result[0].date.getMonth()).toBe(11); // December
      expect(result[0].date.getDate()).toBe(31);
    });

    it('should handle empty series data', async () => {
      const mockResponse = {
        status: 'REQUEST_SUCCEEDED',
        responseTime: 100,
        message: [],
        Results: { series: [] },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await fetchAllCpiData('test-api-key', CpiSeriesId.CPI_U_ALL, 2023, 2023);

      expect(result).toEqual([]);
    });

    it('should sort results chronologically', async () => {
      const mockResponse = createMockBlsResponse('CUUR0000SA0', [
        { year: '2023', period: 'M03', periodName: 'March', value: '301.550' },
        { year: '2023', period: 'M01', periodName: 'January', value: '299.170' },
        { year: '2023', period: 'M02', periodName: 'February', value: '300.840' },
      ]);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await fetchAllCpiData('test-api-key', CpiSeriesId.CPI_U_ALL, 2023, 2023);

      expect(result[0].period).toBe('M01');
      expect(result[1].period).toBe('M02');
      expect(result[2].period).toBe('M03');
    });
  });
});
