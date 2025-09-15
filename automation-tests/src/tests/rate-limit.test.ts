import { ApiClient } from '../utils/api-client';
import { TestDataGenerator } from '../data/test-data';
import { config } from '../config/config';

describe('Rate Limiting Tests', () => {
  let apiClient: ApiClient;

  beforeAll(async () => {
    apiClient = new ApiClient(config.api.baseUrl);
    console.log('⏱️ Starting Rate Limiting Tests');
  });

  afterEach(async () => {
    // Wait to reset rate limit windows
    await apiClient.wait(1000);
  });

  describe('Anonymous User Rate Limits', () => {
    test('Nên áp dụng rate limit cho register endpoint', async () => {
      const limit = config.rateLimits.anonymous.register;
      console.log(`📊 Testing register rate limit: ${limit} requests`);
      
      // Create requests array
      const users = TestDataGenerator.generateMultipleUsers(limit + 3);
      const requests = users.map(user => ({
        method: 'POST' as const,
        url: '/api/auth/register',
        data: user,
      }));

      // Send all requests simultaneously
      const responses = await apiClient.makeConcurrentRequests(requests);
      
      // Count successful and rate-limited responses
      const successResponses = responses.filter(r => r.status === 201);
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      const validationErrorResponses = responses.filter(r => r.status === 400);
      
      console.log(`✅ Successful: ${successResponses.length}`);
      console.log(`🚫 Rate Limited: ${rateLimitedResponses.length}`);
      console.log(`❌ Validation Errors: ${validationErrorResponses.length}`);
      
      // Should have at least some rate limited responses
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
      
      // Check rate limit headers
      rateLimitedResponses.forEach(response => {
        expect(response.status).toBe(429);
        expect(response.headers).toHaveRateLimitHeaders();
      });
    });

    test('Nên áp dụng rate limit cho login endpoint', async () => {
      // First register a user
      const testUser = TestDataGenerator.generateRandomUser();
      await apiClient.register(testUser);
      
      const limit = config.rateLimits.anonymous.login;
      console.log(`📊 Testing login rate limit: ${limit} requests`);
      
      const credentials = TestDataGenerator.getLoginCredentials(testUser);
      const requests = Array.from({ length: limit + 3 }, () => ({
        method: 'POST' as const,
        url: '/api/auth/login',
        data: credentials,
      }));

      const responses = await apiClient.makeConcurrentRequests(requests);
      
      const successResponses = responses.filter(r => r.status === 200);
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      
      console.log(`✅ Successful: ${successResponses.length}`);
      console.log(`🚫 Rate Limited: ${rateLimitedResponses.length}`);
      
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
      
      rateLimitedResponses.forEach(response => {
        expect(response.status).toBe(429);
        expect(response.headers).toHaveRateLimitHeaders();
      });
    });

    test('Nên reset rate limit sau khi hết thời gian window', async () => {
      // Test that rate limits reset after the time window
      const user = TestDataGenerator.generateRandomUser();
      const limit = config.rateLimits.anonymous.register;
      
      // First, hit the rate limit
      const initialRequests = Array.from({ length: limit + 1 }, () => 
        TestDataGenerator.generateRandomUser()
      );
      
      for (const userData of initialRequests) {
        await apiClient.register(userData);
      }
      
      // Verify we're rate limited
      const rateLimitedResponse = await apiClient.register(TestDataGenerator.generateRandomUser());
      expect(rateLimitedResponse.status).toBe(429);
      
      console.log('⏳ Waiting for rate limit window to reset...');
      // Wait for rate limit window to reset (adjust based on your rate limit window)
      await apiClient.wait(60000); // 1 minute - adjust based on your configuration
      
      // Should be able to register again
      const newUser = TestDataGenerator.generateRandomUser();
      const resetResponse = await apiClient.register(newUser);
      expect([201, 400]).toContain(resetResponse.status); // 201 success or 400 validation
    }, 70000); // Extend test timeout
  });

  describe('Authenticated User Rate Limits', () => {
    let userToken: string;
    let adminToken: string;

    beforeAll(async () => {
      // Create and login regular user
      const user = TestDataGenerator.generateRandomUser('user');
      await apiClient.register(user);
      const userLogin = await apiClient.login(TestDataGenerator.getLoginCredentials(user));
      userToken = userLogin.data.access_token;

      // Create and login admin user
      const admin = TestDataGenerator.generateRandomUser('admin');
      await apiClient.register(admin);
      const adminLogin = await apiClient.login(TestDataGenerator.getLoginCredentials(admin));
      adminToken = adminLogin.data.access_token;
    });

    test('Nên áp dụng rate limit cho user profile endpoint', async () => {
      const limit = config.rateLimits.user.profile;
      console.log(`📊 Testing user profile rate limit: ${limit} requests`);
      
      const requests = Array.from({ length: limit + 3 }, () => ({
        method: 'GET' as const,
        url: '/api/auth/profile',
        headers: {
          Authorization: `Bearer ${userToken}`,
        },
      }));

      const responses = await apiClient.makeConcurrentRequests(requests);
      
      const successResponses = responses.filter(r => r.status === 200);
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      
      console.log(`✅ Successful: ${successResponses.length}`);
      console.log(`🚫 Rate Limited: ${rateLimitedResponses.length}`);
      
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
      
      rateLimitedResponses.forEach(response => {
        expect(response.status).toBe(429);
        expect(response.headers).toHaveRateLimitHeaders();
      });
    });

    test('Nên áp dụng rate limit cho user logout endpoint', async () => {
      // Create multiple users for logout testing
      const users = TestDataGenerator.generateMultipleUsers(10);
      const tokens: string[] = [];
      
      for (const user of users) {
        await apiClient.register(user);
        const loginResponse = await apiClient.login(TestDataGenerator.getLoginCredentials(user));
        tokens.push(loginResponse.data.access_token);
      }
      
      const limit = config.rateLimits.user.logout;
      console.log(`📊 Testing user logout rate limit: ${limit} requests`);
      
      const requests = tokens.slice(0, limit + 3).map(token => ({
        method: 'POST' as const,
        url: '/api/auth/logout',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }));

      const responses = await apiClient.makeConcurrentRequests(requests);
      
      const successResponses = responses.filter(r => r.status === 200);
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      
      console.log(`✅ Successful: ${successResponses.length}`);
      console.log(`🚫 Rate Limited: ${rateLimitedResponses.length}`);
      
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    test('Nên áp dụng rate limit cho refresh token endpoint', async () => {
      // Get refresh tokens from multiple users
      const users = TestDataGenerator.generateMultipleUsers(5);
      const refreshTokens: string[] = [];
      
      for (const user of users) {
        const registerResponse = await apiClient.register(user);
        refreshTokens.push(registerResponse.data.refresh_token);
      }
      
      const limit = config.rateLimits.user.refresh;
      console.log(`📊 Testing refresh token rate limit: ${limit} requests`);
      
      // Use the same refresh token multiple times to test rate limit
      const requests = Array.from({ length: limit + 3 }, () => ({
        method: 'POST' as const,
        url: '/api/auth/refresh',
        data: { refresh_token: refreshTokens[0] },
      }));

      const responses = await apiClient.makeConcurrentRequests(requests);
      
      const successResponses = responses.filter(r => r.status === 200);
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      const errorResponses = responses.filter(r => r.status === 401);
      
      console.log(`✅ Successful: ${successResponses.length}`);
      console.log(`🚫 Rate Limited: ${rateLimitedResponses.length}`);
      console.log(`❌ Token Errors: ${errorResponses.length}`);
      
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('Admin Rate Limits', () => {
    let adminToken: string;
    let userId: number;

    beforeAll(async () => {
      // Create admin user
      const admin = TestDataGenerator.generateRandomUser('admin');
      await apiClient.register(admin);
      const adminLogin = await apiClient.login(TestDataGenerator.getLoginCredentials(admin));
      adminToken = adminLogin.data.access_token;

      // Create a regular user for profile editing
      const user = TestDataGenerator.generateRandomUser('user');
      await apiClient.register(user);
      const userLogin = await apiClient.login(TestDataGenerator.getLoginCredentials(user));
      const profileResponse = await apiClient.getProfile(userLogin.data.access_token);
      userId = profileResponse.data.id;
    });

    test('Nên áp dụng rate limit cho admin profile edit endpoint', async () => {
      const limit = config.rateLimits.admin.profileEdit;
      console.log(`📊 Testing admin profile edit rate limit: ${limit} requests`);
      
      const updateData = TestDataGenerator.getProfileUpdateData().VALID_UPDATE;
      const requests = Array.from({ length: limit + 3 }, () => ({
        method: 'PUT' as const,
        url: `/api/auth/profile/${userId}`,
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
        data: updateData,
      }));

      const responses = await apiClient.makeConcurrentRequests(requests);
      
      const successResponses = responses.filter(r => r.status === 200);
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      const errorResponses = responses.filter(r => r.status >= 400 && r.status < 429);
      
      console.log(`✅ Successful: ${successResponses.length}`);
      console.log(`🚫 Rate Limited: ${rateLimitedResponses.length}`);
      console.log(`❌ Other Errors: ${errorResponses.length}`);
      
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
      
      rateLimitedResponses.forEach(response => {
        expect(response.status).toBe(429);
        expect(response.headers).toHaveRateLimitHeaders();
      });
    });
  });

  describe('Rate Limit Headers Validation', () => {
    test('Nên trả về rate limit headers chính xác', async () => {
      const user = TestDataGenerator.generateRandomUser();
      const response = await apiClient.register(user);
      
      expect(response.headers).toHaveRateLimitHeaders();
      
      // Check specific headers exist
      const headers = response.headers;
      expect(headers['x-ratelimit-limit']).toBeDefined();
      expect(headers['x-ratelimit-remaining']).toBeDefined();
      expect(headers['x-ratelimit-reset']).toBeDefined();
      
      // Validate header values
      const limit = parseInt(headers['x-ratelimit-limit']);
      const remaining = parseInt(headers['x-ratelimit-remaining']);
      const reset = parseInt(headers['x-ratelimit-reset']);
      
      expect(limit).toBeGreaterThan(0);
      expect(remaining).toBeGreaterThanOrEqual(0);
      expect(remaining).toBeLessThanOrEqual(limit);
      expect(reset).toBeGreaterThan(Date.now() / 1000); // Reset time should be in the future
    });

    test('Nên giảm remaining count với mỗi request', async () => {
      const user1 = TestDataGenerator.generateRandomUser();
      const response1 = await apiClient.register(user1);
      
      await apiClient.wait(100);
      
      const user2 = TestDataGenerator.generateRandomUser();
      const response2 = await apiClient.register(user2);
      
      const remaining1 = parseInt(response1.headers['x-ratelimit-remaining']);
      const remaining2 = parseInt(response2.headers['x-ratelimit-remaining']);
      
      expect(remaining2).toBeLessThan(remaining1);
    });
  });

  describe('Cross-endpoint Rate Limiting', () => {
    test('Nên có rate limit độc lập cho các endpoint khác nhau', async () => {
      // Test that different endpoints have independent rate limits
      const user = TestDataGenerator.generateRandomUser();
      const registerResponse = await apiClient.register(user);
      const loginResponse = await apiClient.login(TestDataGenerator.getLoginCredentials(user));
      
      // Both should succeed independently
      expect(registerResponse.status).toBe(201);
      expect(loginResponse.status).toBe(200);
      
      // Check that rate limit counters are independent
      const registerRemaining = parseInt(registerResponse.headers['x-ratelimit-remaining']);
      const loginRemaining = parseInt(loginResponse.headers['x-ratelimit-remaining']);
      
      // They should have different remaining counts if limits are different
      const registerLimit = config.rateLimits.anonymous.register;
      const loginLimit = config.rateLimits.anonymous.login;
      
      if (registerLimit !== loginLimit) {
        expect(registerRemaining).not.toBe(loginRemaining);
      }
    });
  });
});
