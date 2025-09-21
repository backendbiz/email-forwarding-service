import { config } from '../src/config';

// Set test environment
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error'; // Reduce log noise during tests
process.env.ENABLE_METRICS = 'false'; // Disable metrics during tests

// API Key Authentication for tests
process.env.EFS_API_KEY_REQUIRED = 'true';
process.env.EFS_API_KEYS = 'efs_9FYlJGeBhjpQ8dTk-9zI4190VlSpDPdBet-zm74hCwA,dev-key-12345,efs_staging_test123';
process.env.EFS_API_KEY_HEADER = 'x-api-key';

// Use different port for tests to avoid conflicts
process.env.PORT = '0'; // Use random available port

// Mock Puppeteer for tests
jest.mock('puppeteer', () => ({
  launch: jest.fn(),
}));

// Global test timeout
jest.setTimeout(30000);

// Suppress console logs during tests unless explicitly needed
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeAll(() => {
  console.log = jest.fn();
  console.error = jest.fn();
  console.warn = jest.fn();
});

afterAll(() => {
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});
