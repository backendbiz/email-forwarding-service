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
 * Launch Puppeteer browser with production-ready configuration and Alpine Linux support
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
    '--disable-extensions',
    '--disable-plugins',
    '--disable-default-apps',
    '--disable-sync',
    '--disable-translate',
    '--hide-scrollbars',
    '--mute-audio',
    '--no-default-browser-check',
    '--no-pings',
    '--disable-ipc-flooding-protection',
    // Alpine Chromium specific flags
    '--disable-software-rasterizer',
    '--disable-background-networking',
    '--disable-client-side-phishing-detection',
    '--disable-component-extensions-with-background-pages',
    '--disable-hang-monitor',
    '--disable-prompt-on-repost',
    '--metrics-recording-only',
    '--no-crash-upload',
    '--password-store=basic',
    '--use-mock-keychain',
    '--disable-features=TranslateUI,BlinkGenPropertyTrees',
    '--run-all-compositor-stages-before-draw',
    '--disable-threaded-animation',
    '--disable-threaded-scrolling',
    '--disable-checker-imaging',
    '--disable-new-content-rendering-timeout',
    '--disable-image-animation-resync',
  ];

  // For Alpine containers and production, use single-process mode
  if (config.isProduction || process.env.NODE_ENV === 'production') {
    browserArgs.push('--single-process');
    browserArgs.push('--memory-pressure-off');
  }

  const launchOptions = {
    headless: 'new' as const,
    args: browserArgs,
    timeout: config.puppeteer.timeout,
    ignoreDefaultArgs: false,
    dumpio: false,
  } as any;

  // Only set executablePath if it's explicitly configured
  if (config.puppeteer.executablePath) {
    launchOptions.executablePath = config.puppeteer.executablePath;
  }

  try {
    log.info('Attempting to launch browser with primary configuration', {
      executablePath: config.puppeteer.executablePath,
      headless: launchOptions.headless,
      argsCount: browserArgs.length
    });
    return await puppeteer.launch(launchOptions);
  } catch (error) {
    log.warn('Failed to launch browser with configured executable path, trying fallback approaches', {
      configuredPath: config.puppeteer.executablePath,
      error: error instanceof Error ? error.message : String(error)
    });
    
    // Fallback sequence with Alpine-specific paths first
    const commonPaths = [
      '/usr/bin/chromium',           // Ubuntu Nixpacks (move to first)
      '/usr/bin/google-chrome-stable', // Ubuntu Chrome
      '/usr/bin/chromium-browser',   // Alpine (less likely now)
      '/usr/bin/google-chrome',      
      '/snap/bin/chromium',          
    ];
    
    // Try each path with both new and old headless modes
    for (const execPath of commonPaths) {
      // Try with new headless mode first
      for (const headlessMode of [true, false]) {
        try {
          log.info(`Trying executable path: ${execPath} with headless: ${headlessMode}`);
          const pathOptions = {
            headless: headlessMode,
            executablePath: execPath,
            args: [
              '--no-sandbox',
              '--disable-setuid-sandbox',
              '--disable-dev-shm-usage',
              '--single-process',
              '--disable-gpu',
              '--disable-web-security',
              '--disable-extensions',
              '--no-first-run',
              '--disable-default-apps',
            ],
            timeout: config.puppeteer.timeout,
            dumpio: false,
          };
          
          const browser = await puppeteer.launch(pathOptions);
          log.info(`Successfully launched browser with: ${execPath} (headless: ${headlessMode})`);
          return browser;
        } catch (pathError) {
          log.warn(`Failed with path ${execPath} (headless: ${headlessMode})`, {
            error: pathError instanceof Error ? pathError.message : String(pathError)
          });
          continue;
        }
      }
    }
    
    // Final fallback: Let Puppeteer auto-detect with minimal args
    for (const headlessMode of [true, false]) {
      try {
        log.info(`Trying auto-detection without executable path (headless: ${headlessMode})`);
        const autoOptions = {
          headless: headlessMode,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--single-process',
            '--disable-gpu',
            '--disable-web-security',
          ],
          timeout: config.puppeteer.timeout,
          dumpio: false,
        };
        
        const browser = await puppeteer.launch(autoOptions);
        log.info(`Successfully launched browser with auto-detection (headless: ${headlessMode})`);
        return browser;
      } catch (autoError) {
        log.warn(`Auto-detection failed (headless: ${headlessMode})`, {
          error: autoError instanceof Error ? autoError.message : String(autoError)
        });
        continue;
      }
    }
    
    // If all attempts failed, throw a comprehensive error
    log.error('All browser launch attempts failed');
    throw new EmailForwardingError(
      'Failed to launch browser after trying all fallback options',
      'BROWSER_LAUNCH_FAILED'
    );
  }
}

/**
 * Check if forwarding is already confirmed
 */
async function checkIfAlreadyConfirmed(page: Page): Promise<boolean> {
  try {
    // Wait for page to load and look for confirmation indicators
    await page.waitForSelector('body', { timeout: 10000 });
    
    // Check multiple possible confirmation messages
    const confirmationTexts = [
      'may now forward mail to',
      'forwarding is enabled',
      'forwarding has been confirmed',
      'successfully confirmed',
    ];
    
    // Get all text content from the page
    const pageText = await page.evaluate(() => {
      return document.body?.textContent?.toLowerCase() || '';
    });
    
    // Check if any confirmation text is present
    const isConfirmed = confirmationTexts.some(text => pageText.includes(text));
    
    log.debug('Checking confirmation status', {
      pageText: pageText.substring(0, 200) + '...',
      isConfirmed
    });
    
    return isConfirmed;
  } catch (error) {
    log.debug('Could not check confirmation status', { 
      error: error instanceof Error ? error.message : String(error) 
    });
    return false;
  }
}

/**
 * Find and click the confirmation button
 */
async function clickConfirmationButton(page: Page): Promise<void> {
  const selectors = [
    "input[value='Confirm']",
    "input[value*='Confirm']",
    "button[type='submit']",
    "input[type='submit'][value*='Confirm']",
    "button:contains('Confirm')",
    "input[value='Yes']",
    "button[value='Yes']",
  ];

  // Wait for page to be interactive
  await page.waitForSelector('body', { timeout: 10000 }).catch(() => {});
  await new Promise(resolve => setTimeout(resolve, 2000));

  for (const selector of selectors) {
    try {
      // Handle :contains() pseudo-selector manually for button text
      if (selector.includes(':contains(')) {
        const buttons = await page.$$('button, input[type="submit"], input[type="button"]');
        for (const button of buttons) {
          const text = await button.evaluate((el) => el.textContent || (el as HTMLInputElement).value || '');
          if (text.toLowerCase().includes('confirm') || text.toLowerCase().includes('yes')) {
            await button.click();
            log.debug('Clicked confirmation button by text content', { text });
            return;
          }
        }
      } else {
        const element = await page.$(selector);
        if (element) {
          // Check if element is visible and clickable
          const isVisible = await element.isVisible?.() ?? true;
          if (isVisible) {
            await element.click();
            log.debug('Clicked confirmation button', { selector });
            return;
          }
        }
      }
    } catch (error) {
      log.debug('Failed to click with selector', { 
        selector, 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  }

  // If no button found, try to get more info about the page
  try {
    const buttons = await page.$$eval('button, input[type="submit"], input[type="button"]', (elements) => 
      elements.map(el => ({
        tagName: el.tagName,
        type: (el as HTMLInputElement).type || 'N/A',
        value: (el as HTMLInputElement).value || 'N/A',
        textContent: el.textContent || 'N/A',
      }))
    );
    
    log.warn('No confirmation button found. Available buttons:', { buttons });
  } catch (debugError) {
    log.debug('Could not analyze page buttons', {
      error: debugError instanceof Error ? debugError.message : String(debugError)
    });
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

    // Add extra headers to appear more like a real browser
    await page.setExtraHTTPHeaders({
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Accept-Encoding': 'gzip, deflate',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
    });

    // Navigate to confirmation URL with retry logic
    let navigationSuccess = false;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        log.debug(`Navigation attempt ${attempt}`, { url });
        await page.goto(url, {
          waitUntil: 'domcontentloaded',
          timeout: config.puppeteer.timeout,
        });
        navigationSuccess = true;
        break;
      } catch (navError) {
        log.warn(`Navigation attempt ${attempt} failed`, {
          error: navError instanceof Error ? navError.message : String(navError)
        });
        if (attempt === 3) throw navError;
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    if (!navigationSuccess) {
      throw new EmailForwardingError(
        'Failed to navigate to confirmation page after multiple attempts',
        'NAVIGATION_FAILED',
        undefined,
        url
      );
    }

    // Wait for page to be fully loaded
    await new Promise(resolve => setTimeout(resolve, 3000));

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

    // Wait for page to update with longer timeout
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Verify success with multiple attempts
    let isConfirmed = false;
    for (let attempt = 1; attempt <= 3; attempt++) {
      isConfirmed = await checkIfAlreadyConfirmed(page);
      if (isConfirmed) break;
      
      log.debug(`Confirmation check attempt ${attempt} - not confirmed yet`);
      if (attempt < 3) await new Promise(resolve => setTimeout(resolve, 2000));
    }

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