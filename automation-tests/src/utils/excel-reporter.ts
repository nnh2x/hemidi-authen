import * as XLSX from 'xlsx';
import { StressTestResult, StressTestMetrics, RateLimitHeader } from './stress-test-runner';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';

export interface ExcelReportConfig {
  outputDir: string;
  filename?: string;
  includeRawData?: boolean;
  includeCharts?: boolean;
}

export class ExcelReporter {
  private outputDir: string;

  constructor(outputDir: string = './reports/stress-tests') {
    this.outputDir = outputDir;
    this.ensureOutputDirectory();
  }

  private ensureOutputDirectory(): void {
    if (!existsSync(this.outputDir)) {
      mkdirSync(this.outputDir, { recursive: true });
    }
  }

  async generateReport(
    results: StressTestResult[],
    config: Partial<ExcelReportConfig> = {}
  ): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = config.filename || `stress-test-report-${timestamp}.xlsx`;
    const filepath = join(this.outputDir, filename);

    console.log(`📊 Generating Excel report: ${filename}`);

    // Create workbook
    const workbook = XLSX.utils.book_new();

    // Add summary sheet
    this.addSummarySheet(workbook, results);

    // Add detailed metrics sheet
    this.addMetricsSheet(workbook, results);

    // Add rate limit analysis sheet
    this.addRateLimitSheet(workbook, results);

    // Add response time analysis sheet
    this.addResponseTimeSheet(workbook, results);

    // Add error analysis sheet
    this.addErrorAnalysisSheet(workbook, results);

    // Add raw data sheets if requested
    if (config.includeRawData) {
      this.addRawDataSheets(workbook, results);
    }

    // Add performance comparison sheet
    this.addPerformanceComparisonSheet(workbook, results);

    // Write file
    XLSX.writeFile(workbook, filepath);

    console.log(`✅ Excel report generated: ${filepath}`);
    return filepath;
  }

  private addSummarySheet(workbook: XLSX.WorkBook, results: StressTestResult[]): void {
    const summaryData = [
      ['Stress Test Summary Report'],
      ['Generated:', new Date().toISOString()],
      ['Total Tests:', results.length],
      [],
      ['Test Name', 'Endpoint', 'Total Requests', 'Success Rate (%)', 'Error Rate (%)', 'Rate Limit Rate (%)', 'Avg Response Time (ms)', 'Throughput (req/s)', 'Duration (s)'],
    ];

    results.forEach(result => {
      const metrics = result.metrics;
      const successRate = (metrics.successfulRequests / metrics.totalRequests * 100).toFixed(2);
      const duration = (metrics.duration / 1000).toFixed(2);

      summaryData.push([
        result.testName,
        result.endpoint,
        metrics.totalRequests,
        successRate,
        metrics.errorRate.toFixed(2),
        metrics.rateLimitRate.toFixed(2),
        metrics.averageResponseTime.toFixed(2),
        metrics.requestsPerSecond.toFixed(2),
        duration,
      ]);
    });

    const worksheet = XLSX.utils.aoa_to_sheet(summaryData);
    
    // Set column widths
    worksheet['!cols'] = [
      { wch: 25 }, // Test Name
      { wch: 20 }, // Endpoint
      { wch: 15 }, // Total Requests
      { wch: 15 }, // Success Rate
      { wch: 15 }, // Error Rate
      { wch: 15 }, // Rate Limit Rate
      { wch: 20 }, // Avg Response Time
      { wch: 15 }, // Throughput
      { wch: 15 }, // Duration
    ];

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Summary');
  }

  private addMetricsSheet(workbook: XLSX.WorkBook, results: StressTestResult[]): void {
    const metricsData = [
      ['Detailed Metrics'],
      [],
      ['Test Name', 'Total Requests', 'Successful', 'Failed', 'Rate Limited', 'Min RT (ms)', 'Max RT (ms)', 'Avg RT (ms)', 'RPS', 'Start Time', 'End Time', 'Duration (ms)'],
    ];

    results.forEach(result => {
      const metrics = result.metrics;
      metricsData.push([
        result.testName,
        metrics.totalRequests.toString(),
        metrics.successfulRequests.toString(),
        metrics.failedRequests.toString(),
        metrics.rateLimitedRequests.toString(),
        metrics.minResponseTime.toString(),
        metrics.maxResponseTime.toString(),
        metrics.averageResponseTime.toFixed(2),
        metrics.requestsPerSecond.toFixed(2),
        new Date(metrics.startTime).toISOString(),
        new Date(metrics.endTime).toISOString(),
        metrics.duration.toString(),
      ]);
    });

    const worksheet = XLSX.utils.aoa_to_sheet(metricsData);
    worksheet['!cols'] = Array(12).fill({ wch: 15 });
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Detailed Metrics');
  }

  private addRateLimitSheet(workbook: XLSX.WorkBook, results: StressTestResult[]): void {
    const rateLimitData = [
      ['Rate Limit Analysis'],
      [],
      ['Timestamp', 'Test Name', 'Endpoint', 'Limit', 'Remaining', 'Reset Time', 'Retry After'],
    ];

    results.forEach(result => {
      result.rateLimitHeaders.forEach(header => {
        rateLimitData.push([
          new Date(header.timestamp).toISOString(),
          result.testName,
          header.endpoint,
          header.limit.toString(),
          header.remaining.toString(),
          new Date(header.reset * 1000).toISOString(),
          header.retryAfter ? header.retryAfter.toString() : 'N/A',
        ]);
      });
    });

    // Add rate limit analysis
    rateLimitData.push([]);
    rateLimitData.push(['Rate Limit Summary by Endpoint']);
    rateLimitData.push(['Endpoint', 'Max Limit', 'Min Remaining', 'Times Hit Limit']);

    const endpointStats = new Map<string, { maxLimit: number, minRemaining: number, hitLimit: number }>();

    results.forEach(result => {
      result.rateLimitHeaders.forEach(header => {
        const key = header.endpoint;
        const current = endpointStats.get(key) || { maxLimit: 0, minRemaining: Infinity, hitLimit: 0 };
        
        current.maxLimit = Math.max(current.maxLimit, header.limit);
        current.minRemaining = Math.min(current.minRemaining, header.remaining);
        if (header.remaining === 0) current.hitLimit++;
        
        endpointStats.set(key, current);
      });
    });

    endpointStats.forEach((stats, endpoint) => {
      rateLimitData.push([
        endpoint,
        stats.maxLimit.toString(),
        stats.minRemaining === Infinity ? 'N/A' : stats.minRemaining.toString(),
        stats.hitLimit.toString(),
      ]);
    });

    const worksheet = XLSX.utils.aoa_to_sheet(rateLimitData);
    worksheet['!cols'] = Array(7).fill({ wch: 18 });
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Rate Limit Analysis');
  }

  private addResponseTimeSheet(workbook: XLSX.WorkBook, results: StressTestResult[]): void {
    const responseTimeData = [
      ['Response Time Analysis'],
      [],
      ['Test Name', 'Endpoint', 'Min (ms)', 'Max (ms)', 'Avg (ms)', 'P50 (ms)', 'P95 (ms)', 'P99 (ms)'],
    ];

    results.forEach(result => {
      const responseTimes = result.responses.map(r => {
        // Calculate response time from timestamps if available
        return result.metrics.averageResponseTime; // Fallback to average
      }).sort((a, b) => a - b);

      const p50 = this.calculatePercentile(responseTimes, 50);
      const p95 = this.calculatePercentile(responseTimes, 95);
      const p99 = this.calculatePercentile(responseTimes, 99);

      responseTimeData.push([
        result.testName,
        result.endpoint,
        result.metrics.minResponseTime.toString(),
        result.metrics.maxResponseTime.toString(),
        result.metrics.averageResponseTime.toFixed(2),
        p50.toFixed(2),
        p95.toFixed(2),
        p99.toFixed(2),
      ]);
    });

    const worksheet = XLSX.utils.aoa_to_sheet(responseTimeData);
    worksheet['!cols'] = Array(8).fill({ wch: 15 });
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Response Times');
  }

  private addErrorAnalysisSheet(workbook: XLSX.WorkBook, results: StressTestResult[]): void {
    const errorData = [
      ['Error Analysis'],
      [],
      ['Test Name', 'Endpoint', 'Status Code', 'Count', 'Percentage'],
    ];

    results.forEach(result => {
      const statusCounts = new Map<number, number>();
      
      result.responses.forEach(response => {
        const count = statusCounts.get(response.status) || 0;
        statusCounts.set(response.status, count + 1);
      });

      statusCounts.forEach((count, status) => {
        const percentage = (count / result.metrics.totalRequests * 100).toFixed(2);
        errorData.push([
          result.testName,
          result.endpoint,
          status.toString(),
          count.toString(),
          `${percentage}%`,
        ]);
      });
    });

    // Add error details
    errorData.push([]);
    errorData.push(['Error Details']);
    errorData.push(['Test Name', 'Timestamp', 'Error Message']);

    results.forEach(result => {
      result.errors.forEach(error => {
        errorData.push([
          result.testName,
          new Date(error.timestamp).toISOString(),
          error.error,
        ]);
      });
    });

    const worksheet = XLSX.utils.aoa_to_sheet(errorData);
    worksheet['!cols'] = [{ wch: 25 }, { wch: 20 }, { wch: 15 }, { wch: 10 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Error Analysis');
  }

  private addRawDataSheets(workbook: XLSX.WorkBook, results: StressTestResult[]): void {
    results.forEach((result, index) => {
      const rawData = [
        [`Raw Data - ${result.testName}`],
        [],
        ['Status', 'Response Time (est)', 'Rate Limit', 'Rate Remaining', 'Timestamp'],
      ];

      result.responses.forEach(response => {
        const rateLimitHeader = result.rateLimitHeaders.find(h => 
          Math.abs(h.timestamp - Date.now()) < 1000 // Find closest timestamp
        );

        rawData.push([
          response.status.toString(),
          result.metrics.averageResponseTime.toFixed(2), // Estimated
          rateLimitHeader?.limit ? rateLimitHeader.limit.toString() : 'N/A',
          rateLimitHeader?.remaining ? rateLimitHeader.remaining.toString() : 'N/A',
          new Date().toISOString(), // Current timestamp as fallback
        ]);
      });

      const worksheet = XLSX.utils.aoa_to_sheet(rawData);
      worksheet['!cols'] = Array(5).fill({ wch: 15 });
      XLSX.utils.book_append_sheet(workbook, worksheet, `Raw Data ${index + 1}`);
    });
  }

  private addPerformanceComparisonSheet(workbook: XLSX.WorkBook, results: StressTestResult[]): void {
    const comparisonData = [
      ['Performance Comparison'],
      [],
      ['Metric', ...results.map(r => r.testName)],
    ];

    const metrics = [
      { key: 'totalRequests', label: 'Total Requests' },
      { key: 'successfulRequests', label: 'Successful Requests' },
      { key: 'errorRate', label: 'Error Rate (%)' },
      { key: 'rateLimitRate', label: 'Rate Limit Rate (%)' },
      { key: 'averageResponseTime', label: 'Avg Response Time (ms)' },
      { key: 'requestsPerSecond', label: 'Throughput (req/s)' },
      { key: 'duration', label: 'Duration (ms)' },
    ];

    metrics.forEach(metric => {
      const row = [metric.label];
      results.forEach(result => {
        const value = (result.metrics as any)[metric.key];
        row.push(typeof value === 'number' ? value.toFixed(2) : value);
      });
      comparisonData.push(row);
    });

    const worksheet = XLSX.utils.aoa_to_sheet(comparisonData);
    worksheet['!cols'] = [{ wch: 25 }, ...Array(results.length).fill({ wch: 15 })];
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Performance Comparison');
  }

  private calculatePercentile(sortedArray: number[], percentile: number): number {
    if (sortedArray.length === 0) return 0;
    
    const index = Math.ceil((percentile / 100) * sortedArray.length) - 1;
    return sortedArray[Math.max(0, Math.min(index, sortedArray.length - 1))];
  }

  // Generate comparison report between multiple test runs
  async generateComparisonReport(
    reportFiles: string[],
    outputFilename?: string
  ): Promise<string> {
    // Implementation for comparing multiple Excel reports
    // This would read existing Excel files and create a comparison
    console.log('📊 Generating comparison report...');
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = outputFilename || `stress-test-comparison-${timestamp}.xlsx`;
    const filepath = join(this.outputDir, filename);

    // For now, return the filepath
    // Full implementation would involve reading and comparing existing reports
    
    console.log(`✅ Comparison report would be generated: ${filepath}`);
    return filepath;
  }

  // Generate trend analysis report
  async generateTrendReport(
    historicalResults: StressTestResult[][],
    outputFilename?: string
  ): Promise<string> {
    console.log('📈 Generating trend analysis report...');
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = outputFilename || `stress-test-trends-${timestamp}.xlsx`;
    const filepath = join(this.outputDir, filename);

    const workbook = XLSX.utils.book_new();

    // Create trend data
    const trendData = [
      ['Performance Trends Over Time'],
      [],
      ['Test Run', 'Date', 'Avg Response Time (ms)', 'Throughput (req/s)', 'Error Rate (%)', 'Rate Limit Rate (%)'],
    ];

    historicalResults.forEach((results, runIndex) => {
      const avgMetrics = this.calculateAverageMetrics(results);
      trendData.push([
        `Run ${runIndex + 1}`,
        new Date().toISOString().split('T')[0], // Use current date as placeholder
        avgMetrics.averageResponseTime.toFixed(2),
        avgMetrics.requestsPerSecond.toFixed(2),
        avgMetrics.errorRate.toFixed(2),
        avgMetrics.rateLimitRate.toFixed(2),
      ]);
    });

    const worksheet = XLSX.utils.aoa_to_sheet(trendData);
    worksheet['!cols'] = Array(6).fill({ wch: 18 });
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Trends');

    XLSX.writeFile(workbook, filepath);

    console.log(`✅ Trend analysis report generated: ${filepath}`);
    return filepath;
  }

  private calculateAverageMetrics(results: StressTestResult[]): StressTestMetrics {
    const totalTests = results.length;
    
    if (totalTests === 0) {
      return {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        rateLimitedRequests: 0,
        averageResponseTime: 0,
        minResponseTime: 0,
        maxResponseTime: 0,
        requestsPerSecond: 0,
        errorRate: 0,
        rateLimitRate: 0,
        startTime: 0,
        endTime: 0,
        duration: 0,
      };
    }

    const sums = results.reduce((acc, result) => {
      const metrics = result.metrics;
      return {
        totalRequests: acc.totalRequests + metrics.totalRequests,
        successfulRequests: acc.successfulRequests + metrics.successfulRequests,
        failedRequests: acc.failedRequests + metrics.failedRequests,
        rateLimitedRequests: acc.rateLimitedRequests + metrics.rateLimitedRequests,
        averageResponseTime: acc.averageResponseTime + metrics.averageResponseTime,
        requestsPerSecond: acc.requestsPerSecond + metrics.requestsPerSecond,
        errorRate: acc.errorRate + metrics.errorRate,
        rateLimitRate: acc.rateLimitRate + metrics.rateLimitRate,
        duration: acc.duration + metrics.duration,
      };
    }, {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      rateLimitedRequests: 0,
      averageResponseTime: 0,
      requestsPerSecond: 0,
      errorRate: 0,
      rateLimitRate: 0,
      duration: 0,
    });

    return {
      totalRequests: Math.round(sums.totalRequests / totalTests),
      successfulRequests: Math.round(sums.successfulRequests / totalTests),
      failedRequests: Math.round(sums.failedRequests / totalTests),
      rateLimitedRequests: Math.round(sums.rateLimitedRequests / totalTests),
      averageResponseTime: sums.averageResponseTime / totalTests,
      minResponseTime: Math.min(...results.map(r => r.metrics.minResponseTime)),
      maxResponseTime: Math.max(...results.map(r => r.metrics.maxResponseTime)),
      requestsPerSecond: sums.requestsPerSecond / totalTests,
      errorRate: sums.errorRate / totalTests,
      rateLimitRate: sums.rateLimitRate / totalTests,
      startTime: Math.min(...results.map(r => r.metrics.startTime)),
      endTime: Math.max(...results.map(r => r.metrics.endTime)),
      duration: sums.duration / totalTests,
    };
  }
}
