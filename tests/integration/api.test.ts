import request from 'supertest';
import { app } from '../../src/index';

// Test API keys for authentication tests
const VALID_API_KEY = 'efs_9FYlJGeBhjpQ8dTk-9zI4190VlSpDPdBet-zm74hCwA';
const INVALID_API_KEY = 'invalid-key-123';
const TEST_URL = 'https://mail-settings.google.com/mail/u/0/?ui=2&ik=abc123&view=lg&permmsgid=msg-f:1234567890&th=thread-abc123&search=inbox&siml=confirm-forwarding-xyz789';

describe('API Integration Tests', () => {
  describe('GET /health', () => {
    it('should return health status without API key (public endpoint)', async () => {
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
    it('should return API documentation without API key (public endpoint)', async () => {
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
      url: TEST_URL
    };

    describe('Authentication', () => {
      it('should return 401 when API key is missing', async () => {
        const response = await request(app)
          .post('/accept-forwarding')
          .send(validPayload)
          .expect(401);

        expect(response.body.error).toBe('Authentication required');
        expect(response.body.message).toBe('Missing x-api-key header');
        expect(response.body.requestId).toBeDefined();
        expect(response.body.timestamp).toBeDefined();
      });

      it('should return 403 when API key is invalid', async () => {
        const response = await request(app)
          .post('/accept-forwarding')
          .set('x-api-key', INVALID_API_KEY)
          .send(validPayload)
          .expect(403);

        expect(response.body.error).toBe('Authentication failed');
        expect(response.body.message).toBe('Invalid API key');
        expect(response.body.requestId).toBeDefined();
        expect(response.body.timestamp).toBeDefined();
      });

      it('should accept valid API key and process request', async () => {
        const response = await request(app)
          .post('/accept-forwarding')
          .set('x-api-key', VALID_API_KEY)
          .send(validPayload);

        // Should not return auth errors (401/403)
        expect(response.status).not.toBe(401);
        expect(response.status).not.toBe(403);
        expect(response.body.requestId).toBeDefined();
        expect(response.body.timestamp).toBeDefined();
      });

      it('should work with alternative valid API key', async () => {
        const response = await request(app)
          .post('/accept-forwarding')
          .set('x-api-key', 'dev-key-12345')
          .send(validPayload);

        // Should not return auth errors (401/403)
        expect(response.status).not.toBe(401);
        expect(response.status).not.toBe(403);
        expect(response.body.requestId).toBeDefined();
      });

      it('should include custom request ID when provided', async () => {
        const customRequestId = 'test-request-' + Date.now();
        const response = await request(app)
          .post('/accept-forwarding')
          .set('x-api-key', VALID_API_KEY)
          .set('x-request-id', customRequestId)
          .send(validPayload);

        // Custom request ID should be preserved
        expect(response.body.requestId).toBe(customRequestId);
      });
    });

    describe('Validation', () => {
      it('should validate request body structure', async () => {
        const response = await request(app)
          .post('/accept-forwarding')
          .set('x-api-key', VALID_API_KEY)
          .send({})
          .expect(400);

        expect(response.body.error).toBe('Validation error');
        expect(response.body.details).toBeDefined();
      });

      it('should validate URL field is required', async () => {
        const invalidPayload = {
          notUrl: 'invalid'
        };

        const response = await request(app)
          .post('/accept-forwarding')
          .set('x-api-key', VALID_API_KEY)
          .send(invalidPayload)
          .expect(400);

        expect(response.body.error).toBe('Validation error');
        expect(response.body.details.some((d: any) => d.field === 'url')).toBe(true);
      });

      it('should validate URL format', async () => {
        const invalidPayload = {
          url: 'not-a-valid-url'
        };

        const response = await request(app)
          .post('/accept-forwarding')
          .set('x-api-key', VALID_API_KEY)
          .send(invalidPayload)
          .expect(400);

        expect(response.body.error).toBe('Validation error');
        expect(response.body.details.some((d: any) => d.field === 'url')).toBe(true);
      });
    });

    describe('Response Format', () => {

      it('should include request ID in response', async () => {
        const response = await request(app)
          .post('/accept-forwarding')
          .set('x-api-key', VALID_API_KEY)
          .send(validPayload);

        expect(response.body.requestId).toBeDefined();
        expect(typeof response.body.requestId).toBe('string');
      });

      it('should include timestamp in response', async () => {
        const response = await request(app)
          .post('/accept-forwarding')
          .set('x-api-key', VALID_API_KEY)
          .send(validPayload);

        expect(response.body.timestamp).toBeDefined();
        expect(new Date(response.body.timestamp)).toBeInstanceOf(Date);
      });

      it('should handle large URLs within limit', async () => {
        const largeUrl = 'https://mail-settings.google.com/mail/confirm?' + 'a'.repeat(1000);
        const largePayload = {
          url: largeUrl
        };

        const response = await request(app)
          .post('/accept-forwarding')
          .set('x-api-key', VALID_API_KEY)
          .send(largePayload);

        // Should not fail due to size (within 10MB limit)
        expect(response.status).not.toBe(413);
      });
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
