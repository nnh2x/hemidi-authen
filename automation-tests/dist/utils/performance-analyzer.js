"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PerformanceAnalyzer = void 0;
class PerformanceAnalyzer {
    static calculateDetailedMetrics(responseTimes, statusCodes, timestamps, rateLimitHeaders, startTime, endTime, concurrency) {
        const sortedTimes = responseTimes.slice().sort((a, b) => a - b);
        const responseTimeMetrics = {
            min: sortedTimes[0] || 0,
            max: sortedTimes[sortedTimes.length - 1] || 0,
            avg: responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length || 0,
            p50: this.calculatePercentile(sortedTimes, 50),
            p90: this.calculatePercentile(sortedTimes, 90),
            p95: this.calculatePercentile(sortedTimes, 95),
            p99: this.calculatePercentile(sortedTimes, 99),
        };
        const duration = (endTime - startTime) / 1000;
        const totalRequests = responseTimes.length;
        const successfulRequests = statusCodes.filter(code => code >= 200 && code < 300).length;
        const throughputMetrics = {
            requestsPerSecond: totalRequests / duration,
            successfulRequestsPerSecond: successfulRequests / duration,
            peakRPS: this.calculatePeakRPS(timestamps),
            avgRPS: totalRequests / duration,
        };
        const rateLimitErrors = statusCodes.filter(code => code === 429).length;
        const serverErrors = statusCodes.filter(code => code >= 500).length;
        const clientErrors = statusCodes.filter(code => code >= 400 && code < 500 && code !== 429).length;
        const timeouts = statusCodes.filter(code => code === 0).length;
        const errorRateMetrics = {
            totalErrorRate: ((totalRequests - successfulRequests) / totalRequests) * 100,
            rateLimitErrorRate: (rateLimitErrors / totalRequests) * 100,
            serverErrorRate: (serverErrors / totalRequests) * 100,
            clientErrorRate: (clientErrors / totalRequests) * 100,
            timeoutRate: (timeouts / totalRequests) * 100,
        };
        const lastRateLimit = rateLimitHeaders[rateLimitHeaders.length - 1];
        const rateLimitingMetrics = {
            hitRateLimit: rateLimitErrors > 0,
            rateLimitThreshold: lastRateLimit?.limit || 0,
            remainingQuota: lastRateLimit?.remaining || 0,
            resetTime: lastRateLimit?.reset || 0,
            retryAfterSeconds: rateLimitErrors > 0 ? 60 : undefined,
        };
        const avgDataPerRequest = 1024;
        const resourceMetrics = {
            avgConcurrentUsers: concurrency,
            maxConcurrentUsers: concurrency,
            testDuration: duration,
            totalDataTransferred: totalRequests * avgDataPerRequest,
        };
        const stability = this.calculateStability(responseTimes);
        const reliability = (successfulRequests / totalRequests) * 100;
        const scalability = this.calculateScalability(responseTimes, concurrency);
        const qualityMetrics = {
            stability,
            reliability,
            scalability,
        };
        return {
            responseTime: responseTimeMetrics,
            throughput: throughputMetrics,
            errorRates: errorRateMetrics,
            rateLimiting: rateLimitingMetrics,
            resource: resourceMetrics,
            quality: qualityMetrics,
        };
    }
    static calculatePercentile(sortedArray, percentile) {
        if (sortedArray.length === 0)
            return 0;
        const index = Math.ceil((percentile / 100) * sortedArray.length) - 1;
        return sortedArray[Math.max(0, Math.min(index, sortedArray.length - 1))];
    }
    static calculatePeakRPS(timestamps) {
        if (timestamps.length === 0)
            return 0;
        const secondGroups = new Map();
        timestamps.forEach(timestamp => {
            const second = Math.floor(timestamp / 1000);
            secondGroups.set(second, (secondGroups.get(second) || 0) + 1);
        });
        return Math.max(...Array.from(secondGroups.values()));
    }
    static calculateStability(responseTimes) {
        if (responseTimes.length === 0)
            return 100;
        const mean = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
        const variance = responseTimes.reduce((acc, time) => acc + Math.pow(time - mean, 2), 0) / responseTimes.length;
        const standardDeviation = Math.sqrt(variance);
        const coefficientOfVariation = mean > 0 ? (standardDeviation / mean) * 100 : 0;
        return Math.max(0, 100 - coefficientOfVariation);
    }
    static calculateScalability(responseTimes, concurrency) {
        const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
        const expectedDegradation = concurrency * 10;
        const actualDegradation = avgResponseTime;
        if (expectedDegradation === 0)
            return 100;
        const scalabilityScore = Math.max(0, 100 - ((actualDegradation - expectedDegradation) / expectedDegradation) * 100);
        return Math.min(100, scalabilityScore);
    }
    static generatePerformanceReport(metrics) {
        return `
📊 PERFORMANCE ANALYSIS REPORT
================================

⏱️  RESPONSE TIME METRICS:
   • Min: ${metrics.responseTime.min.toFixed(2)}ms
   • Max: ${metrics.responseTime.max.toFixed(2)}ms
   • Avg: ${metrics.responseTime.avg.toFixed(2)}ms
   • P50: ${metrics.responseTime.p50.toFixed(2)}ms
   • P95: ${metrics.responseTime.p95.toFixed(2)}ms
   • P99: ${metrics.responseTime.p99.toFixed(2)}ms

🚀 THROUGHPUT METRICS:
   • Total RPS: ${metrics.throughput.requestsPerSecond.toFixed(2)}
   • Success RPS: ${metrics.throughput.successfulRequestsPerSecond.toFixed(2)}
   • Peak RPS: ${metrics.throughput.peakRPS.toFixed(2)}

❌ ERROR RATES:
   • Total Error Rate: ${metrics.errorRates.totalErrorRate.toFixed(2)}%
   • Rate Limit Errors: ${metrics.errorRates.rateLimitErrorRate.toFixed(2)}%
   • Server Errors: ${metrics.errorRates.serverErrorRate.toFixed(2)}%
   • Client Errors: ${metrics.errorRates.clientErrorRate.toFixed(2)}%

🚫 RATE LIMITING:
   • Hit Rate Limit: ${metrics.rateLimiting.hitRateLimit ? 'Yes' : 'No'}
   • Threshold: ${metrics.rateLimiting.rateLimitThreshold}
   • Remaining: ${metrics.rateLimiting.remainingQuota}
   • Reset Time: ${new Date(metrics.rateLimiting.resetTime * 1000).toISOString()}

💾 RESOURCE UTILIZATION:
   • Concurrent Users: ${metrics.resource.avgConcurrentUsers}
   • Test Duration: ${metrics.resource.testDuration.toFixed(2)}s
   • Data Transferred: ${(metrics.resource.totalDataTransferred / 1024).toFixed(2)} KB

✨ QUALITY METRICS:
   • Stability: ${metrics.quality.stability.toFixed(1)}%
   • Reliability: ${metrics.quality.reliability.toFixed(1)}%
   • Scalability: ${metrics.quality.scalability.toFixed(1)}%

================================
    `.trim();
    }
    static generatePerformanceGrade(metrics) {
        const scores = {
            responseTime: this.scoreResponseTime(metrics.responseTime.avg),
            throughput: this.scoreThroughput(metrics.throughput.requestsPerSecond),
            errorRate: this.scoreErrorRate(metrics.errorRates.totalErrorRate),
            stability: metrics.quality.stability,
            reliability: metrics.quality.reliability,
        };
        const totalScore = (scores.responseTime * 0.25 +
            scores.throughput * 0.20 +
            scores.errorRate * 0.20 +
            scores.stability * 0.15 +
            scores.reliability * 0.20);
        let grade;
        if (totalScore >= 95)
            grade = 'A+';
        else if (totalScore >= 90)
            grade = 'A';
        else if (totalScore >= 85)
            grade = 'B+';
        else if (totalScore >= 80)
            grade = 'B';
        else if (totalScore >= 75)
            grade = 'C+';
        else if (totalScore >= 70)
            grade = 'C';
        else if (totalScore >= 60)
            grade = 'D';
        else
            grade = 'F';
        const recommendations = this.generateRecommendations(metrics);
        return { grade, score: totalScore, recommendations };
    }
    static scoreResponseTime(avgResponseTime) {
        if (avgResponseTime < 100)
            return 100;
        if (avgResponseTime < 500)
            return 90;
        if (avgResponseTime < 1000)
            return 80;
        if (avgResponseTime < 2000)
            return 70;
        if (avgResponseTime < 5000)
            return 60;
        return 40;
    }
    static scoreThroughput(rps) {
        if (rps > 100)
            return 100;
        if (rps > 50)
            return 90;
        if (rps > 20)
            return 80;
        if (rps > 10)
            return 70;
        if (rps > 5)
            return 60;
        return 40;
    }
    static scoreErrorRate(errorRate) {
        if (errorRate < 1)
            return 100;
        if (errorRate < 2)
            return 90;
        if (errorRate < 5)
            return 80;
        if (errorRate < 10)
            return 70;
        if (errorRate < 20)
            return 60;
        return 40;
    }
    static generateRecommendations(metrics) {
        const recommendations = [];
        if (metrics.responseTime.avg > 1000) {
            recommendations.push('🔧 Optimize response times - average is above 1 second');
        }
        if (metrics.errorRates.totalErrorRate > 5) {
            recommendations.push('🛠️ Investigate error rates - above 5% threshold');
        }
        if (metrics.rateLimiting.hitRateLimit) {
            recommendations.push('⚡ Rate limits are being hit - consider adjusting thresholds or implementing backoff');
        }
        if (metrics.quality.stability < 80) {
            recommendations.push('📊 Response time variability is high - investigate performance inconsistencies');
        }
        if (metrics.throughput.requestsPerSecond < 10) {
            recommendations.push('🚀 Throughput is low - consider performance optimization');
        }
        if (recommendations.length === 0) {
            recommendations.push('✅ Performance looks good! Consider testing with higher loads');
        }
        return recommendations;
    }
}
exports.PerformanceAnalyzer = PerformanceAnalyzer;
//# sourceMappingURL=performance-analyzer.js.map