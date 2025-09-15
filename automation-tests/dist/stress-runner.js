#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const stress_test_runner_1 = require("./utils/stress-test-runner");
const excel_reporter_1 = require("./utils/excel-reporter");
const performance_analyzer_1 = require("./utils/performance-analyzer");
const config_1 = require("./config/config");
class StressCLI {
    constructor() {
        this.runner = new stress_test_runner_1.StressTestRunner(config_1.config.api.baseUrl);
        this.reporter = new excel_reporter_1.ExcelReporter('./reports/stress-tests');
    }
    async run() {
        const options = this.parseArgs();
        console.log('🔥 HEMIDI AUTHENTICATION STRESS TESTER');
        console.log('=====================================');
        console.log(`📊 Test Level: ${options.level.toUpperCase()}`);
        console.log(`🔗 Target: ${config_1.config.api.baseUrl}`);
        console.log('=====================================\n');
        try {
            const results = await this.executeStressTests(options);
            await this.generateReports(results, options);
            this.displaySummary(results);
            console.log('\n✅ Stress testing completed successfully!');
            process.exit(0);
        }
        catch (error) {
            console.error('\n❌ Stress testing failed:', error);
            process.exit(1);
        }
    }
    parseArgs() {
        const args = process.argv.slice(2);
        const options = {
            level: 'medium',
            verbose: false,
        };
        for (let i = 0; i < args.length; i++) {
            const arg = args[i];
            switch (arg) {
                case '--level':
                    options.level = args[++i];
                    break;
                case '--endpoint':
                    options.endpoint = args[++i];
                    break;
                case '--output':
                    options.output = args[++i];
                    break;
                case '--concurrent':
                    options.concurrent = parseInt(args[++i]);
                    break;
                case '--requests':
                    options.requests = parseInt(args[++i]);
                    break;
                case '--verbose':
                    options.verbose = true;
                    break;
                case '--help':
                    this.showHelp();
                    process.exit(0);
            }
        }
        return options;
    }
    showHelp() {
        console.log(`
🔥 Hemidi Authentication Stress Tester

USAGE:
  npm run stress:light    - Light load testing
  npm run stress:medium   - Medium load testing  
  npm run stress:heavy    - Heavy load testing
  node dist/stress-runner.js [options]

OPTIONS:
  --level <level>       Test level: light, medium, heavy, extreme
  --endpoint <path>     Specific endpoint to test (optional)
  --output <file>       Output Excel filename (optional)
  --concurrent <num>    Number of concurrent users (optional)
  --requests <num>      Total number of requests (optional)
  --verbose             Enable verbose output
  --help                Show this help message

EXAMPLES:
  node dist/stress-runner.js --level heavy --verbose
  node dist/stress-runner.js --endpoint /api/auth/register --requests 100
  node dist/stress-runner.js --level extreme --output extreme-test.xlsx

LEVELS:
  light     - 10 requests, 2 concurrent users
  medium    - 50 requests, 10 concurrent users
  heavy     - 200 requests, 25 concurrent users
  extreme   - 500 requests, 50 concurrent users
    `);
    }
    async executeStressTests(options) {
        const testConfigs = this.getTestConfigs(options);
        const results = [];
        for (const [index, testConfig] of testConfigs.entries()) {
            console.log(`\n🎯 Test ${index + 1}/${testConfigs.length}: ${testConfig.name}`);
            console.log(`📊 ${testConfig.requestsCount} requests with ${testConfig.concurrency} concurrent users`);
            const startTime = Date.now();
            const result = await this.runner.runStressTest(testConfig);
            const endTime = Date.now();
            const responseTimes = Array(result.responses.length).fill(result.metrics.averageResponseTime);
            const statusCodes = result.responses.map((r) => r.status);
            const timestamps = Array(result.responses.length).fill(Date.now());
            const performanceMetrics = performance_analyzer_1.PerformanceAnalyzer.calculateDetailedMetrics(responseTimes, statusCodes, timestamps, result.rateLimitHeaders, startTime, endTime, testConfig.concurrency);
            const performanceGrade = performance_analyzer_1.PerformanceAnalyzer.generatePerformanceGrade(performanceMetrics);
            result.performanceMetrics = performanceMetrics;
            result.performanceGrade = performanceGrade;
            results.push(result);
            if (options.verbose) {
                console.log(performance_analyzer_1.PerformanceAnalyzer.generatePerformanceReport(performanceMetrics));
                console.log(`\n🏆 Performance Grade: ${performanceGrade.grade} (${performanceGrade.score.toFixed(1)}%)`);
                if (performanceGrade.recommendations.length > 0) {
                    console.log('💡 Recommendations:');
                    performanceGrade.recommendations.forEach((rec) => console.log(`   ${rec}`));
                }
            }
            if (index < testConfigs.length - 1) {
                console.log('⏳ Cooling down before next test...');
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
        return results;
    }
    getTestConfigs(options) {
        const baseConfigs = {
            light: { requests: 10, concurrent: 2 },
            medium: { requests: 50, concurrent: 10 },
            heavy: { requests: 200, concurrent: 25 },
            extreme: { requests: 500, concurrent: 50 },
        };
        const levelConfig = baseConfigs[options.level];
        const requestsCount = options.requests || levelConfig.requests;
        const concurrency = options.concurrent || levelConfig.concurrent;
        if (options.endpoint) {
            return [{
                    endpoint: options.endpoint,
                    method: 'POST',
                    requestsCount,
                    concurrency,
                    name: `${options.level.toUpperCase()} Load Test - ${options.endpoint}`,
                }];
        }
        return [
            {
                endpoint: '/api/auth/register',
                method: 'POST',
                requestsCount: Math.ceil(requestsCount * 0.4),
                concurrency: Math.ceil(concurrency * 0.6),
                name: `${options.level.toUpperCase()} Register Test`,
            },
            {
                endpoint: '/api/auth/login',
                method: 'POST',
                requestsCount: Math.ceil(requestsCount * 0.4),
                concurrency: Math.ceil(concurrency * 0.8),
                name: `${options.level.toUpperCase()} Login Test`,
                data: { userName: 'test_user', password: 'TestPass123!' },
            },
            {
                endpoint: '/api/auth/refresh',
                method: 'POST',
                requestsCount: Math.ceil(requestsCount * 0.2),
                concurrency: Math.ceil(concurrency * 0.4),
                name: `${options.level.toUpperCase()} Refresh Test`,
                data: { refresh_token: 'dummy_token' },
            },
        ];
    }
    async generateReports(results, options) {
        console.log('\n📊 Generating Excel reports...');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = options.output || `stress-test-${options.level}-${timestamp}.xlsx`;
        const reportPath = await this.reporter.generateReport(results, {
            filename,
            includeRawData: true,
        });
        console.log(`✅ Excel report generated: ${reportPath}`);
        console.log('\n📈 PERFORMANCE SUMMARY');
        console.log('======================');
        results.forEach(result => {
            const grade = result.performanceGrade;
            console.log(`${result.testName}: ${grade.grade} (${grade.score.toFixed(1)}%)`);
        });
    }
    displaySummary(results) {
        console.log('\n📋 TEST EXECUTION SUMMARY');
        console.log('==========================');
        const totalRequests = results.reduce((sum, r) => sum + r.metrics.totalRequests, 0);
        const totalSuccessful = results.reduce((sum, r) => sum + r.metrics.successfulRequests, 0);
        const totalRateLimited = results.reduce((sum, r) => sum + r.metrics.rateLimitedRequests, 0);
        const totalFailed = results.reduce((sum, r) => sum + r.metrics.failedRequests, 0);
        const avgThroughput = results.reduce((sum, r) => sum + r.metrics.requestsPerSecond, 0) / results.length;
        const avgResponseTime = results.reduce((sum, r) => sum + r.metrics.averageResponseTime, 0) / results.length;
        console.log(`📊 Total Tests: ${results.length}`);
        console.log(`📊 Total Requests: ${totalRequests}`);
        console.log(`✅ Successful: ${totalSuccessful} (${(totalSuccessful / totalRequests * 100).toFixed(1)}%)`);
        console.log(`🚫 Rate Limited: ${totalRateLimited} (${(totalRateLimited / totalRequests * 100).toFixed(1)}%)`);
        console.log(`❌ Failed: ${totalFailed} (${(totalFailed / totalRequests * 100).toFixed(1)}%)`);
        console.log(`🚀 Avg Throughput: ${avgThroughput.toFixed(2)} req/s`);
        console.log(`⏱️  Avg Response Time: ${avgResponseTime.toFixed(2)}ms`);
        const overallGrade = this.calculateOverallGrade(results);
        console.log(`\n🏆 Overall Performance Grade: ${overallGrade.grade} (${overallGrade.score.toFixed(1)}%)`);
        if (overallGrade.recommendations.length > 0) {
            console.log('\n💡 Key Recommendations:');
            overallGrade.recommendations.slice(0, 3).forEach(rec => {
                console.log(`   ${rec}`);
            });
        }
    }
    calculateOverallGrade(results) {
        const scores = results.map(r => r.performanceGrade.score);
        const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
        let grade;
        if (avgScore >= 95)
            grade = 'A+';
        else if (avgScore >= 90)
            grade = 'A';
        else if (avgScore >= 85)
            grade = 'B+';
        else if (avgScore >= 80)
            grade = 'B';
        else if (avgScore >= 75)
            grade = 'C+';
        else if (avgScore >= 70)
            grade = 'C';
        else if (avgScore >= 60)
            grade = 'D';
        else
            grade = 'F';
        const allRecommendations = results.flatMap(r => r.performanceGrade.recommendations);
        const uniqueRecommendations = [...new Set(allRecommendations)];
        return {
            grade,
            score: avgScore,
            recommendations: uniqueRecommendations.slice(0, 5),
        };
    }
}
if (require.main === module) {
    const cli = new StressCLI();
    cli.run().catch(error => {
        console.error('❌ Fatal error:', error);
        process.exit(1);
    });
}
exports.default = StressCLI;
//# sourceMappingURL=stress-runner.js.map