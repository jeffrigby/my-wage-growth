import { Logger } from '@aws-lambda-powertools/logger';

// Singleton instance of the logger
// So that we can use the same logger instance across the entire application
const logger = new Logger();

/**
 * Returns a logger instance with optional appendKeys configuration.
 *
 * @param {Record<string, string>} [appendKeys] - The key-value pairs to be appended to each log message.
 * @return {Logger} - The logger instance.
 */
export function getLogger(appendKeys?: Record<string, string>): Logger {
  const myLogger = logger;
  if (appendKeys) {
    myLogger.appendKeys(appendKeys);
  }
  return myLogger;
}

/**
 * Returns a child logger instance with optional appendKeys configuration.
 *
 * @param {Record<string, string>} [appendKeys] - The key-value pairs to be appended to each log message.
 * @return {Logger} - The logger instance.
 */
export function getChildLogger(appendKeys?: Record<string, string>): Logger {
  const loggerChild = logger.createChild();
  if (appendKeys) {
    loggerChild.appendKeys(appendKeys);
  }
  return loggerChild;
}
