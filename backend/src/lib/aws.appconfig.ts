import { getAppConfig } from '@aws-lambda-powertools/parameters/appconfig';
import { getLogger } from './logger';
import { checkEnvVar } from './utils';

const logger = getLogger();

const APPCONFIG_APP_ID = checkEnvVar('APPCONFIG_APP_ID');
const APPCONFIG_ENV_ID = checkEnvVar('APPCONFIG_ENV_ID');
const APPCONFIG_PROFILE_ID = checkEnvVar('APPCONFIG_PROFILE_ID');

type WageGrowthConfig = {
  blsApiKey: string;
};

/**
 * Get the app config for the given profileId, environment, and application
 * @param {string} profileId  - the profileId
 * @param {string} environment - the environment name or id
 * @param {string} application - the application name or id
 * @param {number} maxAge - max age of the config in seconds
 * @param {boolean} jsonTransform - transform the config to JSON
 */
export async function getAppConfigProfile(
  profileId: string,
  environment: string,
  application: string,
  maxAge: number = 300,
  jsonTransform: boolean = true,
): Promise<Record<string, unknown>> {
  const config = await getAppConfig(profileId, {
    environment: environment,
    application: application,
    transform: jsonTransform ? 'json' : undefined,
    maxAge: maxAge,
  });
  if (config !== null && config !== undefined) {
    return config;
  }
  return {};
}

/**
 * Fetches the transcription configuration from the application configuration profile.
 * @return A promise that resolves to the transcription configuration.
 */
export async function getWageGrowthConfig(): Promise<WageGrowthConfig> {
  logger.info('Getting wage growth config');
  const config = await getAppConfigProfile(APPCONFIG_PROFILE_ID, APPCONFIG_ENV_ID, APPCONFIG_APP_ID);
  return config as WageGrowthConfig;
}
