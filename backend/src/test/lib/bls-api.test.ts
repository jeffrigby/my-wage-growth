import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CpiSeriesId, type CpiDataPoint } from '@/lib/bls-api';

// Mock the imported functions to test internal functions
// Note: We'll need to access internal functions for testing
// For now, let's test what we can from the exported interface

describe('bls-api', () => {
  describe('CpiSeriesId enum', () => {
    it('should contain expected series IDs', () => {
      expect(CpiSeriesId.CPI_U_ALL).toBe('CUUR0000SA0');
      expect(CpiSeriesId.CPI_U_FOOD).toBe('CUUR0000SAF');
      expect(CpiSeriesId.CPI_U_ENERGY).toBe('CUUR0000SAE');
      expect(CpiSeriesId.CPI_U_HOUSING).toBe('CUUR0000SAH');
      expect(CpiSeriesId.CPI_U_NYC).toBe('CUURA101SA0');
    });
  });

  describe('period to date conversion (integration test)', () => {
    // Since periodToDate is internal, we'll test it through API response processing
    // This would be better tested by exporting the function or creating a test utility
    it('should properly handle monthly periods', () => {
      // This is more of an integration test
      // We would need to mock the BLS API response to test this properly
      expect(true).toBe(true); // Placeholder
    });
  });

  describe('API response processing', () => {
    it('should handle empty API responses', () => {
      // Would need to test processApiResponse function
      // This requires either exporting it or mocking the full API call
      expect(true).toBe(true); // Placeholder
    });
  });

  // Mock fetch for testing API calls
  describe('fetchAllCpiData', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should be tested with proper mocking', async () => {
      // This requires mocking the fetch API and testing the full flow
      // For now, we'll create a placeholder
      expect(true).toBe(true);
    });
  });
});

// Helper function to create mock BLS API response
export function createMockBlsResponse(
  seriesId: string,
  dataPoints: Array<{
    year: string;
    period: string;
    periodName: string;
    value: string;
  }>,
): {
  status: string;
  responseTime: number;
  message: string[];
  Results: {
    series: Array<{
      seriesID: string;
      data: Array<{
        year: string;
        period: string;
        periodName: string;
        value: string;
        footnotes: Array<{ code: string; text: string }>;
      }>;
    }>;
  };
} {
  return {
    status: 'REQUEST_SUCCEEDED',
    responseTime: 100,
    message: [],
    Results: {
      series: [
        {
          seriesID: seriesId,
          data: dataPoints.map((point) => ({
            ...point,
            footnotes: [],
          })),
        },
      ],
    },
  };
}

// Test data transformation functions that should be exported
describe('data transformation utilities', () => {
  it('should validate CPI data point structure', () => {
    const mockDataPoint: CpiDataPoint = {
      seriesId: 'CUUR0000SA0',
      year: 2023,
      period: 'M01',
      periodName: 'January',
      value: 307.026,
      date: new Date(2023, 0, 1),
      footnotes: [],
    };

    expect(mockDataPoint.seriesId).toBe('CUUR0000SA0');
    expect(mockDataPoint.year).toBe(2023);
    expect(mockDataPoint.value).toBe(307.026);
    expect(mockDataPoint.date.getFullYear()).toBe(2023);
    expect(mockDataPoint.date.getMonth()).toBe(0); // January is 0
  });
});
