import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Global test configuration
jest.setTimeout(parseInt(process.env.DEFAULT_TIMEOUT || '30000'));

// Global test setup
beforeAll(async () => {
  console.log('🚀 Starting Automation Tests...');
  console.log(`📍 Base URL: ${process.env.BASE_URL}`);
});

afterAll(async () => {
  console.log('✅ All tests completed');
});

// Add custom matchers
expect.extend({
  toBeValidJWT(received: string) {
    const jwtRegex = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/;
    const pass = jwtRegex.test(received);
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid JWT`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid JWT`,
        pass: false,
      };
    }
  },
  
  toHaveRateLimitHeaders(received: any) {
    const requiredHeaders = [
      'x-ratelimit-limit',
      'x-ratelimit-remaining', 
      'x-ratelimit-reset',
      'x-ratelimit-window'
    ];
    
    const missingHeaders = requiredHeaders.filter(header => 
      !received.headers || !received.headers[header]
    );
    
    const pass = missingHeaders.length === 0;
    
    if (pass) {
      return {
        message: () => `expected response not to have rate limit headers`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected response to have rate limit headers. Missing: ${missingHeaders.join(', ')}`,
        pass: false,
      };
    }
  }
});

// Declare custom matchers for TypeScript
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidJWT(): R;
      toHaveRateLimitHeaders(): R;
    }
  }
}
