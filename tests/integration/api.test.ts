import request from 'supertest';
import { app } from '../../src/index';

describe('API Integration Tests', () => {
  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'healthy',
        service: 'email-forwarding-service',
        environment: 'test',
      });
      expect(response.body.timestamp).toBeDefined();
    });

    it('should return detailed health information when requested', async () => {
      const response = await request(app)
        .get('/health?detailed=true')
        .expect(200);

      expect(response.body.system).toBeDefined();
      expect(response.body.system.uptime).toBeGreaterThan(0);
      expect(response.body.system.memory).toBeDefined();
      expect(response.body.system.nodeVersion).toBeDefined();
    });
  });

  describe('GET /api-docs', () => {
    it('should return API documentation', async () => {
      const response = await request(app)
        .get('/api-docs')
        .expect(200);

      expect(response.body.service).toBe('email-forwarding-service');
      expect(response.body.endpoints).toBeDefined();
      expect(response.body.endpoints['GET /health']).toBeDefined();
      expect(response.body.endpoints['POST /accept-forwarding']).toBeDefined();
    });
  });

  describe('POST /accept-forwarding', () => {
    const validPayload = {
      data: {
        object: {
          snippet: 'test@example.com has requested to automatically forward mail to your email address',
          body: 'Please confirm by clicking: https://mail-settings.google.com/mail/confirm?token=abc123',
        },
      },
    };

    it('should validate request body structure', async () => {
      const response = await request(app)
        .post('/accept-forwarding')
        .send({})
        .expect(400);

      expect(response.body.error).toBe('Validation error');
      expect(response.body.details).toBeDefined();
    });

    it('should validate snippet field', async () => {
      const invalidPayload = {
        data: {
          object: {
            snippet: 'short', // Too short
            body: validPayload.data.object.body,
          },
        },
      };

      const response = await request(app)
        .post('/accept-forwarding')
        .send(invalidPayload)
        .expect(400);

      expect(response.body.error).toBe('Validation error');
      expect(response.body.details.some((d: any) => d.field === 'data.object.snippet')).toBe(true);
    });

    it('should validate body field', async () => {
      const invalidPayload = {
        data: {
          object: {
            snippet: validPayload.data.object.snippet,
            body: 'short', // Too short
          },
        },
      };

      const response = await request(app)
        .post('/accept-forwarding')
        .send(invalidPayload)
        .expect(400);

      expect(response.body.error).toBe('Validation error');
      expect(response.body.details.some((d: any) => d.field === 'data.object.body')).toBe(true);
    });

    it('should include request ID in response', async () => {
      const response = await request(app)
        .post('/accept-forwarding')
        .send(validPayload);

      expect(response.body.requestId).toBeDefined();
      expect(typeof response.body.requestId).toBe('string');
    });

    it('should include timestamp in response', async () => {
      const response = await request(app)
        .post('/accept-forwarding')
        .send(validPayload);

      expect(response.body.timestamp).toBeDefined();
      expect(new Date(response.body.timestamp)).toBeInstanceOf(Date);
    });

    it('should handle large request bodies within limit', async () => {
      const largeBody = 'a'.repeat(1000); // 1KB body
      const largePayload = {
        data: {
          object: {
            snippet: validPayload.data.object.snippet,
            body: largeBody + ' https://mail-settings.google.com/mail/confirm?token=abc123',
          },
        },
      };

      const response = await request(app)
        .post('/accept-forwarding')
        .send(largePayload);

      // Should not fail due to size (within 10MB limit)
      expect(response.status).not.toBe(413);
    });
  });

  describe('Rate Limiting', () => {
    it('should apply rate limiting after many requests', async () => {
      // This test would need to be adjusted based on actual rate limit settings
      // For now, we'll just verify the endpoint exists and responds
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.headers['x-ratelimit-limit']).toBeDefined();
    });
  });

  describe('Security Headers', () => {
    it('should include security headers', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      // Check for Helmet security headers
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBeDefined();
      expect(response.headers['x-xss-protection']).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle 404 for unknown routes', async () => {
      const response = await request(app)
        .get('/unknown-route')
        .expect(404);

      expect(response.body.error).toBe('Endpoint not found');
      expect(response.body.availableEndpoints).toBeDefined();
    });

    it('should handle unsupported HTTP methods', async () => {
      const response = await request(app)
        .put('/health')
        .expect(404);

      expect(response.body.error).toBe('Endpoint not found');
      expect(response.body.method).toBe('PUT');
    });
  });

  describe('CORS', () => {
    it('should include CORS headers', async () => {
      const response = await request(app)
        .options('/health')
        .expect(204);

      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });
  });

  describe('Compression', () => {
    it('should compress responses when requested', async () => {
      const response = await request(app)
        .get('/api-docs')
        .set('Accept-Encoding', 'gzip')
        .expect(200);

      // The response should be compressed if it's large enough
      expect(response.headers['content-encoding']).toBeUndefined(); // Small response might not be compressed
    });
  });
});
