import { StressTestResult } from './stress-test-runner';
export interface ExcelReportConfig {
    outputDir: string;
    filename?: string;
    includeRawData?: boolean;
    includeCharts?: boolean;
}
export declare class ExcelReporter {
    private outputDir;
    constructor(outputDir?: string);
    private ensureOutputDirectory;
    generateReport(results: StressTestResult[], config?: Partial<ExcelReportConfig>): Promise<string>;
    private addSummarySheet;
    private addMetricsSheet;
    private addRateLimitSheet;
    private addResponseTimeSheet;
    private addErrorAnalysisSheet;
    private addRawDataSheets;
    private addPerformanceComparisonSheet;
    private calculatePercentile;
    generateComparisonReport(reportFiles: string[], outputFilename?: string): Promise<string>;
    generateTrendReport(historicalResults: StressTestResult[][], outputFilename?: string): Promise<string>;
    private calculateAverageMetrics;
}
