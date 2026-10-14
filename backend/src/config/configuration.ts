import { Env, validateEnv } from './env.validation';

export type AppConfig = Env & {
  corsOrigins: string[];
  apiBasePath: string;
};

export function configuration(): AppConfig {
  const env = validateEnv(process.env);
  return {
    ...env,
    corsOrigins: env.CORS_ORIGINS.split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    apiBasePath: `${env.API_PREFIX}/v${env.API_VERSION}`,
  };
}
