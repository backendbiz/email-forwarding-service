import dotenv from 'dotenv';
import Joi from 'joi';

// Load environment variables
dotenv.config();

// Environment validation schema
const envSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test', 'staging')
    .default('development'),
  PORT: Joi.number().port().default(3000),
  LOG_LEVEL: Joi.string()
    .valid('error', 'warn', 'info', 'debug')
    .default('info'),
  LOG_FORMAT: Joi.string()
    .valid('json', 'simple')
    .default('json'),
  RATE_LIMIT_WINDOW_MS: Joi.number().default(15 * 60 * 1000), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: Joi.number().default(100),
  PUPPETEER_TIMEOUT: Joi.number().default(30000),
  PUPPETEER_SKIP_CHROMIUM_DOWNLOAD: Joi.boolean().default(true),
  PUPPETEER_EXECUTABLE_PATH: Joi.string().default('/usr/bin/chromium-browser'),
  CORS_ORIGIN: Joi.string().default('*'),
  ENABLE_METRICS: Joi.boolean().default(true),
  METRICS_PORT: Joi.number().port().default(9090),
  HEALTH_CHECK_TIMEOUT: Joi.number().default(5000),
  REQUEST_TIMEOUT: Joi.number().default(30000),
  BODY_LIMIT: Joi.string().default('10mb'),
}).unknown();

// Validate environment variables
const { error, value: envVars } = envSchema.validate(process.env);

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

export const config = {
  env: envVars.NODE_ENV,
  port: envVars.PORT,
  isDevelopment: envVars.NODE_ENV === 'development',
  isProduction: envVars.NODE_ENV === 'production',
  isTest: envVars.NODE_ENV === 'test',
  
  logging: {
    level: envVars.LOG_LEVEL,
    format: envVars.LOG_FORMAT,
  },
  
  rateLimit: {
    windowMs: envVars.RATE_LIMIT_WINDOW_MS,
    maxRequests: envVars.RATE_LIMIT_MAX_REQUESTS,
  },
  
  puppeteer: {
    timeout: envVars.PUPPETEER_TIMEOUT,
    skipChromiumDownload: envVars.PUPPETEER_SKIP_CHROMIUM_DOWNLOAD,
    executablePath: envVars.PUPPETEER_EXECUTABLE_PATH,
  },
  
  cors: {
    origin: envVars.CORS_ORIGIN,
  },
  
  metrics: {
    enabled: envVars.ENABLE_METRICS,
    port: envVars.METRICS_PORT,
  },
  
  server: {
    requestTimeout: envVars.REQUEST_TIMEOUT,
    bodyLimit: envVars.BODY_LIMIT,
    healthCheckTimeout: envVars.HEALTH_CHECK_TIMEOUT,
  },
} as const;

export default config;
