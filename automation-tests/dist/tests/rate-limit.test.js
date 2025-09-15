"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const api_client_1 = require("../utils/api-client");
const test_data_1 = require("../data/test-data");
const config_1 = require("../config/config");
describe('Rate Limiting Tests', () => {
    let apiClient;
    beforeAll(async () => {
        apiClient = new api_client_1.ApiClient(config_1.config.api.baseUrl);
        console.log('⏱️ Starting Rate Limiting Tests');
    });
    afterEach(async () => {
        await apiClient.wait(1000);
    });
    describe('Anonymous User Rate Limits', () => {
        test('Nên áp dụng rate limit cho register endpoint', async () => {
            const limit = config_1.config.rateLimits.anonymous.register;
            console.log(`📊 Testing register rate limit: ${limit} requests`);
            const users = test_data_1.TestDataGenerator.generateMultipleUsers(limit + 3);
            const requests = users.map(user => ({
                method: 'POST',
                url: '/api/auth/register',
                data: user,
            }));
            const responses = await apiClient.makeConcurrentRequests(requests);
            const successResponses = responses.filter(r => r.status === 201);
            const rateLimitedResponses = responses.filter(r => r.status === 429);
            const validationErrorResponses = responses.filter(r => r.status === 400);
            console.log(`✅ Successful: ${successResponses.length}`);
            console.log(`🚫 Rate Limited: ${rateLimitedResponses.length}`);
            console.log(`❌ Validation Errors: ${validationErrorResponses.length}`);
            expect(rateLimitedResponses.length).toBeGreaterThan(0);
            rateLimitedResponses.forEach(response => {
                expect(response.status).toBe(429);
                expect(response.headers).toHaveRateLimitHeaders();
            });
        });
        test('Nên áp dụng rate limit cho login endpoint', async () => {
            const testUser = test_data_1.TestDataGenerator.generateRandomUser();
            await apiClient.register(testUser);
            const limit = config_1.config.rateLimits.anonymous.login;
            console.log(`📊 Testing login rate limit: ${limit} requests`);
            const credentials = test_data_1.TestDataGenerator.getLoginCredentials(testUser);
            const requests = Array.from({ length: limit + 3 }, () => ({
                method: 'POST',
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
            const user = test_data_1.TestDataGenerator.generateRandomUser();
            const limit = config_1.config.rateLimits.anonymous.register;
            const initialRequests = Array.from({ length: limit + 1 }, () => test_data_1.TestDataGenerator.generateRandomUser());
            for (const userData of initialRequests) {
                await apiClient.register(userData);
            }
            const rateLimitedResponse = await apiClient.register(test_data_1.TestDataGenerator.generateRandomUser());
            expect(rateLimitedResponse.status).toBe(429);
            console.log('⏳ Waiting for rate limit window to reset...');
            await apiClient.wait(60000);
            const newUser = test_data_1.TestDataGenerator.generateRandomUser();
            const resetResponse = await apiClient.register(newUser);
            expect([201, 400]).toContain(resetResponse.status);
        }, 70000);
    });
    describe('Authenticated User Rate Limits', () => {
        let userToken;
        let adminToken;
        beforeAll(async () => {
            const user = test_data_1.TestDataGenerator.generateRandomUser('user');
            await apiClient.register(user);
            const userLogin = await apiClient.login(test_data_1.TestDataGenerator.getLoginCredentials(user));
            userToken = userLogin.data.access_token;
            const admin = test_data_1.TestDataGenerator.generateRandomUser('admin');
            await apiClient.register(admin);
            const adminLogin = await apiClient.login(test_data_1.TestDataGenerator.getLoginCredentials(admin));
            adminToken = adminLogin.data.access_token;
        });
        test('Nên áp dụng rate limit cho user profile endpoint', async () => {
            const limit = config_1.config.rateLimits.user.profile;
            console.log(`📊 Testing user profile rate limit: ${limit} requests`);
            const requests = Array.from({ length: limit + 3 }, () => ({
                method: 'GET',
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
            const users = test_data_1.TestDataGenerator.generateMultipleUsers(10);
            const tokens = [];
            for (const user of users) {
                await apiClient.register(user);
                const loginResponse = await apiClient.login(test_data_1.TestDataGenerator.getLoginCredentials(user));
                tokens.push(loginResponse.data.access_token);
            }
            const limit = config_1.config.rateLimits.user.logout;
            console.log(`📊 Testing user logout rate limit: ${limit} requests`);
            const requests = tokens.slice(0, limit + 3).map(token => ({
                method: 'POST',
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
            const users = test_data_1.TestDataGenerator.generateMultipleUsers(5);
            const refreshTokens = [];
            for (const user of users) {
                const registerResponse = await apiClient.register(user);
                refreshTokens.push(registerResponse.data.refresh_token);
            }
            const limit = config_1.config.rateLimits.user.refresh;
            console.log(`📊 Testing refresh token rate limit: ${limit} requests`);
            const requests = Array.from({ length: limit + 3 }, () => ({
                method: 'POST',
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
        let adminToken;
        let userId;
        beforeAll(async () => {
            const admin = test_data_1.TestDataGenerator.generateRandomUser('admin');
            await apiClient.register(admin);
            const adminLogin = await apiClient.login(test_data_1.TestDataGenerator.getLoginCredentials(admin));
            adminToken = adminLogin.data.access_token;
            const user = test_data_1.TestDataGenerator.generateRandomUser('user');
            await apiClient.register(user);
            const userLogin = await apiClient.login(test_data_1.TestDataGenerator.getLoginCredentials(user));
            const profileResponse = await apiClient.getProfile(userLogin.data.access_token);
            userId = profileResponse.data.id;
        });
        test('Nên áp dụng rate limit cho admin profile edit endpoint', async () => {
            const limit = config_1.config.rateLimits.admin.profileEdit;
            console.log(`📊 Testing admin profile edit rate limit: ${limit} requests`);
            const updateData = test_data_1.TestDataGenerator.getProfileUpdateData().VALID_UPDATE;
            const requests = Array.from({ length: limit + 3 }, () => ({
                method: 'PUT',
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
            const user = test_data_1.TestDataGenerator.generateRandomUser();
            const response = await apiClient.register(user);
            expect(response.headers).toHaveRateLimitHeaders();
            const headers = response.headers;
            expect(headers['x-ratelimit-limit']).toBeDefined();
            expect(headers['x-ratelimit-remaining']).toBeDefined();
            expect(headers['x-ratelimit-reset']).toBeDefined();
            const limit = parseInt(headers['x-ratelimit-limit']);
            const remaining = parseInt(headers['x-ratelimit-remaining']);
            const reset = parseInt(headers['x-ratelimit-reset']);
            expect(limit).toBeGreaterThan(0);
            expect(remaining).toBeGreaterThanOrEqual(0);
            expect(remaining).toBeLessThanOrEqual(limit);
            expect(reset).toBeGreaterThan(Date.now() / 1000);
        });
        test('Nên giảm remaining count với mỗi request', async () => {
            const user1 = test_data_1.TestDataGenerator.generateRandomUser();
            const response1 = await apiClient.register(user1);
            await apiClient.wait(100);
            const user2 = test_data_1.TestDataGenerator.generateRandomUser();
            const response2 = await apiClient.register(user2);
            const remaining1 = parseInt(response1.headers['x-ratelimit-remaining']);
            const remaining2 = parseInt(response2.headers['x-ratelimit-remaining']);
            expect(remaining2).toBeLessThan(remaining1);
        });
    });
    describe('Cross-endpoint Rate Limiting', () => {
        test('Nên có rate limit độc lập cho các endpoint khác nhau', async () => {
            const user = test_data_1.TestDataGenerator.generateRandomUser();
            const registerResponse = await apiClient.register(user);
            const loginResponse = await apiClient.login(test_data_1.TestDataGenerator.getLoginCredentials(user));
            expect(registerResponse.status).toBe(201);
            expect(loginResponse.status).toBe(200);
            const registerRemaining = parseInt(registerResponse.headers['x-ratelimit-remaining']);
            const loginRemaining = parseInt(loginResponse.headers['x-ratelimit-remaining']);
            const registerLimit = config_1.config.rateLimits.anonymous.register;
            const loginLimit = config_1.config.rateLimits.anonymous.login;
            if (registerLimit !== loginLimit) {
                expect(registerRemaining).not.toBe(loginRemaining);
            }
        });
    });
});
//# sourceMappingURL=rate-limit.test.js.map