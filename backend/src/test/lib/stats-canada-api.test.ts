import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  fetchAllCpiData,
  fetchRecentCpiData,
  CpiSeriesIdCanada,
  getFullTableDownloadUrl,
} from '@/lib/stats-canada-api';
import * as fs from 'node:fs/promises';
import { Readable } from 'node:stream';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock modules
vi.mock('node:fs/promises', () => ({
  writeFile: vi.fn(),
  unlink: vi.fn(),
  mkdir: vi.fn(),
  readdir: vi.fn(),
  rename: vi.fn(),
}));

vi.mock('unzipper', () => ({
  Extract: vi.fn(() => ({
    on: vi.fn(),
    promise: vi.fn().mockResolvedValue(undefined),
  })),
}));

vi.mock('csv-parse', () => ({
  parse: vi.fn(() => {
    const mockParser = {
      on: vi.fn((event, callback) => {
        if (event === 'readable') {
          // Simulate CSV data being read
          mockParser.read = vi
            .fn()
            .mockReturnValueOnce({
              REF_DATE: '2024-01',
              GEO: 'Canada',
              VECTOR: 'v41690973',
              VALUE: '163.4',
              UOM: '2002=100',
              STATUS: '',
            })
            .mockReturnValueOnce({
              REF_DATE: '2024-02',
              GEO: 'Canada',
              VECTOR: 'v41690973',
              VALUE: '164.1',
              UOM: '2002=100',
              STATUS: '',
            })
            .mockReturnValueOnce(null);
          callback();
        } else if (event === 'end') {
          setTimeout(() => callback(), 0);
        }
        return mockParser;
      }),
      read: vi.fn(),
    };
    return mockParser;
  }),
}));

describe('Stats Canada API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getFullTableDownloadUrl', () => {
    it('should return download URL for CPI table', async () => {
      const mockResponse = {
        status: 'SUCCESS',
        object: 'https://www150.statcan.gc.ca/n1/tbl/csv/18100004-eng.zip',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValueOnce(mockResponse),
      });

      const url = await getFullTableDownloadUrl();

      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('getFullTableDownloadCSV/18100004/en'));
      expect(url).toBe('https://www150.statcan.gc.ca/n1/tbl/csv/18100004-eng.zip');
    });

    it('should throw error on API failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      await expect(getFullTableDownloadUrl()).rejects.toThrow('HTTP 500: Internal Server Error');
    });
  });

  describe('fetchAllCpiData', () => {
    it('should fetch and parse CPI data for multiple series', async () => {
      // Mock download URL response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValueOnce({
          status: 'SUCCESS',
          object: 'https://www150.statcan.gc.ca/n1/tbl/csv/18100004-eng.zip',
        }),
      });

      // Mock ZIP file download
      const mockZipContent = Buffer.from('mock zip content');
      mockFetch.mockResolvedValueOnce({
        ok: true,
        arrayBuffer: vi.fn().mockResolvedValueOnce(mockZipContent),
      });

      // Mock file system operations
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(fs.readdir).mockResolvedValueOnce(['18100004.csv'] as any);

      // Mock createReadStream
      const mockReadStream = new Readable();
      mockReadStream.push(mockZipContent);
      mockReadStream.push(null);

      vi.doMock('node:fs', () => ({
        createReadStream: vi.fn(() => mockReadStream),
      }));

      const result = await fetchAllCpiData([CpiSeriesIdCanada.CPI_CA_ALL]);

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        seriesId: 'v41690973',
        year: 2024,
        period: 'M01',
        periodName: 'January',
        value: 163.4,
      });
      expect(result[1]).toMatchObject({
        seriesId: 'v41690973',
        year: 2024,
        period: 'M02',
        periodName: 'February',
        value: 164.1,
      });
    });
  });

  describe('fetchRecentCpiData', () => {
    it('should fetch recent CPI data using vector IDs', async () => {
      const mockResponse = [
        {
          status: 'SUCCESS',
          object: {
            responseStatusCode: 0,
            productId: 18100004,
            coordinate: '2.2.0.0.0.0.0.0.0.0',
            vectorId: 41690973,
            vectorDataPoint: [
              {
                refPer: '2024-03-01',
                value: 165.5,
                decimals: 1,
              },
              {
                refPer: '2024-04-01',
                value: 165.8,
                decimals: 1,
              },
            ],
          },
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValueOnce(mockResponse),
      });

      const result = await fetchRecentCpiData([CpiSeriesIdCanada.CPI_CA_ALL], 2);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('getDataFromVectorsAndLatestNPeriods'),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify([{ vectorId: 41690973, latestN: 2 }]),
        }),
      );

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        seriesId: 'v41690973',
        year: 2024,
        period: 'M03',
        value: 165.5,
      });
    });

    it('should handle API errors gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValueOnce([
          {
            status: 'ERROR',
            message: 'Invalid vector ID',
          },
        ]),
      });

      await expect(fetchRecentCpiData([CpiSeriesIdCanada.CPI_CA_ALL], 12)).rejects.toThrow('Stats Canada API Error');
    });
  });
});
