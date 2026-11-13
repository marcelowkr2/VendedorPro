import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string(),
  JWT_SECRET: z.string().min(16),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  SALT_ROUNDS: z.string().default('10'),
  RATE_LIMIT: z.string().default('60'),
  CORS_ORIGIN: z.string().default('*'),
  PORT_API: z.string().default('4000'),
  PORT_WEB: z.string().default('3000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

export type Config = z.infer<typeof envSchema>;

let configCache: Config | null = null;

export function getConfig(): Config {
  if (!configCache) {
    configCache = envSchema.parse(process.env);
  }
  return configCache;
}

export function isDev() {
  return getConfig().NODE_ENV === 'development';
}

export function isProd() {
  return getConfig().NODE_ENV === 'production';
}

export function isTest() {
  return getConfig().NODE_ENV === 'test';
}