import winston from 'winston';
import { config } from '../config';

// Custom log format for production
const productionFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    return JSON.stringify({
      timestamp,
      level,
      message,
      service: 'email-forwarding-service',
      ...meta,
    });
  })
);

// Development format for better readability
const developmentFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
    return `${timestamp} [${level}]: ${message} ${metaStr}`;
  })
);

// Create logger instance
const logger = winston.createLogger({
  level: config.logging.level,
  format: config.isProduction ? productionFormat : developmentFormat,
  defaultMeta: {
    service: 'email-forwarding-service',
    version: process.env.npm_package_version || '1.0.0',
  },
  transports: [
    // Console transport
    new winston.transports.Console({
      handleExceptions: true,
      handleRejections: true,
    }),
  ],
  exitOnError: false,
});

// Add file transports in production
if (config.isProduction) {
  logger.add(
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  );
  
  logger.add(
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  );
}

// Create a stream object for Morgan HTTP logging
export const logStream = {
  write: (message: string) => {
    logger.info(message.trim());
  },
};

// Export logger with additional utility methods
export const log = {
  error: (message: string, meta?: any) => logger.error(message, meta),
  warn: (message: string, meta?: any) => logger.warn(message, meta),
  info: (message: string, meta?: any) => logger.info(message, meta),
  debug: (message: string, meta?: any) => logger.debug(message, meta),
  
  // Request logging
  request: (req: any, meta?: any) => {
    logger.info('HTTP Request', {
      method: req.method,
      url: req.url,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      ...meta,
    });
  },
  
  // Response logging
  response: (req: any, res: any, responseTime: number, meta?: any) => {
    logger.info('HTTP Response', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      responseTime: `${responseTime}ms`,
      ...meta,
    });
  },
  
  // Email forwarding specific logging
  emailForwarding: {
    start: (email: string, url: string) => {
      logger.info('Email forwarding started', { email, url });
    },
    success: (email: string, responseTime: number) => {
      logger.info('Email forwarding successful', { email, responseTime });
    },
    error: (email: string, error: string, responseTime: number) => {
      logger.error('Email forwarding failed', { email, error, responseTime });
    },
    alreadyConfirmed: (email: string) => {
      logger.info('Email forwarding already confirmed', { email });
    },
  },
};

export default logger;
