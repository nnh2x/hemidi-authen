import { ApiClient } from '../utils/api-client';
import { TestDataGenerator } from '../data/test-data';
import { config } from '../config/config';

// Type assertion helper for test responses
const asAny = (data: any) => data as any;

describe('Authentication API Tests', () => {
  let apiClient: ApiClient;
  let testUser: any;
  let userTokens: any;

  beforeAll(async () => {
    // Validate configuration
    const { isValid, errors } = config.validate();
    if (!isValid) {
      throw new Error(`Invalid configuration: ${errors.join(', ')}`);
    }

    apiClient = new ApiClient(config.api.baseUrl);
    testUser = TestDataGenerator.generateRandomUser();
    
    console.log('🚀 Starting Authentication Tests');
    config.printConfig();
  });

  afterEach(async () => {
    // Wait between tests to avoid rate limiting
    await apiClient.wait(500);
  });

  describe('POST /api/auth/register - Đăng ký tài khoản mới', () => {
    test('Nên đăng ký thành công với dữ liệu hợp lệ', async () => {
      const response = await apiClient.register(testUser);
      
      expect(response.status).toBe(201);
      expect(asAny(response.data)).toHaveJwtTokens();
      expect(asAny(response.data).access_token).toBeDefined();
      expect(asAny(response.data).refresh_token).toBeDefined();
      expect(response.headers).toHaveRateLimitHeaders();
    });

    test('Nên từ chối đăng ký với tên người dùng trùng lặp', async () => {
      const response = await apiClient.register(testUser);
      
      expect(response.status).toBe(400);
      expect(response.data).toHaveProperty('message');
      expect((response.data as any).message).toContain('đã tồn tại');
    });

    test('Nên từ chối đăng ký với mật khẩu không khớp', async () => {
      const invalidUser = TestDataGenerator.TEST_USERS.PASSWORD_MISMATCH;
      const response = await apiClient.register(invalidUser);
      
      expect(response.status).toBe(400);
      expect((response.data as any).message).toContain('Mật khẩu xác nhận không khớp');
    });

    test.each(Object.entries(TestDataGenerator.getInvalidRegistrationData()))(
      'Nên từ chối đăng ký với dữ liệu không hợp lệ: %s',
      async (scenarioName, invalidData) => {
        const response = await apiClient.register(invalidData);
        
        expect(response.status).toBe(400);
        expect(response.data).toHaveProperty('message');
      }
    );

    test('Nên áp dụng rate limit cho đăng ký anonymous', async () => {
      const limit = config.rateLimits.anonymous.register;
      const requests = Array.from({ length: limit + 2 }, (_, i) => 
        apiClient.register(TestDataGenerator.generateRandomUser())
      );

      const responses = await Promise.all(requests);
      
      // First requests should succeed
      responses.slice(0, limit).forEach(response => {
        expect([201, 400]).toContain(response.status); // 201 for success, 400 for validation
      });

      // Excess requests should be rate limited
      responses.slice(limit).forEach(response => {
        expect(response.status).toBe(429);
        expect(asAny(response.data).message).toContain('rate limit');
      });
    });

    test('Nên chặn SQL injection attempts', async () => {
      const sqlInjectionData = TestDataGenerator.getSqlInjectionTestData().REGISTRATION;
      const response = await apiClient.register(sqlInjectionData);
      
      expect(response.status).toBe(400);
      expect(response.data).toHaveProperty('message');
    });

    test('Nên chặn XSS attempts', async () => {
      const xssData = TestDataGenerator.getXssTestData().REGISTRATION;
      const response = await apiClient.register(xssData);
      
      expect(response.status).toBe(400);
      expect(response.data).toHaveProperty('message');
    });
  });

  describe('POST /api/auth/login - Đăng nhập và nhận JWT token', () => {
    beforeAll(async () => {
      // Ensure we have a registered user for login tests
      const newUser = TestDataGenerator.generateRandomUser();
      await apiClient.register(newUser);
      testUser = newUser;
    });

    test('Nên đăng nhập thành công với thông tin hợp lệ', async () => {
      const credentials = TestDataGenerator.getLoginCredentials(testUser);
      const response = await apiClient.login(credentials);
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveJwtTokens();
      expect(response.headers).toHaveRateLimitHeaders();
      
      // Store tokens for subsequent tests
      userTokens = response.data;
    });

    test('Nên từ chối đăng nhập với mật khẩu sai', async () => {
      const invalidCredentials = {
        userName: testUser.userName,
        password: 'WrongPassword123!',
      };
      const response = await apiClient.login(invalidCredentials);
      
      expect(response.status).toBe(401);
      expect(asAny(response.data).message).toContain('Tên đăng nhập hoặc mật khẩu không đúng');
    });

    test('Nên từ chối đăng nhập với tên người dùng không tồn tại', async () => {
      const nonExistentUser = {
        userName: 'non_existent_user_' + Date.now(),
        password: 'SomePassword123!',
      };
      const response = await apiClient.login(nonExistentUser);
      
      expect(response.status).toBe(401);
      expect(asAny(response.data).message).toContain('Tên đăng nhập hoặc mật khẩu không đúng');
    });

    test.each(Object.entries(TestDataGenerator.getInvalidLoginData()))(
      'Nên từ chối đăng nhập với dữ liệu không hợp lệ: %s',
      async (scenarioName, invalidData) => {
        const response = await apiClient.login(invalidData);
        
        expect(response.status).toBe(400);
        expect(response.data).toHaveProperty('message');
      }
    );

    test('Nên áp dụng rate limit cho đăng nhập anonymous', async () => {
      const limit = config.rateLimits.anonymous.login;
      const credentials = TestDataGenerator.getLoginCredentials(testUser);
      
      const requests = Array.from({ length: limit + 2 }, () => 
        apiClient.login(credentials)
      );

      const responses = await Promise.all(requests);
      
      // First requests should process (success or auth failure)
      responses.slice(0, limit).forEach(response => {
        expect([200, 401]).toContain(response.status);
      });

      // Excess requests should be rate limited
      responses.slice(limit).forEach(response => {
        expect(response.status).toBe(429);
        expect(asAny(response.data).message).toContain('rate limit');
      });
    });

    test('Nên chặn SQL injection trong đăng nhập', async () => {
      const sqlInjectionData = TestDataGenerator.getSqlInjectionTestData().LOGIN;
      const response = await apiClient.login(sqlInjectionData);
      
      expect([400, 401]).toContain(response.status);
      expect(response.data).toHaveProperty('message');
    });
  });

  describe('POST /api/auth/refresh - Làm mới access token', () => {
    test('Nên làm mới token thành công với refresh token hợp lệ', async () => {
      expect(userTokens).toBeDefined();
      
      const response = await apiClient.refreshToken(userTokens.refresh_token);
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveJwtTokens();
      expect(asAny(response.data).access_token).not.toBe(userTokens.access_token);
      expect(response.headers).toHaveRateLimitHeaders();
      
      // Update tokens
      userTokens = response.data;
    });

    test('Nên từ chối làm mới với refresh token không hợp lệ', async () => {
      const response = await apiClient.refreshToken('invalid_refresh_token');
      
      expect(response.status).toBe(401);
      expect(asAny(response.data).message).toContain('Refresh token không hợp lệ');
    });

    test('Nên từ chối làm mới với refresh token rỗng', async () => {
      const response = await apiClient.refreshToken('');
      
      expect(response.status).toBe(400);
      expect(response.data).toHaveProperty('message');
    });
  });

  describe('GET /api/auth/profile - Lấy thông tin người dùng', () => {
    test('Nên lấy thông tin profile thành công với token hợp lệ', async () => {
      expect(userTokens).toBeDefined();
      
      const response = await apiClient.getProfile(userTokens.access_token);
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('id');
      expect(response.data).toHaveProperty('userName');
      expect(response.data).toHaveProperty('userCode');
      expect(asAny(response.data).userName).toBe(testUser.userName);
      expect(response.headers).toHaveRateLimitHeaders();
    });

    test('Nên từ chối truy cập profile với token không hợp lệ', async () => {
      const response = await apiClient.getProfile('invalid_token');
      
      expect(response.status).toBe(401);
      expect(asAny(response.data).message).toContain('Token không hợp lệ');
    });

    test('Nên từ chối truy cập profile khi không có token', async () => {
      const response = await apiClient.getProfile('');
      
      expect(response.status).toBe(401);
      expect(asAny(response.data).message).toContain('Token không được cung cấp');
    });
  });

  describe('POST /api/auth/logout - Đăng xuất', () => {
    test('Nên đăng xuất thành công với token hợp lệ', async () => {
      expect(userTokens).toBeDefined();
      
      const response = await apiClient.logout(userTokens.access_token);
      
      expect(response.status).toBe(200);
      expect(asAny(response.data).message).toBe('Đăng xuất thành công');
      expect(response.headers).toHaveRateLimitHeaders();
    });

    test('Nên từ chối sử dụng token đã logout', async () => {
      // Try to use the logged out token
      const response = await apiClient.getProfile(userTokens.access_token);
      
      expect(response.status).toBe(401);
      expect(asAny(response.data).message).toContain('Token đã bị vô hiệu hóa');
    });

    test('Nên từ chối đăng xuất với token không hợp lệ', async () => {
      const response = await apiClient.logout('invalid_token');
      
      expect(response.status).toBe(401);
      expect(asAny(response.data).message).toContain('Token không hợp lệ');
    });

    test('Nên từ chối đăng xuất khi không có token', async () => {
      const response = await apiClient.logout('');
      
      expect(response.status).toBe(401);
      expect(asAny(response.data).message).toContain('Token không được cung cấp');
    });
  });
});
