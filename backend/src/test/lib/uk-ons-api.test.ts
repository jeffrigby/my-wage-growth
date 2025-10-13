import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchAllCpiData, CpiSeriesIdUK } from '@/lib/uk-ons-api';

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
      // Mock version info response
      const mockVersionResponse = {
        links: {
          latest_version: {
            id: '15',
          },
        },
      };

      // Mock CSV data
      const mockCsvData = `v4_0,mmm-yy,Time,uk-only,Geography,cpih1dim1aggid,Aggregate
105.7,Jan-24,Jan-24,K02000001,United Kingdom,CP00,Overall Index
106.2,Feb-24,Feb-24,K02000001,United Kingdom,CP00,Overall Index`;

      // First call: version info
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValueOnce(mockVersionResponse),
      });

      // Second call: CSV download
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: vi.fn().mockResolvedValueOnce(mockCsvData),
      });

      const result = await fetchAllCpiData([CpiSeriesIdUK.CPI_UK_ALL]);

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        seriesId: 'CP00',
        year: 2024,
        period: 'Jan-24',
        periodName: 'Jan-24',
        value: 105.7,
      });

      expect(result[1]).toMatchObject({
        seriesId: 'CP00',
        year: 2024,
        period: 'Feb-24',
        periodName: 'Feb-24',
        value: 106.2,
      });
    });

    it('should handle multiple series IDs', async () => {
      // Mock version info response
      const mockVersionResponse = {
        links: {
          latest_version: {
            id: '15',
          },
        },
      };

      // Mock CSV data with multiple series
      const mockCsvData = `v4_0,mmm-yy,Time,uk-only,Geography,cpih1dim1aggid,Aggregate
105.7,Jan-24,Jan-24,K02000001,United Kingdom,CP00,Overall Index
120.5,Jan-24,Jan-24,K02000001,United Kingdom,CP01,Food and non-alcoholic beverages`;

      // First call: version info
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValueOnce(mockVersionResponse),
      });

      // Second call: CSV download
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: vi.fn().mockResolvedValueOnce(mockCsvData),
      });

      const result = await fetchAllCpiData([CpiSeriesIdUK.CPI_UK_ALL, CpiSeriesIdUK.CPI_UK_FOOD]);

      expect(result).toHaveLength(2);
      expect(result.find((item) => item.seriesId === 'CP00')).toBeTruthy();
      expect(result.find((item) => item.seriesId === 'CP01')).toBeTruthy();
    });

    // Removed: Testing p-retry library behavior, not business logic
    // it('should handle API errors gracefully', async () => { ... });

    it('should filter out invalid observations', async () => {
      // Mock version info response
      const mockVersionResponse = {
        links: {
          latest_version: {
            id: '15',
          },
        },
      };

      // Mock CSV data with invalid value (NaN) and valid value
      const mockCsvData = `v4_0,mmm-yy,Time,uk-only,Geography,cpih1dim1aggid,Aggregate
NaN,Jan-24,Jan-24,K02000001,United Kingdom,CP00,Overall Index
106.2,Feb-24,Feb-24,K02000001,United Kingdom,CP00,Overall Index`;

      // First call: version info
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValueOnce(mockVersionResponse),
      });

      // Second call: CSV download
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: vi.fn().mockResolvedValueOnce(mockCsvData),
      });

      const result = await fetchAllCpiData([CpiSeriesIdUK.CPI_UK_ALL]);

      // Should only include the valid observation
      expect(result).toHaveLength(1);
      expect(result[0].value).toBe(106.2);
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
