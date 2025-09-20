import { register, Counter, Histogram, Gauge } from 'prom-client';
import { config } from '../config';

// Enable default metrics collection
if (config.metrics.enabled) {
  require('prom-client').collectDefaultMetrics({
    register,
    prefix: 'email_forwarding_',
  });
}

// Custom metrics
export const httpRequestsTotal = new Counter({
  name: 'email_forwarding_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

export const httpRequestDuration = new Histogram({
  name: 'email_forwarding_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
  registers: [register],
});

export const emailForwardingRequestsTotal = new Counter({
  name: 'email_forwarding_requests_total',
  help: 'Total number of email forwarding requests',
  labelNames: ['status'],
  registers: [register],
});

export const emailForwardingDuration = new Histogram({
  name: 'email_forwarding_duration_seconds',
  help: 'Duration of email forwarding operations in seconds',
  labelNames: ['status'],
  buckets: [1, 5, 10, 15, 30, 60, 120],
  registers: [register],
});

export const puppeteerBrowsersActive = new Gauge({
  name: 'email_forwarding_puppeteer_browsers_active',
  help: 'Number of active Puppeteer browser instances',
  registers: [register],
});

export const systemHealth = new Gauge({
  name: 'email_forwarding_system_health',
  help: 'System health status (1 = healthy, 0 = unhealthy)',
  labelNames: ['component'],
  registers: [register],
});

// Metrics middleware
export const metricsMiddleware = (req: any, res: any, next: any) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = (Date.now() - startTime) / 1000;
    const route = req.route?.path || req.path;
    
    httpRequestsTotal
      .labels(req.method, route, res.statusCode.toString())
      .inc();
    
    httpRequestDuration
      .labels(req.method, route, res.statusCode.toString())
      .observe(duration);
  });
  
  next();
};

// Helper functions for tracking email forwarding metrics
export const trackEmailForwardingStart = () => {
  puppeteerBrowsersActive.inc();
  return Date.now();
};

export const trackEmailForwardingEnd = (startTime: number, success: boolean) => {
  const duration = (Date.now() - startTime) / 1000;
  const status = success ? 'success' : 'failure';
  
  emailForwardingRequestsTotal.labels(status).inc();
  emailForwardingDuration.labels(status).observe(duration);
  puppeteerBrowsersActive.dec();
};

// Update system health
export const updateSystemHealth = (component: string, healthy: boolean) => {
  systemHealth.labels(component).set(healthy ? 1 : 0);
};

export { register };
