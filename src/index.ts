import express, { Request, Response } from 'express';
import { createServer } from 'http';
import { config } from './config';
import { log } from './utils/logger';
import { register, metricsMiddleware, updateSystemHealth } from './utils/metrics';
import {
  securityMiddleware,
  bodyParser,
  requestId,
  requestLogger,
  rateLimiter,
  speedLimiter,
  requestTimeout,
  errorHandler,
  notFoundHandler,
} from './middleware';
import {
  validateRequest,
  validateQuery,
  emailForwardingRequestSchema,
  healthCheckQuerySchema,
} from './validation/schemas';
import { acceptEmailForwardingRequest, EmailForwardingRequest } from './emailService';

// Create Express app
const app = express();

// Trust proxy for accurate IP addresses behind load balancers
app.set('trust proxy', 1);

// Apply security middleware
app.use(securityMiddleware);

// Apply rate limiting
app.use(rateLimiter);
app.use(speedLimiter);

// Request processing middleware
app.use(requestId);
app.use(requestLogger);
app.use(requestTimeout);
app.use(bodyParser);

// Metrics middleware
if (config.metrics.enabled) {
  app.use(metricsMiddleware);
}

// Health check endpoint with detailed system information
app.get('/health', validateQuery(healthCheckQuerySchema), async (req: Request, res: Response) => {
  try {
    const detailed = Boolean(req.query.detailed);
    const healthData: any = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'email-forwarding-service',
      version: process.env.npm_package_version || '1.0.0',
      environment: config.env,
    };

    if (detailed) {
      const memUsage = process.memoryUsage();
      healthData.system = {
        uptime: process.uptime(),
        memory: {
          used: Math.round(memUsage.heapUsed / 1024 / 1024),
          total: Math.round(memUsage.heapTotal / 1024 / 1024),
          external: Math.round(memUsage.external / 1024 / 1024),
        },
        cpu: process.cpuUsage(),
        nodeVersion: process.version,
        platform: process.platform,
      };
    }

    // Update system health metric
    updateSystemHealth('api', true);

    res.status(200).json(healthData);
  } catch (error) {
    log.error('Health check failed', { error: error instanceof Error ? error.message : String(error) });
    updateSystemHealth('api', false);
    
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      service: 'email-forwarding-service',
      error: 'Health check failed',
    });
  }
});

// Metrics endpoint for Prometheus
if (config.metrics.enabled) {
  app.get('/metrics', async (req: Request, res: Response) => {
    try {
      res.set('Content-Type', register.contentType);
      res.end(await register.metrics());
    } catch (error) {
      log.error('Failed to generate metrics', { error: error instanceof Error ? error.message : String(error) });
      res.status(500).end();
    }
  });
}

// Main endpoint for accepting email forwarding requests
app.post(
  '/accept-forwarding',
  validateRequest(emailForwardingRequestSchema),
  async (req: Request, res: Response) => {
    try {
      log.info('Processing email forwarding request', {
        requestId: req.headers['x-request-id'],
        hasSnippet: !!req.body?.data?.object?.snippet,
        hasBody: !!req.body?.data?.object?.body,
      });

      const requestBody: EmailForwardingRequest = req.body;
      const result = await acceptEmailForwardingRequest(requestBody);

      const statusCode = result.success ? 200 : 400;
      
      log.info('Email forwarding request completed', {
        requestId: req.headers['x-request-id'],
        success: result.success,
        email: result.email,
        responseTime: result.responseTime,
        alreadyConfirmed: result.alreadyConfirmed,
      });

      res.status(statusCode).json({
        ...result,
        requestId: req.headers['x-request-id'],
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      log.error('Unexpected error in email forwarding endpoint', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        requestId: req.headers['x-request-id'],
      });

      res.status(500).json({
        success: false,
        message: 'Internal server error',
        requestId: req.headers['x-request-id'],
        timestamp: new Date().toISOString(),
      });
    }
  }
);

// API documentation endpoint
app.get('/api-docs', (req: Request, res: Response) => {
  res.json({
    service: 'email-forwarding-service',
    version: process.env.npm_package_version || '1.0.0',
    description: 'Production-grade service to accept Gmail forwarding confirmation requests',
    endpoints: {
      'GET /health': {
        description: 'Health check endpoint',
        parameters: {
          detailed: 'boolean (optional) - Include detailed system information',
        },
      },
      'GET /metrics': {
        description: 'Prometheus metrics endpoint',
        enabled: config.metrics.enabled,
      },
      'POST /accept-forwarding': {
        description: 'Accept Gmail forwarding confirmation',
        requestBody: {
          data: {
            object: {
              snippet: 'string - Email snippet containing forwarding request',
              body: 'string - Full email body with confirmation URL',
            },
          },
        },
      },
      'GET /api-docs': {
        description: 'This API documentation',
      },
    },
    rateLimit: {
      windowMs: config.rateLimit.windowMs,
      maxRequests: config.rateLimit.maxRequests,
    },
  });
});

// Apply error handling middleware
app.use(notFoundHandler);
app.use(errorHandler);

// Create HTTP server
const server = createServer(app);

// Graceful shutdown handling
const gracefulShutdown = (signal: string) => {
  log.info(`Received ${signal}, starting graceful shutdown`);
  
  server.close((err) => {
    if (err) {
      log.error('Error during server shutdown', { error: err.message });
      process.exit(1);
    }
    
    log.info('Server closed successfully');
    process.exit(0);
  });

  // Force shutdown after 30 seconds
  setTimeout(() => {
    log.error('Forced shutdown after timeout');
    process.exit(1);
  }, 30000);
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions and rejections
process.on('uncaughtException', (error) => {
  log.error('Uncaught exception', { error: error.message, stack: error.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  log.error('Unhandled rejection', { reason, promise });
  process.exit(1);
});

// Start server
server.listen(config.port, () => {
  log.info('🚀 Email forwarding service started', {
    port: config.port,
    environment: config.env,
    nodeVersion: process.version,
    metricsEnabled: config.metrics.enabled,
  });
  
  log.info('📋 Available endpoints:', {
    health: `http://localhost:${config.port}/health`,
    metrics: config.metrics.enabled ? `http://localhost:${config.port}/metrics` : 'disabled',
    acceptForwarding: `http://localhost:${config.port}/accept-forwarding`,
    apiDocs: `http://localhost:${config.port}/api-docs`,
  });

  // Update system health
  updateSystemHealth('api', true);
});

export { app, server };