"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StressTestRunner = void 0;
const api_client_1 = require("./api-client");
const test_data_1 = require("../data/test-data");
class StressTestRunner {
    constructor(baseURL) {
        this.results = [];
        this.apiClient = new api_client_1.ApiClient(baseURL);
    }
    async runStressTest(config) {
        console.log(`🔥 Starting stress test: ${config.name}`);
        console.log(`📊 Target: ${config.requestsCount} requests with ${config.concurrency} concurrent users`);
        const startTime = Date.now();
        const responses = [];
        const rateLimitHeaders = [];
        const errors = [];
        const responseTimes = [];
        const requests = this.prepareRequests(config);
        if (config.rampUpTime) {
            await this.executeWithRampUp(requests, config, responses, rateLimitHeaders, errors, responseTimes);
        }
        else {
            await this.executeImmediate(requests, config, responses, rateLimitHeaders, errors, responseTimes);
        }
        const endTime = Date.now();
        const duration = endTime - startTime;
        const metrics = this.calculateMetrics(responses, responseTimes, startTime, endTime);
        const result = {
            endpoint: config.endpoint,
            testName: config.name,
            metrics,
            responses,
            rateLimitHeaders,
            errors,
        };
        this.results.push(result);
        this.logResults(result);
        return result;
    }
    prepareRequests(config) {
        const requests = [];
        for (let i = 0; i < config.requestsCount; i++) {
            let requestData = config.data;
            if (config.endpoint.includes('/register')) {
                requestData = test_data_1.TestDataGenerator.generateRandomUser();
            }
            else if (config.endpoint.includes('/login')) {
                requestData = test_data_1.TestDataGenerator.getLoginCredentials(test_data_1.TestDataGenerator.TEST_USERS.REGULAR_USER);
            }
            requests.push({
                method: config.method,
                url: config.endpoint,
                headers: config.headers,
                data: requestData,
            });
        }
        return requests;
    }
    async executeImmediate(requests, config, responses, rateLimitHeaders, errors, responseTimes) {
        const batches = this.createBatches(requests, config.concurrency);
        for (const [batchIndex, batch] of batches.entries()) {
            console.log(`📦 Executing batch ${batchIndex + 1}/${batches.length} (${batch.length} requests)`);
            const batchPromises = batch.map(async (request) => {
                const requestStart = Date.now();
                try {
                    const response = await this.apiClient.request(request);
                    const requestEnd = Date.now();
                    const responseTime = requestEnd - requestStart;
                    responses.push(response);
                    responseTimes.push(responseTime);
                    this.extractRateLimitHeaders(response, config.endpoint, rateLimitHeaders);
                    return response;
                }
                catch (error) {
                    errors.push({
                        request,
                        error: error instanceof Error ? error.message : String(error),
                        timestamp: Date.now(),
                    });
                    throw error;
                }
            });
            await Promise.allSettled(batchPromises);
            if (batchIndex < batches.length - 1) {
                await this.sleep(100);
            }
        }
    }
    async executeWithRampUp(requests, config, responses, rateLimitHeaders, errors, responseTimes) {
        const rampUpMs = config.rampUpTime * 1000;
        const delayBetweenUsers = rampUpMs / config.concurrency;
        console.log(`⏳ Ramping up ${config.concurrency} users over ${config.rampUpTime}s`);
        const batches = this.createBatches(requests, config.concurrency);
        for (const [batchIndex, batch] of batches.entries()) {
            const userPromises = batch.map(async (request, userIndex) => {
                await this.sleep(userIndex * delayBetweenUsers);
                const requestStart = Date.now();
                try {
                    const response = await this.apiClient.request(request);
                    const requestEnd = Date.now();
                    const responseTime = requestEnd - requestStart;
                    responses.push(response);
                    responseTimes.push(responseTime);
                    this.extractRateLimitHeaders(response, config.endpoint, rateLimitHeaders);
                    return response;
                }
                catch (error) {
                    errors.push({
                        request,
                        error: error instanceof Error ? error.message : String(error),
                        timestamp: Date.now(),
                    });
                }
            });
            await Promise.allSettled(userPromises);
        }
    }
    createBatches(array, batchSize) {
        const batches = [];
        for (let i = 0; i < array.length; i += batchSize) {
            batches.push(array.slice(i, i + batchSize));
        }
        return batches;
    }
    extractRateLimitHeaders(response, endpoint, rateLimitHeaders) {
        const headers = response.headers;
        if (headers['x-ratelimit-limit']) {
            rateLimitHeaders.push({
                timestamp: Date.now(),
                endpoint,
                limit: parseInt(headers['x-ratelimit-limit']) || 0,
                remaining: parseInt(headers['x-ratelimit-remaining']) || 0,
                reset: parseInt(headers['x-ratelimit-reset']) || 0,
                retryAfter: headers['retry-after'] ? parseInt(headers['retry-after']) : undefined,
            });
        }
    }
    calculateMetrics(responses, responseTimes, startTime, endTime) {
        const totalRequests = responses.length;
        const successfulRequests = responses.filter(r => r.status >= 200 && r.status < 300).length;
        const rateLimitedRequests = responses.filter(r => r.status === 429).length;
        const failedRequests = responses.filter(r => r.status >= 400 && r.status !== 429).length;
        const duration = endTime - startTime;
        const durationSeconds = duration / 1000;
        const averageResponseTime = responseTimes.length > 0
            ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
            : 0;
        return {
            totalRequests,
            successfulRequests,
            failedRequests,
            rateLimitedRequests,
            averageResponseTime,
            minResponseTime: Math.min(...responseTimes) || 0,
            maxResponseTime: Math.max(...responseTimes) || 0,
            requestsPerSecond: totalRequests / durationSeconds,
            errorRate: (failedRequests / totalRequests) * 100,
            rateLimitRate: (rateLimitedRequests / totalRequests) * 100,
            startTime,
            endTime,
            duration,
        };
    }
    logResults(result) {
        const { metrics } = result;
        console.log('\n📈 STRESS TEST RESULTS');
        console.log('========================');
        console.log(`🎯 Test: ${result.testName}`);
        console.log(`🔗 Endpoint: ${result.endpoint}`);
        console.log(`⏱️  Duration: ${metrics.duration}ms (${(metrics.duration / 1000).toFixed(2)}s)`);
        console.log(`📊 Total Requests: ${metrics.totalRequests}`);
        console.log(`✅ Successful: ${metrics.successfulRequests} (${((metrics.successfulRequests / metrics.totalRequests) * 100).toFixed(1)}%)`);
        console.log(`❌ Failed: ${metrics.failedRequests} (${metrics.errorRate.toFixed(1)}%)`);
        console.log(`🚫 Rate Limited: ${metrics.rateLimitedRequests} (${metrics.rateLimitRate.toFixed(1)}%)`);
        console.log(`🚀 Throughput: ${metrics.requestsPerSecond.toFixed(2)} req/s`);
        console.log(`📊 Avg Response Time: ${metrics.averageResponseTime.toFixed(2)}ms`);
        console.log(`📊 Min Response Time: ${metrics.minResponseTime}ms`);
        console.log(`📊 Max Response Time: ${metrics.maxResponseTime}ms`);
        console.log('========================\n');
    }
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    async runAuthenticationStressTests() {
        const scenarios = [
            {
                endpoint: '/api/auth/register',
                method: 'POST',
                requestsCount: 20,
                concurrency: 10,
                name: 'Register Endpoint Stress Test',
            },
            {
                endpoint: '/api/auth/login',
                method: 'POST',
                requestsCount: 30,
                concurrency: 15,
                name: 'Login Endpoint Stress Test',
                data: test_data_1.TestDataGenerator.getLoginCredentials(test_data_1.TestDataGenerator.TEST_USERS.REGULAR_USER),
            },
        ];
        const results = [];
        for (const scenario of scenarios) {
            const result = await this.runStressTest(scenario);
            results.push(result);
            await this.sleep(2000);
        }
        return results;
    }
    async runRateLimitStressTests() {
        const scenarios = [
            {
                endpoint: '/api/auth/register',
                method: 'POST',
                requestsCount: 10,
                concurrency: 10,
                name: 'Register Rate Limit Test',
            },
            {
                endpoint: '/api/auth/login',
                method: 'POST',
                requestsCount: 15,
                concurrency: 15,
                name: 'Login Rate Limit Test',
                data: test_data_1.TestDataGenerator.getLoginCredentials(test_data_1.TestDataGenerator.TEST_USERS.REGULAR_USER),
            },
        ];
        const results = [];
        for (const scenario of scenarios) {
            const result = await this.runStressTest(scenario);
            results.push(result);
            console.log('⏳ Waiting for rate limit reset...');
            await this.sleep(60000);
        }
        return results;
    }
    getResults() {
        return this.results;
    }
    clearResults() {
        this.results = [];
    }
}
exports.StressTestRunner = StressTestRunner;
//# sourceMappingURL=stress-test-runner.js.map