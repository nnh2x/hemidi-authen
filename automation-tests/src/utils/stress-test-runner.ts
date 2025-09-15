import { ApiClient, RequestConfig, ApiResponse } from './api-client';
import { TestDataGenerator } from '../data/test-data';

export interface StressTestMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  rateLimitedRequests: number;
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  requestsPerSecond: number;
  errorRate: number;
  rateLimitRate: number;
  startTime: number;
  endTime: number;
  duration: number;
}

export interface StressTestResult {
  endpoint: string;
  testName: string;
  metrics: StressTestMetrics;
  responses: ApiResponse[];
  rateLimitHeaders: RateLimitHeader[];
  errors: any[];
}

export interface RateLimitHeader {
  timestamp: number;
  endpoint: string;
  limit: number;
  remaining: number;
  reset: number;
  retryAfter?: number;
}

export interface StressTestConfig {
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  requestsCount: number;
  concurrency: number;
  rampUpTime?: number; // seconds
  duration?: number; // seconds (for continuous testing)
  headers?: Record<string, string>;
  data?: any;
  name: string;
}

export class StressTestRunner {
  private apiClient: ApiClient;
  private results: StressTestResult[] = [];

  constructor(baseURL?: string) {
    this.apiClient = new ApiClient(baseURL);
  }

  async runStressTest(config: StressTestConfig): Promise<StressTestResult> {
    console.log(`🔥 Starting stress test: ${config.name}`);
    console.log(`📊 Target: ${config.requestsCount} requests with ${config.concurrency} concurrent users`);
    
    const startTime = Date.now();
    const responses: ApiResponse[] = [];
    const rateLimitHeaders: RateLimitHeader[] = [];
    const errors: any[] = [];
    const responseTimes: number[] = [];

    // Prepare requests
    const requests = this.prepareRequests(config);
    
    if (config.rampUpTime) {
      // Gradual ramp-up
      await this.executeWithRampUp(requests, config, responses, rateLimitHeaders, errors, responseTimes);
    } else {
      // Immediate load
      await this.executeImmediate(requests, config, responses, rateLimitHeaders, errors, responseTimes);
    }

    const endTime = Date.now();
    const duration = endTime - startTime;

    // Calculate metrics
    const metrics = this.calculateMetrics(responses, responseTimes, startTime, endTime);
    
    const result: StressTestResult = {
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

  private prepareRequests(config: StressTestConfig): RequestConfig[] {
    const requests: RequestConfig[] = [];
    
    for (let i = 0; i < config.requestsCount; i++) {
      let requestData = config.data;
      
      // Generate unique data for registration endpoints
      if (config.endpoint.includes('/register')) {
        requestData = TestDataGenerator.generateRandomUser();
      } else if (config.endpoint.includes('/login')) {
        // Use existing user for login (will need to be registered first)
        requestData = TestDataGenerator.getLoginCredentials(TestDataGenerator.TEST_USERS.REGULAR_USER);
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

  private async executeImmediate(
    requests: RequestConfig[],
    config: StressTestConfig,
    responses: ApiResponse[],
    rateLimitHeaders: RateLimitHeader[],
    errors: any[],
    responseTimes: number[]
  ): Promise<void> {
    // Split into batches based on concurrency
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
          
          // Extract rate limit headers
          this.extractRateLimitHeaders(response, config.endpoint, rateLimitHeaders);
          
          return response;
        } catch (error) {
          errors.push({
            request,
            error: error instanceof Error ? error.message : String(error),
            timestamp: Date.now(),
          });
          throw error;
        }
      });

      await Promise.allSettled(batchPromises);
      
      // Small delay between batches to avoid overwhelming
      if (batchIndex < batches.length - 1) {
        await this.sleep(100);
      }
    }
  }

  private async executeWithRampUp(
    requests: RequestConfig[],
    config: StressTestConfig,
    responses: ApiResponse[],
    rateLimitHeaders: RateLimitHeader[],
    errors: any[],
    responseTimes: number[]
  ): Promise<void> {
    const rampUpMs = config.rampUpTime! * 1000;
    const delayBetweenUsers = rampUpMs / config.concurrency;
    
    console.log(`⏳ Ramping up ${config.concurrency} users over ${config.rampUpTime}s`);
    
    const batches = this.createBatches(requests, config.concurrency);
    
    for (const [batchIndex, batch] of batches.entries()) {
      const userPromises = batch.map(async (request, userIndex) => {
        // Stagger user start times
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
        } catch (error) {
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

  private createBatches<T>(array: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < array.length; i += batchSize) {
      batches.push(array.slice(i, i + batchSize));
    }
    return batches;
  }

  private extractRateLimitHeaders(
    response: ApiResponse,
    endpoint: string,
    rateLimitHeaders: RateLimitHeader[]
  ): void {
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

  private calculateMetrics(
    responses: ApiResponse[],
    responseTimes: number[],
    startTime: number,
    endTime: number
  ): StressTestMetrics {
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

  private logResults(result: StressTestResult): void {
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

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Predefined stress test scenarios
  async runAuthenticationStressTests(): Promise<StressTestResult[]> {
    const scenarios: StressTestConfig[] = [
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
        data: TestDataGenerator.getLoginCredentials(TestDataGenerator.TEST_USERS.REGULAR_USER),
      },
    ];

    const results: StressTestResult[] = [];
    
    for (const scenario of scenarios) {
      const result = await this.runStressTest(scenario);
      results.push(result);
      
      // Wait between tests to avoid interference
      await this.sleep(2000);
    }
    
    return results;
  }

  async runRateLimitStressTests(): Promise<StressTestResult[]> {
    const scenarios: StressTestConfig[] = [
      {
        endpoint: '/api/auth/register',
        method: 'POST',
        requestsCount: 10, // Above anonymous limit
        concurrency: 10,
        name: 'Register Rate Limit Test',
      },
      {
        endpoint: '/api/auth/login',
        method: 'POST',
        requestsCount: 15, // Above anonymous limit
        concurrency: 15,
        name: 'Login Rate Limit Test',
        data: TestDataGenerator.getLoginCredentials(TestDataGenerator.TEST_USERS.REGULAR_USER),
      },
    ];

    const results: StressTestResult[] = [];
    
    for (const scenario of scenarios) {
      const result = await this.runStressTest(scenario);
      results.push(result);
      
      // Wait for rate limit to reset
      console.log('⏳ Waiting for rate limit reset...');
      await this.sleep(60000); // 1 minute
    }
    
    return results;
  }

  getResults(): StressTestResult[] {
    return this.results;
  }

  clearResults(): void {
    this.results = [];
  }
}
