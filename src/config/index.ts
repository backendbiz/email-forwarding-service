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
  // Remove the hardcoded default - let the fallback logic handle path detection
  PUPPETEER_EXECUTABLE_PATH: Joi.string().optional().allow(''),
  CORS_ORIGIN: Joi.string().default('*'),
  ENABLE_METRICS: Joi.boolean().default(true),
  METRICS_PORT: Joi.number().port().default(9090),
  HEALTH_CHECK_TIMEOUT: Joi.number().default(5000),
  REQUEST_TIMEOUT: Joi.number().default(30000),
  BODY_LIMIT: Joi.string().default('10mb'),
  // API Key Authentication
  EFS_API_KEY_REQUIRED: Joi.boolean().default(false),
  EFS_API_KEYS: Joi.string().optional().allow(''),
  EFS_API_KEY_HEADER: Joi.string().default('x-api-key'),
}).unknown();

// Validate environment variables
const { error, value: envVars } = envSchema.validate(process.env);

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

// Helper function to determine the appropriate executable path
function getPuppeteerExecutablePath(): string | undefined {
  // If explicitly set in environment, use it
  if (envVars.PUPPETEER_EXECUTABLE_PATH && envVars.PUPPETEER_EXECUTABLE_PATH.trim() !== '') {
    return envVars.PUPPETEER_EXECUTABLE_PATH;
  }
  
  // Platform-specific defaults (only for development)
  if (envVars.NODE_ENV === 'development') {
    const platform = process.platform;
    switch (platform) {
      case 'darwin': // macOS
        return '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
      case 'win32': // Windows
        return 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
      case 'linux': // Linux - let fallback logic handle this
      default:
        return undefined; // Let Puppeteer auto-detect or use fallback logic
    }
  }
  
  // For production, staging, test - let fallback logic handle path detection
  return undefined;
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
    executablePath: getPuppeteerExecutablePath(),
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
  
  auth: {
    apiKeyRequired: envVars.EFS_API_KEY_REQUIRED,
    apiKeys: envVars.EFS_API_KEYS ? envVars.EFS_API_KEYS.split(',').map((key: string) => key.trim()) : [],
    apiKeyHeader: envVars.EFS_API_KEY_HEADER,
  },
} as const;

export default config;