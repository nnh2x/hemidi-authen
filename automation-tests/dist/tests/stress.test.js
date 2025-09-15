"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const stress_test_runner_1 = require("../utils/stress-test-runner");
const excel_reporter_1 = require("../utils/excel-reporter");
const api_client_1 = require("../utils/api-client");
const test_data_1 = require("../data/test-data");
const config_1 = require("../config/config");
describe('Comprehensive Stress Tests - Rate Limit Validation', () => {
    let stressRunner;
    let excelReporter;
    let apiClient;
    let testResults = [];
    beforeAll(async () => {
        console.log('🔥 Initializing Comprehensive Stress Test Suite');
        console.log('===============================================');
        stressRunner = new stress_test_runner_1.StressTestRunner(config_1.config.api.baseUrl);
        excelReporter = new excel_reporter_1.ExcelReporter('./reports/stress-tests');
        apiClient = new api_client_1.ApiClient(config_1.config.api.baseUrl);
        const testUser = test_data_1.TestDataGenerator.TEST_USERS.REGULAR_USER;
        await apiClient.register(testUser);
        console.log('✅ Setup completed - Ready for stress testing');
    }, 60000);
    afterAll(async () => {
        if (testResults.length > 0) {
            console.log('\n📊 Generating comprehensive Excel report...');
            await excelReporter.generateReport(testResults, {
                filename: `comprehensive-stress-test-${Date.now()}.xlsx`,
                includeRawData: true,
            });
        }
    }, 30000);
    describe('🚀 Authentication Endpoint Stress Tests', () => {
        test('Should stress test REGISTER endpoint and hit rate limits', async () => {
            const testConfig = {
                endpoint: '/api/auth/register',
                method: 'POST',
                requestsCount: 15,
                concurrency: 8,
                name: 'Register Endpoint Stress Test',
            };
            console.log('\n🎯 Starting REGISTER endpoint stress test');
            const result = await stressRunner.runStressTest(testConfig);
            expect(result.metrics.totalRequests).toBe(15);
            expect(result.metrics.rateLimitedRequests).toBeGreaterThan(0);
            expect(result.metrics.rateLimitRate).toBeGreaterThan(0);
            expect(result.rateLimitHeaders.length).toBeGreaterThan(0);
            testResults.push(result);
            console.log(`✅ Register stress test completed`);
            console.log(`📊 Rate limited requests: ${result.metrics.rateLimitedRequests}/${result.metrics.totalRequests}`);
        }, 120000);
        test('Should stress test LOGIN endpoint and hit rate limits', async () => {
            const testConfig = {
                endpoint: '/api/auth/login',
                method: 'POST',
                requestsCount: 20,
                concurrency: 10,
                name: 'Login Endpoint Stress Test',
                data: test_data_1.TestDataGenerator.getLoginCredentials(test_data_1.TestDataGenerator.TEST_USERS.REGULAR_USER),
            };
            console.log('\n🎯 Starting LOGIN endpoint stress test');
            const result = await stressRunner.runStressTest(testConfig);
            expect(result.metrics.totalRequests).toBe(20);
            expect(result.metrics.rateLimitedRequests).toBeGreaterThan(0);
            expect(result.metrics.successfulRequests).toBeGreaterThan(0);
            testResults.push(result);
            console.log(`✅ Login stress test completed`);
            console.log(`📊 Success: ${result.metrics.successfulRequests}, Rate limited: ${result.metrics.rateLimitedRequests}`);
        }, 120000);
        test('Should stress test multiple endpoints simultaneously', async () => {
            console.log('\n🎯 Starting SIMULTANEOUS multi-endpoint stress test');
            const scenarios = [
                {
                    endpoint: '/api/auth/register',
                    method: 'POST',
                    requestsCount: 8,
                    concurrency: 4,
                    name: 'Concurrent Register Test',
                },
                {
                    endpoint: '/api/auth/login',
                    method: 'POST',
                    requestsCount: 12,
                    concurrency: 6,
                    name: 'Concurrent Login Test',
                    data: test_data_1.TestDataGenerator.getLoginCredentials(test_data_1.TestDataGenerator.TEST_USERS.REGULAR_USER),
                },
            ];
            const promises = scenarios.map(scenario => stressRunner.runStressTest(scenario));
            const results = await Promise.all(promises);
            results.forEach(result => {
                expect(result.metrics.totalRequests).toBeGreaterThan(0);
                expect(result.rateLimitHeaders.length).toBeGreaterThan(0);
                testResults.push(result);
            });
            console.log(`✅ Simultaneous stress tests completed - ${results.length} scenarios`);
        }, 180000);
    });
    describe('🔐 Authenticated User Rate Limit Tests', () => {
        let userToken;
        let adminToken;
        beforeAll(async () => {
            const user = test_data_1.TestDataGenerator.generateRandomUser('user');
            const admin = test_data_1.TestDataGenerator.generateRandomUser('admin');
            await apiClient.register(user);
            await apiClient.register(admin);
            const userLogin = await apiClient.login(test_data_1.TestDataGenerator.getLoginCredentials(user));
            const adminLogin = await apiClient.login(test_data_1.TestDataGenerator.getLoginCredentials(admin));
            userToken = userLogin.data.access_token;
            adminToken = adminLogin.data.access_token;
            console.log('✅ Test users authenticated for rate limit testing');
        });
        test('Should stress test USER PROFILE endpoint', async () => {
            const testConfig = {
                endpoint: '/api/auth/profile',
                method: 'GET',
                requestsCount: 25,
                concurrency: 10,
                name: 'User Profile Stress Test',
                headers: {
                    Authorization: `Bearer ${userToken}`,
                },
            };
            console.log('\n🎯 Starting USER PROFILE endpoint stress test');
            const result = await stressRunner.runStressTest(testConfig);
            expect(result.metrics.totalRequests).toBe(25);
            expect(result.metrics.rateLimitedRequests).toBeGreaterThan(0);
            expect(result.metrics.successfulRequests).toBeGreaterThan(0);
            testResults.push(result);
            console.log(`✅ Profile stress test completed`);
        }, 120000);
        test('Should stress test USER LOGOUT endpoint', async () => {
            const users = test_data_1.TestDataGenerator.generateMultipleUsers(8);
            const tokens = [];
            for (const user of users) {
                await apiClient.register(user);
                const login = await apiClient.login(test_data_1.TestDataGenerator.getLoginCredentials(user));
                tokens.push(login.data.access_token);
            }
            const testConfig = {
                endpoint: '/api/auth/logout',
                method: 'POST',
                requestsCount: 8,
                concurrency: 4,
                name: 'User Logout Stress Test',
                headers: {
                    Authorization: `Bearer ${tokens[0]}`,
                },
            };
            console.log('\n🎯 Starting USER LOGOUT endpoint stress test');
            const result = await stressRunner.runStressTest(testConfig);
            expect(result.metrics.totalRequests).toBe(8);
            expect(result.metrics.rateLimitedRequests).toBeGreaterThan(0);
            testResults.push(result);
            console.log(`✅ Logout stress test completed`);
        }, 120000);
    });
    describe('⚡ Performance Benchmarks', () => {
        test('Should perform high-load performance test', async () => {
            const testConfig = {
                endpoint: '/api/auth/register',
                method: 'POST',
                requestsCount: 50,
                concurrency: 20,
                rampUpTime: 5,
                name: 'High Load Performance Test',
            };
            console.log('\n🎯 Starting HIGH LOAD performance benchmark');
            const result = await stressRunner.runStressTest(testConfig);
            expect(result.metrics.totalRequests).toBe(50);
            expect(result.metrics.averageResponseTime).toBeLessThan(5000);
            expect(result.metrics.requestsPerSecond).toBeGreaterThan(0.5);
            testResults.push(result);
            console.log(`✅ Performance benchmark completed`);
            console.log(`📊 Throughput: ${result.metrics.requestsPerSecond.toFixed(2)} req/s`);
            console.log(`📊 Average response time: ${result.metrics.averageResponseTime.toFixed(2)}ms`);
        }, 300000);
        test('Should validate rate limit recovery after timeout', async () => {
            console.log('\n🎯 Starting RATE LIMIT RECOVERY test');
            const initialConfig = {
                endpoint: '/api/auth/register',
                method: 'POST',
                requestsCount: 10,
                concurrency: 10,
                name: 'Rate Limit Saturation',
            };
            const initialResult = await stressRunner.runStressTest(initialConfig);
            expect(initialResult.metrics.rateLimitedRequests).toBeGreaterThan(0);
            console.log('⏳ Waiting for rate limit window to reset (60s)...');
            await new Promise(resolve => setTimeout(resolve, 60000));
            const recoveryConfig = {
                endpoint: '/api/auth/register',
                method: 'POST',
                requestsCount: 3,
                concurrency: 1,
                name: 'Rate Limit Recovery Test',
            };
            const recoveryResult = await stressRunner.runStressTest(recoveryConfig);
            expect(recoveryResult.metrics.successfulRequests).toBeGreaterThan(0);
            testResults.push(initialResult);
            testResults.push(recoveryResult);
            console.log(`✅ Rate limit recovery test completed`);
        }, 180000);
    });
    describe('📊 Edge Cases and Error Handling', () => {
        test('Should handle malformed requests gracefully', async () => {
            const testConfig = {
                endpoint: '/api/auth/register',
                method: 'POST',
                requestsCount: 10,
                concurrency: 5,
                name: 'Malformed Request Test',
                data: { invalid: 'data' },
            };
            console.log('\n🎯 Starting MALFORMED REQUEST test');
            const result = await stressRunner.runStressTest(testConfig);
            expect(result.metrics.totalRequests).toBe(10);
            expect(result.metrics.failedRequests).toBeGreaterThan(0);
            testResults.push(result);
            console.log(`✅ Malformed request test completed`);
        }, 60000);
        test('Should test rate limit headers consistency', async () => {
            const testConfig = {
                endpoint: '/api/auth/register',
                method: 'POST',
                requestsCount: 5,
                concurrency: 1,
                name: 'Rate Limit Headers Validation',
            };
            console.log('\n🎯 Starting RATE LIMIT HEADERS validation');
            const result = await stressRunner.runStressTest(testConfig);
            expect(result.rateLimitHeaders.length).toBeGreaterThan(0);
            result.rateLimitHeaders.forEach(header => {
                expect(header.limit).toBeGreaterThan(0);
                expect(header.remaining).toBeGreaterThanOrEqual(0);
                expect(header.reset).toBeGreaterThan(0);
            });
            testResults.push(result);
            console.log(`✅ Rate limit headers validation completed`);
        }, 60000);
    });
    describe('📈 Reporting and Metrics', () => {
        test('Should generate detailed Excel reports', async () => {
            if (testResults.length === 0) {
                console.log('⚠️  No test results available for reporting');
                return;
            }
            console.log('\n📊 Generating detailed Excel reports...');
            const reportPath = await excelReporter.generateReport(testResults, {
                filename: `detailed-stress-report-${Date.now()}.xlsx`,
                includeRawData: true,
            });
            expect(reportPath).toBeDefined();
            expect(reportPath).toContain('.xlsx');
            console.log(`✅ Excel report generated: ${reportPath}`);
        }, 30000);
        test('Should validate all metrics are captured', () => {
            console.log('\n📊 Validating captured metrics...');
            const metricsValidation = testResults.map(result => ({
                testName: result.testName,
                hasMetrics: Boolean(result.metrics),
                hasRateLimitHeaders: result.rateLimitHeaders.length > 0,
                hasResponses: result.responses.length > 0,
                metricsComplete: Boolean(result.metrics.totalRequests >= 0 &&
                    result.metrics.averageResponseTime >= 0 &&
                    result.metrics.requestsPerSecond >= 0),
            }));
            metricsValidation.forEach(validation => {
                expect(validation.hasMetrics).toBe(true);
                expect(validation.hasResponses).toBe(true);
                expect(validation.metricsComplete).toBe(true);
            });
            console.log(`✅ All metrics validated for ${metricsValidation.length} test results`);
            console.table(metricsValidation);
        });
    });
});
//# sourceMappingURL=stress.test.js.map