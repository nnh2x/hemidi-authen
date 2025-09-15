export interface PerformanceMetrics {
    responseTime: {
        min: number;
        max: number;
        avg: number;
        p50: number;
        p90: number;
        p95: number;
        p99: number;
    };
    throughput: {
        requestsPerSecond: number;
        successfulRequestsPerSecond: number;
        peakRPS: number;
        avgRPS: number;
    };
    errorRates: {
        totalErrorRate: number;
        rateLimitErrorRate: number;
        serverErrorRate: number;
        clientErrorRate: number;
        timeoutRate: number;
    };
    rateLimiting: {
        hitRateLimit: boolean;
        rateLimitThreshold: number;
        remainingQuota: number;
        resetTime: number;
        retryAfterSeconds?: number;
    };
    resource: {
        avgConcurrentUsers: number;
        maxConcurrentUsers: number;
        testDuration: number;
        totalDataTransferred: number;
    };
    quality: {
        stability: number;
        reliability: number;
        scalability: number;
    };
}
export declare class PerformanceAnalyzer {
    static calculateDetailedMetrics(responseTimes: number[], statusCodes: number[], timestamps: number[], rateLimitHeaders: Array<{
        limit: number;
        remaining: number;
        reset: number;
    }>, startTime: number, endTime: number, concurrency: number): PerformanceMetrics;
    private static calculatePercentile;
    private static calculatePeakRPS;
    private static calculateStability;
    private static calculateScalability;
    static generatePerformanceReport(metrics: PerformanceMetrics): string;
    static generatePerformanceGrade(metrics: PerformanceMetrics): {
        grade: 'A+' | 'A' | 'B+' | 'B' | 'C+' | 'C' | 'D' | 'F';
        score: number;
        recommendations: string[];
    };
    private static scoreResponseTime;
    private static scoreThroughput;
    private static scoreErrorRate;
    private static generateRecommendations;
}
