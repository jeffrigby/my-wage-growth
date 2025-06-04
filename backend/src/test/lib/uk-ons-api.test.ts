import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchAllCpiData, fetchCpiDataForPeriod, CpiSeriesIdUK } from '@/lib/uk-ons-api';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('UK ONS API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('fetchAllCpiData', () => {
    it('should fetch and transform UK CPIH data successfully', async () => {
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
                id: 'Feb-2024',
                label: 'Feb 2024',
                option: {
                  id: 'Feb-2024',
                  label: 'Feb 2024',
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
            observation: '106.2',
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

      const result = await fetchAllCpiData([CpiSeriesIdUK.CPI_UK_ALL]);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining(
          'api.beta.ons.gov.uk/v1/datasets/cpih01/editions/time-series/versions/latest/observations',
        ),
      );

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        seriesId: 'CP00',
        year: 2024,
        period: 'Jan-2024',
        periodName: 'Jan 2024',
        value: 105.7,
        date: new Date(2024, 0, 1), // January 1, 2024
        footnotes: [],
      });

      expect(result[1]).toEqual({
        seriesId: 'CP00',
        year: 2024,
        period: 'Feb-2024',
        periodName: 'Feb 2024',
        value: 106.2,
        date: new Date(2024, 1, 1), // February 1, 2024
        footnotes: [],
      });
    });

    it('should handle multiple series IDs', async () => {
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

      const result = await fetchAllCpiData([CpiSeriesIdUK.CPI_UK_ALL, CpiSeriesIdUK.CPI_UK_FOOD]);

      expect(result).toHaveLength(2);
      expect(result.find((item) => item.seriesId === 'CP00')).toBeTruthy();
      expect(result.find((item) => item.seriesId === 'CP01')).toBeTruthy();
    });

    it('should handle API errors gracefully', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      await expect(fetchAllCpiData([CpiSeriesIdUK.CPI_UK_ALL])).rejects.toThrow('HTTP 500: Internal Server Error');
    });

    it('should filter out invalid observations', async () => {
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
            observation: 'NaN', // Invalid value
          },
          {
            dimensions: {
              time: {
                id: 'Feb-2024',
                label: 'Feb 2024',
                option: {
                  id: 'Feb-2024',
                  label: 'Feb 2024',
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
            observation: '106.2', // Valid value
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

      const result = await fetchAllCpiData([CpiSeriesIdUK.CPI_UK_ALL]);

      // Should only include the valid observation
      expect(result).toHaveLength(1);
      expect(result[0].value).toBe(106.2);
    });
  });

  describe('fetchCpiDataForPeriod', () => {
    it('should fetch data for a specific time period', async () => {
      const mockApiResponse = {
        observations: [
          {
            dimensions: {
              time: {
                id: 'Jan-2023',
                label: 'Jan 2023',
                option: {
                  id: 'Jan-2023',
                  label: 'Jan 2023',
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
            observation: '100.5',
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

      const result = await fetchCpiDataForPeriod([CpiSeriesIdUK.CPI_UK_ALL], 2023, 2023);

      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('time=Jan 2023,Feb 2023'));

      expect(result).toHaveLength(1);
      expect(result[0].year).toBe(2023);
    });
  });

  describe('CpiSeriesIdUK enum', () => {
    it('should have all expected UK CPI series identifiers', () => {
      expect(CpiSeriesIdUK.CPI_UK_ALL).toBe('CP00');
      expect(CpiSeriesIdUK.CPI_UK_FOOD).toBe('CP01');
      expect(CpiSeriesIdUK.CPI_UK_ALCOHOL_TOBACCO).toBe('CP02');
      expect(CpiSeriesIdUK.CPI_UK_CLOTHING).toBe('CP03');
      expect(CpiSeriesIdUK.CPI_UK_HOUSING).toBe('CP04');
      expect(CpiSeriesIdUK.CPI_UK_HOUSEHOLD).toBe('CP05');
      expect(CpiSeriesIdUK.CPI_UK_HEALTH).toBe('CP06');
      expect(CpiSeriesIdUK.CPI_UK_TRANSPORT).toBe('CP07');
      expect(CpiSeriesIdUK.CPI_UK_COMMUNICATION).toBe('CP08');
      expect(CpiSeriesIdUK.CPI_UK_RECREATION).toBe('CP09');
      expect(CpiSeriesIdUK.CPI_UK_EDUCATION).toBe('CP10');
      expect(CpiSeriesIdUK.CPI_UK_RESTAURANTS).toBe('CP11');
      expect(CpiSeriesIdUK.CPI_UK_MISCELLANEOUS).toBe('CP12');
    });
  });
});
