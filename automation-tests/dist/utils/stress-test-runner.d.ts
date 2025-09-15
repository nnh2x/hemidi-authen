import { ApiResponse } from './api-client';
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
    rampUpTime?: number;
    duration?: number;
    headers?: Record<string, string>;
    data?: any;
    name: string;
}
export declare class StressTestRunner {
    private apiClient;
    private results;
    constructor(baseURL?: string);
    runStressTest(config: StressTestConfig): Promise<StressTestResult>;
    private prepareRequests;
    private executeImmediate;
    private executeWithRampUp;
    private createBatches;
    private extractRateLimitHeaders;
    private calculateMetrics;
    private logResults;
    private sleep;
    runAuthenticationStressTests(): Promise<StressTestResult[]>;
    runRateLimitStressTests(): Promise<StressTestResult[]>;
    getResults(): StressTestResult[];
    clearResults(): void;
}
