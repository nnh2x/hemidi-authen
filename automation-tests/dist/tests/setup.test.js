"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("../config/config");
const api_client_1 = require("../utils/api-client");
const test_data_1 = require("../data/test-data");
describe('Setup Verification Tests', () => {
    test('Nên load configuration thành công', () => {
        expect(config_1.config).toBeDefined();
        expect(config_1.config.api).toBeDefined();
        expect(config_1.config.api.baseUrl).toBeDefined();
        expect(config_1.config.rateLimits).toBeDefined();
        console.log('✅ Configuration loaded successfully');
        console.log(`📍 Base URL: ${config_1.config.api.baseUrl}`);
    });
    test('Nên khởi tạo API client thành công', () => {
        const apiClient = new api_client_1.ApiClient();
        expect(apiClient).toBeDefined();
        console.log('✅ API Client initialized successfully');
    });
    test('Nên generate test data thành công', () => {
        const user = test_data_1.TestDataGenerator.generateRandomUser();
        expect(user).toBeDefined();
        expect(user.userName).toBeDefined();
        expect(user.password).toBeDefined();
        expect(user.userCode).toBeDefined();
        console.log('✅ Test data generation working');
        console.log(`👤 Sample user: ${user.userName}`);
    });
    test('Nên validate custom matchers exist', () => {
        expect(expect.extend).toBeDefined();
        console.log('✅ Jest setup completed');
    });
});
//# sourceMappingURL=setup.test.js.map