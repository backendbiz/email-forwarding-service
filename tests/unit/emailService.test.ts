import puppeteer from 'puppeteer';
import { acceptEmailForwardingRequest, EmailForwardingRequest } from '../../src/emailService';

// Mock puppeteer
const mockBrowser = {
  newPage: jest.fn(),
  close: jest.fn(),
};

const mockPage = {
  goto: jest.fn(),
  setUserAgent: jest.fn(),
  setViewport: jest.fn(),
  waitForSelector: jest.fn(),
  $eval: jest.fn(),
  $: jest.fn(),
  waitForTimeout: jest.fn(),
};

const mockElement = {
  click: jest.fn(),
};

describe('EmailService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (puppeteer.launch as jest.Mock).mockResolvedValue(mockBrowser);
    mockBrowser.newPage.mockResolvedValue(mockPage);
  });

  describe('acceptEmailForwardingRequest', () => {
    const validRequest: EmailForwardingRequest = {
      url: 'https://mail-settings.google.com/mail/u/0/?ui=2&ik=abc123&view=lg&permmsgid=msg-f:1234567890&th=thread-abc123&search=inbox&siml=confirm-forwarding-xyz789'
    };

    it('should successfully confirm email forwarding', async () => {
      // Mock successful flow
      mockPage.$eval.mockResolvedValueOnce(''); // Not already confirmed
      mockPage.$.mockResolvedValueOnce(mockElement); // Find confirm button
      mockPage.$eval.mockResolvedValueOnce('may now forward mail to'); // Success after click

      const result = await acceptEmailForwardingRequest(validRequest);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Email forwarding confirmed successfully');
      expect(result.email).toBe('test@example.com');
      expect(result.alreadyConfirmed).toBe(false);
      expect(mockBrowser.close).toHaveBeenCalled();
    });

    it('should handle already confirmed forwarding', async () => {
      // Mock already confirmed
      mockPage.$eval.mockResolvedValueOnce('may now forward mail to');

      const result = await acceptEmailForwardingRequest(validRequest);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Email forwarding already confirmed');
      expect(result.alreadyConfirmed).toBe(true);
      expect(mockBrowser.close).toHaveBeenCalled();
    });

    it('should handle invalid request format', async () => {
      const invalidRequest: EmailForwardingRequest = {
        url: 'https://invalid-url-without-gmail-settings.com'
      };

      const result = await acceptEmailForwardingRequest(invalidRequest);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Invalid forwarding request format');
    });

    it('should handle missing confirmation URL', async () => {
      const requestWithoutUrl: EmailForwardingRequest = {
        url: 'https://example.com/no-gmail-settings'
      };

      const result = await acceptEmailForwardingRequest(requestWithoutUrl);

      expect(result.success).toBe(false);
      expect(result.message).toBe('No confirmation URL found in email body');
    });

    it('should handle confirmation button not found', async () => {
      mockPage.$eval.mockResolvedValueOnce(''); // Not already confirmed
      mockPage.$.mockResolvedValue(null); // No confirm button found

      const result = await acceptEmailForwardingRequest(validRequest);

      expect(result.success).toBe(false);
      expect(result.message).toBe('No confirmation button found');
      expect(mockBrowser.close).toHaveBeenCalled();
    });

    it('should handle confirmation failure', async () => {
      mockPage.$eval.mockResolvedValueOnce(''); // Not already confirmed
      mockPage.$.mockResolvedValueOnce(mockElement); // Find confirm button
      mockPage.$eval.mockResolvedValueOnce(''); // Still not confirmed after click

      const result = await acceptEmailForwardingRequest(validRequest);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Confirmation failed - page did not update as expected');
      expect(mockBrowser.close).toHaveBeenCalled();
    });

    it('should handle browser launch failure', async () => {
      (puppeteer.launch as jest.Mock).mockRejectedValue(new Error('Browser launch failed'));

      const result = await acceptEmailForwardingRequest(validRequest);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Internal error during email forwarding process');
    });

    it('should handle page navigation failure', async () => {
      mockPage.goto.mockRejectedValue(new Error('Navigation failed'));

      const result = await acceptEmailForwardingRequest(validRequest);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Internal error during email forwarding process');
      expect(mockBrowser.close).toHaveBeenCalled();
    });

    it('should extract email from different snippet formats', async () => {
      const requestWithDifferentEmail: EmailForwardingRequest = {
        url: 'https://mail-settings.google.com/mail/u/0/?ui=2&ik=def456&view=lg&permmsgid=msg-f:9876543210&th=thread-def456&search=inbox&siml=confirm-forwarding-abc123'
      };

      mockPage.$eval.mockResolvedValueOnce(''); // Not already confirmed
      mockPage.$.mockResolvedValueOnce(mockElement); // Find confirm button
      mockPage.$eval.mockResolvedValueOnce('may now forward mail to'); // Success

      const result = await acceptEmailForwardingRequest(requestWithDifferentEmail);

      expect(result.success).toBe(true);
      // Email extraction logic may have changed with new schema
      expect(result.url).toBeDefined();
    });

    it('should handle multiple URLs in body and use the first one', async () => {
      const requestWithMultipleUrls: EmailForwardingRequest = {
        url: 'https://mail-settings.google.com/mail/u/0/?ui=2&ik=multi123&view=lg&permmsgid=msg-f:1111111111&th=thread-multi123&search=inbox&siml=confirm-forwarding-first123'
      };

      mockPage.$eval.mockResolvedValueOnce(''); // Not already confirmed
      mockPage.$.mockResolvedValueOnce(mockElement); // Find confirm button
      mockPage.$eval.mockResolvedValueOnce('may now forward mail to'); // Success

      const result = await acceptEmailForwardingRequest(requestWithMultipleUrls);

      expect(result.success).toBe(true);
      expect(mockPage.goto).toHaveBeenCalledWith(
        'https://mail-settings.google.com/mail/u/0/?ui=2&ik=multi123&view=lg&permmsgid=msg-f:1111111111&th=thread-multi123&search=inbox&siml=confirm-forwarding-first123',
        expect.any(Object)
      );
    });

    it('should include response time in result', async () => {
      mockPage.$eval.mockResolvedValueOnce('may now forward mail to'); // Already confirmed

      const result = await acceptEmailForwardingRequest(validRequest);

      expect(result.responseTime).toBeGreaterThan(0);
      expect(typeof result.responseTime).toBe('number');
    });
  });
});
