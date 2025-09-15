#!/usr/bin/env node
import { StressTestRunner, StressTestConfig } from './utils/stress-test-runner';
import { ExcelReporter } from './utils/excel-reporter';
import { PerformanceAnalyzer } from './utils/performance-analyzer';
import { config } from './config/config';

interface CLIOptions {
  level: 'light' | 'medium' | 'heavy' | 'extreme';
  endpoint?: string;
  output?: string;
  concurrent?: number;
  requests?: number;
  verbose?: boolean;
}

class StressCLI {
  private runner: StressTestRunner;
  private reporter: ExcelReporter;
  
  constructor() {
    this.runner = new StressTestRunner(config.api.baseUrl);
    this.reporter = new ExcelReporter('./reports/stress-tests');
  }

  async run(): Promise<void> {
    const options = this.parseArgs();
    
    console.log('🔥 HEMIDI AUTHENTICATION STRESS TESTER');
    console.log('=====================================');
    console.log(`📊 Test Level: ${options.level.toUpperCase()}`);
    console.log(`🔗 Target: ${config.api.baseUrl}`);
    console.log('=====================================\n');

    try {
      const results = await this.executeStressTests(options);
      await this.generateReports(results, options);
      this.displaySummary(results);
      
      console.log('\n✅ Stress testing completed successfully!');
      process.exit(0);
    } catch (error) {
      console.error('\n❌ Stress testing failed:', error);
      process.exit(1);
    }
  }

  private parseArgs(): CLIOptions {
    const args = process.argv.slice(2);
    const options: CLIOptions = {
      level: 'medium',
      verbose: false,
    };

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      
      switch (arg) {
        case '--level':
          options.level = args[++i] as CLIOptions['level'];
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

  private showHelp(): void {
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

  private async executeStressTests(options: CLIOptions): Promise<any[]> {
    const testConfigs = this.getTestConfigs(options);
    const results = [];

    for (const [index, testConfig] of testConfigs.entries()) {
      console.log(`\n🎯 Test ${index + 1}/${testConfigs.length}: ${testConfig.name}`);
      console.log(`📊 ${testConfig.requestsCount} requests with ${testConfig.concurrency} concurrent users`);
      
      const startTime = Date.now();
      const result = await this.runner.runStressTest(testConfig);
      const endTime = Date.now();

      // Calculate detailed performance metrics
      const responseTimes = Array(result.responses.length).fill(result.metrics.averageResponseTime);
      const statusCodes = result.responses.map((r: any) => r.status);
      const timestamps = Array(result.responses.length).fill(Date.now());
      
      const performanceMetrics = PerformanceAnalyzer.calculateDetailedMetrics(
        responseTimes,
        statusCodes,
        timestamps,
        result.rateLimitHeaders,
        startTime,
        endTime,
        testConfig.concurrency
      );

      const performanceGrade = PerformanceAnalyzer.generatePerformanceGrade(performanceMetrics);

      (result as any).performanceMetrics = performanceMetrics;
      (result as any).performanceGrade = performanceGrade;

      results.push(result);

      if (options.verbose) {
        console.log(PerformanceAnalyzer.generatePerformanceReport(performanceMetrics));
        console.log(`\n🏆 Performance Grade: ${performanceGrade.grade} (${performanceGrade.score.toFixed(1)}%)`);
        if (performanceGrade.recommendations.length > 0) {
          console.log('💡 Recommendations:');
          performanceGrade.recommendations.forEach((rec: string) => console.log(`   ${rec}`));
        }
      }

      // Wait between tests to avoid interference
      if (index < testConfigs.length - 1) {
        console.log('⏳ Cooling down before next test...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    return results;
  }

  private getTestConfigs(options: CLIOptions): StressTestConfig[] {
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
      // Test specific endpoint
      return [{
        endpoint: options.endpoint,
        method: 'POST' as const,
        requestsCount,
        concurrency,
        name: `${options.level.toUpperCase()} Load Test - ${options.endpoint}`,
      }];
    }

    // Full test suite
    return [
      {
        endpoint: '/api/auth/register',
        method: 'POST' as const,
        requestsCount: Math.ceil(requestsCount * 0.4), // 40% of total
        concurrency: Math.ceil(concurrency * 0.6),
        name: `${options.level.toUpperCase()} Register Test`,
      },
      {
        endpoint: '/api/auth/login',
        method: 'POST' as const,
        requestsCount: Math.ceil(requestsCount * 0.4), // 40% of total  
        concurrency: Math.ceil(concurrency * 0.8),
        name: `${options.level.toUpperCase()} Login Test`,
        data: { userName: 'test_user', password: 'TestPass123!' },
      },
      {
        endpoint: '/api/auth/refresh',
        method: 'POST' as const,
        requestsCount: Math.ceil(requestsCount * 0.2), // 20% of total
        concurrency: Math.ceil(concurrency * 0.4),
        name: `${options.level.toUpperCase()} Refresh Test`,
        data: { refresh_token: 'dummy_token' },
      },
    ];
  }

  private async generateReports(results: any[], options: CLIOptions): Promise<void> {
    console.log('\n📊 Generating Excel reports...');
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = options.output || `stress-test-${options.level}-${timestamp}.xlsx`;
    
    const reportPath = await this.reporter.generateReport(results, {
      filename,
      includeRawData: true,
    });
    
    console.log(`✅ Excel report generated: ${reportPath}`);

    // Generate performance summary
    console.log('\n📈 PERFORMANCE SUMMARY');
    console.log('======================');
    
    results.forEach(result => {
      const grade = result.performanceGrade;
      console.log(`${result.testName}: ${grade.grade} (${grade.score.toFixed(1)}%)`);
    });
  }

  private displaySummary(results: any[]): void {
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
    console.log(`✅ Successful: ${totalSuccessful} (${(totalSuccessful/totalRequests*100).toFixed(1)}%)`);
    console.log(`🚫 Rate Limited: ${totalRateLimited} (${(totalRateLimited/totalRequests*100).toFixed(1)}%)`);
    console.log(`❌ Failed: ${totalFailed} (${(totalFailed/totalRequests*100).toFixed(1)}%)`);
    console.log(`🚀 Avg Throughput: ${avgThroughput.toFixed(2)} req/s`);
    console.log(`⏱️  Avg Response Time: ${avgResponseTime.toFixed(2)}ms`);
    
    // Overall grade
    const overallGrade = this.calculateOverallGrade(results);
    console.log(`\n🏆 Overall Performance Grade: ${overallGrade.grade} (${overallGrade.score.toFixed(1)}%)`);
    
    if (overallGrade.recommendations.length > 0) {
      console.log('\n💡 Key Recommendations:');
      overallGrade.recommendations.slice(0, 3).forEach(rec => {
        console.log(`   ${rec}`);
      });
    }
  }

  private calculateOverallGrade(results: any[]): { grade: string; score: number; recommendations: string[] } {
    const scores = results.map(r => r.performanceGrade.score);
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    
    let grade: string;
    if (avgScore >= 95) grade = 'A+';
    else if (avgScore >= 90) grade = 'A';
    else if (avgScore >= 85) grade = 'B+';
    else if (avgScore >= 80) grade = 'B';
    else if (avgScore >= 75) grade = 'C+';
    else if (avgScore >= 70) grade = 'C';
    else if (avgScore >= 60) grade = 'D';
    else grade = 'F';

    // Collect unique recommendations
    const allRecommendations = results.flatMap(r => r.performanceGrade.recommendations);
    const uniqueRecommendations = [...new Set(allRecommendations)];

    return {
      grade,
      score: avgScore,
      recommendations: uniqueRecommendations.slice(0, 5), // Top 5 recommendations
    };
  }
}

// Execute if called directly
if (require.main === module) {
  const cli = new StressCLI();
  cli.run().catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}

export default StressCLI;
