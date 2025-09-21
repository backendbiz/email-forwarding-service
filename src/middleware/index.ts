import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import mongoSanitize from 'express-mongo-sanitize';
import { config } from '../config';
import { log } from '../utils/logger';

// Request ID middleware
export const requestId = (req: Request, res: Response, next: NextFunction) => {
  // Use existing request ID if provided, otherwise generate a new one
  const existingRequestId = req.headers['x-request-id'] as string;
  const requestId = existingRequestId || Math.random().toString(36).substring(2, 15);
  req.headers['x-request-id'] = requestId;
  res.setHeader('x-request-id', requestId);
  next();
};

// API Key authentication middleware
export const apiKeyAuth = (req: Request, res: Response, next: NextFunction) => {
  // Skip authentication if not required
  if (!config.auth.apiKeyRequired) {
    return next();
  }

  // Skip authentication for health check and metrics endpoints
  if (req.path === '/health' || req.path === '/metrics' || req.path === '/api-docs') {
    return next();
  }

  const apiKey = req.headers[config.auth.apiKeyHeader] as string;

  if (!apiKey) {
    log.warn('API key missing', {
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      requestId: req.headers['x-request-id'],
    });

    return res.status(401).json({
      error: 'Authentication required',
      message: `Missing ${config.auth.apiKeyHeader} header`,
      requestId: req.headers['x-request-id'],
      timestamp: new Date().toISOString(),
    });
  }

  // Validate API key
  if (!config.auth.apiKeys.includes(apiKey)) {
    log.warn('Invalid API key', {
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      requestId: req.headers['x-request-id'],
      apiKeyPrefix: apiKey.substring(0, 8) + '...',
    });

    return res.status(403).json({
      error: 'Authentication failed',
      message: 'Invalid API key',
      requestId: req.headers['x-request-id'],
      timestamp: new Date().toISOString(),
    });
  }

  // Log successful authentication
  log.debug('API key authenticated', {
    method: req.method,
    url: req.url,
    requestId: req.headers['x-request-id'],
    apiKeyPrefix: apiKey.substring(0, 8) + '...',
  });

  next();
};

// Request logging middleware
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  
  log.request(req, {
    requestId: req.headers['x-request-id'],
  });
  
  res.on('finish', () => {
    const responseTime = Date.now() - startTime;
    log.response(req, res, responseTime, {
      requestId: req.headers['x-request-id'],
    });
  });
  
  next();
};

// Error handling middleware
export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  log.error('Unhandled error', {
    error: error.message,
    stack: error.stack,
    requestId: req.headers['x-request-id'],
    method: req.method,
    url: req.url,
  });

  // Don't leak error details in production
  const message = config.isProduction ? 'Internal server error' : error.message;
  
  res.status(500).json({
    error: 'Internal server error',
    message,
    requestId: req.headers['x-request-id'],
    timestamp: new Date().toISOString(),
  });
};

// 404 handler
export const notFoundHandler = (req: Request, res: Response) => {
  log.warn('Route not found', {
    method: req.method,
    url: req.url,
    requestId: req.headers['x-request-id'],
  });

  res.status(404).json({
    error: 'Endpoint not found',
    path: req.path,
    method: req.method,
    requestId: req.headers['x-request-id'],
    availableEndpoints: {
      'GET /health': 'Health check',
      'GET /metrics': 'Prometheus metrics',
      'POST /accept-forwarding': 'Accept Gmail forwarding confirmation',
    },
  });
};

// Rate limiting
export const rateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: {
    error: 'Too many requests',
    message: 'Rate limit exceeded. Please try again later.',
    retryAfter: Math.ceil(config.rateLimit.windowMs / 1000),
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    log.warn('Rate limit exceeded', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      requestId: req.headers['x-request-id'],
    });
    
    res.status(429).json({
      error: 'Too many requests',
      message: 'Rate limit exceeded. Please try again later.',
      retryAfter: Math.ceil(config.rateLimit.windowMs / 1000),
      requestId: req.headers['x-request-id'],
    });
  },
});

// Slow down repeated requests
export const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 50, // Allow 50 requests per windowMs without delay
  delayMs: () => 500, // Add 500ms delay per request after delayAfter
  maxDelayMs: 20000, // Maximum delay of 20 seconds
  validate: { delayMs: false }, // Disable the warning
});

// Security middleware setup
export const securityMiddleware = [
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  }),
  cors({
    origin: config.cors.origin,
    credentials: true,
    optionsSuccessStatus: 200,
  }),
  compression(),
  mongoSanitize(),
];

// Body parsing middleware
export const bodyParser = [
  express.json({ 
    limit: config.server.bodyLimit,
    verify: (req, res, buf) => {
      // Store raw body for webhook verification if needed
      (req as any).rawBody = buf;
    },
  }),
  express.urlencoded({ 
    extended: true, 
    limit: config.server.bodyLimit,
  }),
];

// Request timeout middleware
export const requestTimeout = (req: Request, res: Response, next: NextFunction) => {
  const timeout = setTimeout(() => {
    if (!res.headersSent) {
      log.warn('Request timeout', {
        method: req.method,
        url: req.url,
        requestId: req.headers['x-request-id'],
        timeout: config.server.requestTimeout,
      });
      
      res.status(408).json({
        error: 'Request timeout',
        message: 'Request took too long to process',
        requestId: req.headers['x-request-id'],
        timestamp: new Date().toISOString(),
      });
    }
  }, config.server.requestTimeout);

  res.on('finish', () => {
    clearTimeout(timeout);
  });

  next();
};
