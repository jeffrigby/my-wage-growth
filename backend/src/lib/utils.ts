/**
 * Checks if an environment variable is defined and returns its value,
 * or returns a default value if the variable is not defined.
 *
 * @param  {string}  varName      env-var name to check
 * @param  {string}  defaultValue If env-var not defined
 * @return {string}               env-var or the default value
 *
 * @throws Error  Throws an error if the environment variable is not defined and no default value is provided.
 */
export const checkEnvVar = (
  varName: string,
  defaultValue: string = "",
): string => {
  const value = process.env[varName];
  if (value !== undefined) return value;
  if (defaultValue !== "") return defaultValue;
  throw new Error(`Environment variable '${varName}' is not defined`);
};
