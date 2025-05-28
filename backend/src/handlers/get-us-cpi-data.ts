import { Context } from "aws-lambda";
import { injectLambdaContext } from "@aws-lambda-powertools/logger/middleware";
import { parser } from "@aws-lambda-powertools/parser/middleware";
import middy from "@middy/core";
import { z } from "zod";
import { getLogger } from "@/lib/logger";
import { getWageGrowthConfig } from "@/lib/aws.appconfig";
import { fetchAllCpiData, CpiSeriesId, CpiDataPoint } from "@/lib/bls-api";

const logger = getLogger();

const cpiExportEventSchema = z.object({
  startYear: z
    .number()
    .min(1913)
    .max(new Date().getFullYear())
    .optional()
    .default(1913),
  endYear: z
    .number()
    .min(1913)
    .max(new Date().getFullYear())
    .optional()
    .default(new Date().getFullYear()),
  seriesId: z
    .string()
    .optional()
    .default("CPI_U_ALL")
    .transform((key): CpiSeriesId => {
      // Validate that the key exists in the enum
      if (!(key in CpiSeriesId)) {
        throw new Error(
          `Invalid series ID: ${key}. Must be one of: ${Object.keys(CpiSeriesId).join(", ")}`,
        );
      }
      // Return the actual enum value
      return CpiSeriesId[key as keyof typeof CpiSeriesId];
    }),
});

type SimplifiedCpiData = {
  lastUpdated: string;
  source: string;
  months: Record<string, number>;
};

type CpiExportEvent = {
  seriesId: CpiSeriesId;
};

type CPILambdaResponse = {
  status: string;
  message: string;
  bucket?: string;
  key?: string;
  error?: string;
  data?: SimplifiedCpiData;
};

/**
 * Transforms BLS CPI data into a simplified format for quick lookups
 * @param cpiData Array of CPI data points from BLS API
 * @param seriesId The series ID used for the data
 * @returns Simplified CPI data structure
 */
function transformCpiDataForLookup(
  cpiData: CpiDataPoint[],
  seriesId: CpiSeriesId,
): SimplifiedCpiData {
  const months: Record<string, number> = {};

  // Convert each data point to YYYY-MM format with CPI value
  for (const dataPoint of cpiData) {
    // Format date as YYYY-MM for easy lookup
    const year = dataPoint.date.getFullYear();
    const month = (dataPoint.date.getMonth() + 1).toString().padStart(2, "0");
    const monthKey = `${year}-${month}`;
    months[monthKey] = dataPoint.value;
  }

  return {
    lastUpdated: new Date().toISOString(),
    source: `BLS Series ${seriesId}`,
    months,
  };
}

export const lambdaHandler = async (
  event: CpiExportEvent,
  context: Context,
): Promise<CPILambdaResponse> => {
  try {
    const config = await getWageGrowthConfig();
    const { seriesId } = event;
    const { blsApiKey } = config;

    if (!blsApiKey) {
      throw new Error("BLS API key is not set");
    }

    const blsData = await fetchAllCpiData(blsApiKey, seriesId);

    // Transform the data into simplified format
    const simplifiedData = transformCpiDataForLookup(blsData, seriesId);

    logger.info("BLS Data fetched and transformed", {
      originalDataPoints: blsData.length,
      transformedMonths: Object.keys(simplifiedData.months).length,
      dateRange: {
        earliest: Object.keys(simplifiedData.months).sort()[0],
        latest: Object.keys(simplifiedData.months).sort().slice(-1)[0],
      },
    });

    return {
      status: "success",
      message: "CPI Data downloaded and transformed successfully",
      bucket: "us-cpi-data",
      key: "cpi-data.json",
      data: simplifiedData,
    };
  } catch (error) {
    logger.error("Error downloading CPI data", { error, event, context });
    return {
      status: "error",
      message: "Failed to download CPI data",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  } finally {
    // Clean up resources if needed
  }
};

export const handler = middy(lambdaHandler)
  .use(parser({ schema: cpiExportEventSchema }))
  .use(injectLambdaContext(logger, { logEvent: true }))
  .use(injectLambdaContext(logger));
