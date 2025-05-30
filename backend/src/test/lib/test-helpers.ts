import { Context } from 'aws-lambda';

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

/**
 * Creates a mock AWS Lambda context for testing
 */
export function createMockLambdaContext(): Context {
  return {
    callbackWaitsForEmptyEventLoop: false,
    functionName: 'test-function',
    functionVersion: '1',
    invokedFunctionArn: 'arn:aws:lambda:us-east-1:123456789012:function:test-function',
    memoryLimitInMB: '128',
    awsRequestId: 'test-request-id',
    logGroupName: '/aws/lambda/test-function',
    logStreamName: '2023/01/01/[$LATEST]test',
    getRemainingTimeInMillis: () => 30000,
    done: () => {},
    fail: () => {},
    succeed: () => {},
  };
}

/**
 * Creates a mock fetch response for testing
 */
export function createMockFetchResponse(data: unknown, ok = true, status = 200): Promise<Response> {
  return Promise.resolve({
    ok,
    status,
    statusText: ok ? 'OK' : 'Error',
    json: () => Promise.resolve(data),
  } as Response);
}

/**
 * Creates multiple series mock BLS response
 */
export function createMultiSeriesMockBlsResponse(
  seriesData: Array<{
    seriesId: string;
    dataPoints: Array<{
      year: string;
      period: string;
      periodName: string;
      value: string;
    }>;
  }>,
) {
  return {
    status: 'REQUEST_SUCCEEDED',
    responseTime: 100,
    message: [],
    Results: {
      series: seriesData.map(({ seriesId, dataPoints }) => ({
        seriesID: seriesId,
        data: dataPoints.map((point) => ({
          ...point,
          footnotes: [],
        })),
      })),
    },
  };
}
