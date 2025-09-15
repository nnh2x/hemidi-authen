"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const api_client_1 = require("../utils/api-client");
const test_data_1 = require("../data/test-data");
const config_1 = require("../config/config");
describe('Authentication API Tests', () => {
    let apiClient;
    let testUser;
    let userTokens;
    beforeAll(async () => {
        const { isValid, errors } = config_1.config.validate();
        if (!isValid) {
            throw new Error(`Invalid configuration: ${errors.join(', ')}`);
        }
        apiClient = new api_client_1.ApiClient(config_1.config.api.baseUrl);
        testUser = test_data_1.TestDataGenerator.generateRandomUser();
        console.log('🚀 Starting Authentication Tests');
        config_1.config.printConfig();
    });
    afterEach(async () => {
        await apiClient.wait(500);
    });
    describe('POST /api/auth/register - Đăng ký tài khoản mới', () => {
        test('Nên đăng ký thành công với dữ liệu hợp lệ', async () => {
            const response = await apiClient.register(testUser);
            expect(response.status).toBe(201);
            expect(response.data).toHaveJwtTokens();
            expect(response.data.access_token).toBeDefined();
            expect(response.data.refresh_token).toBeDefined();
            expect(response.headers).toHaveRateLimitHeaders();
        });
        test('Nên từ chối đăng ký với tên người dùng trùng lặp', async () => {
            const response = await apiClient.register(testUser);
            expect(response.status).toBe(400);
            expect(response.data).toHaveProperty('message');
            expect(response.data.message).toContain('đã tồn tại');
        });
        test('Nên từ chối đăng ký với mật khẩu không khớp', async () => {
            const invalidUser = test_data_1.TestDataGenerator.TEST_USERS.PASSWORD_MISMATCH;
            const response = await apiClient.register(invalidUser);
            expect(response.status).toBe(400);
            expect(response.data.message).toContain('Mật khẩu xác nhận không khớp');
        });
        test.each(Object.entries(test_data_1.TestDataGenerator.getInvalidRegistrationData()))('Nên từ chối đăng ký với dữ liệu không hợp lệ: %s', async (scenarioName, invalidData) => {
            const response = await apiClient.register(invalidData);
            expect(response.status).toBe(400);
            expect(response.data).toHaveProperty('message');
        });
        test('Nên áp dụng rate limit cho đăng ký anonymous', async () => {
            const limit = config_1.config.rateLimits.anonymous.register;
            const requests = Array.from({ length: limit + 2 }, (_, i) => apiClient.register(test_data_1.TestDataGenerator.generateRandomUser()));
            const responses = await Promise.all(requests);
            responses.slice(0, limit).forEach(response => {
                expect([201, 400]).toContain(response.status);
            });
            responses.slice(limit).forEach(response => {
                expect(response.status).toBe(429);
                expect(response.data.message).toContain('rate limit');
            });
        });
        test('Nên chặn SQL injection attempts', async () => {
            const sqlInjectionData = test_data_1.TestDataGenerator.getSqlInjectionTestData().REGISTRATION;
            const response = await apiClient.register(sqlInjectionData);
            expect(response.status).toBe(400);
            expect(response.data).toHaveProperty('message');
        });
        test('Nên chặn XSS attempts', async () => {
            const xssData = test_data_1.TestDataGenerator.getXssTestData().REGISTRATION;
            const response = await apiClient.register(xssData);
            expect(response.status).toBe(400);
            expect(response.data).toHaveProperty('message');
        });
    });
    describe('POST /api/auth/login - Đăng nhập và nhận JWT token', () => {
        beforeAll(async () => {
            const newUser = test_data_1.TestDataGenerator.generateRandomUser();
            await apiClient.register(newUser);
            testUser = newUser;
        });
        test('Nên đăng nhập thành công với thông tin hợp lệ', async () => {
            const credentials = test_data_1.TestDataGenerator.getLoginCredentials(testUser);
            const response = await apiClient.login(credentials);
            expect(response.status).toBe(200);
            expect(response.data).toHaveJwtTokens();
            expect(response.headers).toHaveRateLimitHeaders();
            userTokens = response.data;
        });
        test('Nên từ chối đăng nhập với mật khẩu sai', async () => {
            const invalidCredentials = {
                userName: testUser.userName,
                password: 'WrongPassword123!',
            };
            const response = await apiClient.login(invalidCredentials);
            expect(response.status).toBe(401);
            expect(response.data.message).toContain('Tên đăng nhập hoặc mật khẩu không đúng');
        });
        test('Nên từ chối đăng nhập với tên người dùng không tồn tại', async () => {
            const nonExistentUser = {
                userName: 'non_existent_user_' + Date.now(),
                password: 'SomePassword123!',
            };
            const response = await apiClient.login(nonExistentUser);
            expect(response.status).toBe(401);
            expect(response.data.message).toContain('Tên đăng nhập hoặc mật khẩu không đúng');
        });
        test.each(Object.entries(test_data_1.TestDataGenerator.getInvalidLoginData()))('Nên từ chối đăng nhập với dữ liệu không hợp lệ: %s', async (scenarioName, invalidData) => {
            const response = await apiClient.login(invalidData);
            expect(response.status).toBe(400);
            expect(response.data).toHaveProperty('message');
        });
        test('Nên áp dụng rate limit cho đăng nhập anonymous', async () => {
            const limit = config_1.config.rateLimits.anonymous.login;
            const credentials = test_data_1.TestDataGenerator.getLoginCredentials(testUser);
            const requests = Array.from({ length: limit + 2 }, () => apiClient.login(credentials));
            const responses = await Promise.all(requests);
            responses.slice(0, limit).forEach(response => {
                expect([200, 401]).toContain(response.status);
            });
            responses.slice(limit).forEach(response => {
                expect(response.status).toBe(429);
                expect(response.data.message).toContain('rate limit');
            });
        });
        test('Nên chặn SQL injection trong đăng nhập', async () => {
            const sqlInjectionData = test_data_1.TestDataGenerator.getSqlInjectionTestData().LOGIN;
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
            expect(response.data.access_token).not.toBe(userTokens.access_token);
            expect(response.headers).toHaveRateLimitHeaders();
            userTokens = response.data;
        });
        test('Nên từ chối làm mới với refresh token không hợp lệ', async () => {
            const response = await apiClient.refreshToken('invalid_refresh_token');
            expect(response.status).toBe(401);
            expect(response.data.message).toContain('Refresh token không hợp lệ');
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
            expect(response.data.userName).toBe(testUser.userName);
            expect(response.headers).toHaveRateLimitHeaders();
        });
        test('Nên từ chối truy cập profile với token không hợp lệ', async () => {
            const response = await apiClient.getProfile('invalid_token');
            expect(response.status).toBe(401);
            expect(response.data.message).toContain('Token không hợp lệ');
        });
        test('Nên từ chối truy cập profile khi không có token', async () => {
            const response = await apiClient.getProfile('');
            expect(response.status).toBe(401);
            expect(response.data.message).toContain('Token không được cung cấp');
        });
    });
    describe('POST /api/auth/logout - Đăng xuất', () => {
        test('Nên đăng xuất thành công với token hợp lệ', async () => {
            expect(userTokens).toBeDefined();
            const response = await apiClient.logout(userTokens.access_token);
            expect(response.status).toBe(200);
            expect(response.data.message).toBe('Đăng xuất thành công');
            expect(response.headers).toHaveRateLimitHeaders();
        });
        test('Nên từ chối sử dụng token đã logout', async () => {
            const response = await apiClient.getProfile(userTokens.access_token);
            expect(response.status).toBe(401);
            expect(response.data.message).toContain('Token đã bị vô hiệu hóa');
        });
        test('Nên từ chối đăng xuất với token không hợp lệ', async () => {
            const response = await apiClient.logout('invalid_token');
            expect(response.status).toBe(401);
            expect(response.data.message).toContain('Token không hợp lệ');
        });
        test('Nên từ chối đăng xuất khi không có token', async () => {
            const response = await apiClient.logout('');
            expect(response.status).toBe(401);
            expect(response.data.message).toContain('Token không được cung cấp');
        });
    });
});
//# sourceMappingURL=auth.test.js.map