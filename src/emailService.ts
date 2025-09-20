import puppeteer, { Browser, Page } from 'puppeteer';
import { config } from './config';
import { log } from './utils/logger';
import { trackEmailForwardingStart, trackEmailForwardingEnd } from './utils/metrics';

export interface EmailForwardingRequest {
  url: string;
}

export interface EmailForwardingResult {
  success: boolean;
  message: string;
  email?: string;
  url?: string;
  responseTime: number;
  alreadyConfirmed?: boolean;
}

/**
 * Custom error class for email forwarding operations
 */
export class EmailForwardingError extends Error {
  constructor(
    message: string,
    public code: string,
    public email?: string,
    public url?: string
  ) {
    super(message);
    this.name = 'EmailForwardingError';
  }
}

/**
 * Validate if the URL is a Gmail forwarding confirmation URL
 */
function validateForwardingUrl(url: string): boolean {
  const urlPattern = /^https:\/\/mail-settings\.google\.com\/mail/;
  return urlPattern.test(url);
}

/**
 * Launch Puppeteer browser with production-ready configuration
 */
async function launchBrowser(): Promise<Browser> {
  const browserArgs = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-accelerated-2d-canvas',
    '--no-first-run',
    '--no-zygote',
    '--disable-gpu',
    '--disable-web-security',
    '--disable-features=VizDisplayCompositor',
    '--disable-background-timer-throttling',
    '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding',
  ];

  // Add single-process flag only in production for better resource management
  if (config.isProduction) {
    browserArgs.push('--single-process');
  }

  const launchOptions = {
    headless: true,
    args: browserArgs,
    timeout: config.puppeteer.timeout,
  } as any;

  // Only set executablePath if it's explicitly configured
  if (config.puppeteer.executablePath) {
    launchOptions.executablePath = config.puppeteer.executablePath;
  }

  try {
    return await puppeteer.launch(launchOptions);
  } catch (error) {
    log.warn('Failed to launch browser with configured executable path, trying with bundled Chromium', {
      configuredPath: config.puppeteer.executablePath,
      error: error instanceof Error ? error.message : String(error)
    });
    
    // Fallback: try without executablePath (use bundled Chromium)
    delete launchOptions.executablePath;
    return await puppeteer.launch(launchOptions);
  }
}

/**
 * Check if forwarding is already confirmed
 */
async function checkIfAlreadyConfirmed(page: Page): Promise<boolean> {
  try {
    await page.waitForSelector('p', { timeout: 5000 });
    const text = await page.$eval('p', (el) => 
      el.textContent?.trim().toLowerCase() || ''
    );
    return text.includes('may now forward mail to');
  } catch (error) {
    log.debug('Could not check confirmation status', { error: error instanceof Error ? error.message : String(error) });
    return false;
  }
}

/**
 * Find and click the confirmation button
 */
async function clickConfirmationButton(page: Page): Promise<void> {
  const selectors = [
    "input[value='Confirm']",
    "button[type='submit']",
    "input[type='submit'][value*='Confirm']",
    "button:contains('Confirm')",
  ];

  for (const selector of selectors) {
    try {
      const element = await page.$(selector);
      if (element) {
        await element.click();
        log.debug('Clicked confirmation button', { selector });
        return;
      }
    } catch (error) {
      log.debug('Failed to click with selector', { 
        selector, 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  }

  throw new EmailForwardingError(
    'No confirmation button found',
    'BUTTON_NOT_FOUND'
  );
}

/**
 * Accept Gmail forwarding confirmation request
 */
export async function acceptEmailForwardingRequest(
  requestBody: EmailForwardingRequest
): Promise<EmailForwardingResult> {
  const startTime = trackEmailForwardingStart();
  const operationStart = Date.now();
  
  const url = requestBody.url;
  
  let browser: Browser | undefined;

  try {
    // Validate URL
    if (!validateForwardingUrl(url)) {
      throw new EmailForwardingError(
        'Invalid Gmail forwarding URL format',
        'INVALID_URL_FORMAT',
        undefined,
        url
      );
    }

    log.emailForwarding.start('unknown', url);

    // Launch browser
    browser = await launchBrowser();
    const page = await browser.newPage();

    // Set user agent and viewport for better compatibility
    await page.setUserAgent(
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );
    await page.setViewport({ width: 1280, height: 720 });

    // Navigate to confirmation URL
    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: config.puppeteer.timeout,
    });

    // Check if already confirmed
    const alreadyConfirmed = await checkIfAlreadyConfirmed(page);
    if (alreadyConfirmed) {
      const responseTime = Date.now() - operationStart;
      log.emailForwarding.alreadyConfirmed('unknown');
      
      await browser.close();
      trackEmailForwardingEnd(startTime, true);
      
      return {
        success: true,
        message: 'Email forwarding already confirmed',
        url,
        responseTime,
        alreadyConfirmed: true,
      };
    }

    // Click confirmation button
    await clickConfirmationButton(page);

    // Wait for page to update
    await page.waitForTimeout(3000);

    // Verify success
    const isConfirmed = await checkIfAlreadyConfirmed(page);
    const responseTime = Date.now() - operationStart;

    await browser.close();
    trackEmailForwardingEnd(startTime, isConfirmed);

    if (isConfirmed) {
      log.emailForwarding.success('unknown', responseTime);
      return {
        success: true,
        message: 'Email forwarding confirmed successfully',
        url,
        responseTime,
        alreadyConfirmed: false,
      };
    } else {
      throw new EmailForwardingError(
        'Confirmation failed - page did not update as expected',
        'CONFIRMATION_FAILED',
        undefined,
        url
      );
    }

  } catch (error) {
    const responseTime = Date.now() - operationStart;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    log.emailForwarding.error('unknown', errorMessage, responseTime);
    
    if (browser) {
      try {
        await browser.close();
      } catch (closeError) {
        log.warn('Failed to close browser', { 
          error: closeError instanceof Error ? closeError.message : String(closeError) 
        });
      }
    }
    
    trackEmailForwardingEnd(startTime, false);

    if (error instanceof EmailForwardingError) {
      return {
        success: false,
        message: error.message,
        email: error.email,
        url: error.url,
        responseTime,
      };
    }

    return {
      success: false,
      message: 'Internal error during email forwarding process',
      url,
      responseTime,
    };
  }
}