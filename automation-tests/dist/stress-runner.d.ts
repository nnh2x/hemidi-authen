#!/usr/bin/env node
declare class StressCLI {
    private runner;
    private reporter;
    constructor();
    run(): Promise<void>;
    private parseArgs;
    private showHelp;
    private executeStressTests;
    private getTestConfigs;
    private generateReports;
    private displaySummary;
    private calculateOverallGrade;
}
export default StressCLI;
