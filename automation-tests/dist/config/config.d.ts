export interface TestConfig {
    api: {
        baseUrl: string;
        timeout: number;
    };
    rateLimits: {
        anonymous: {
            register: number;
            login: number;
        };
        user: {
            logout: number;
            profile: number;
            refresh: number;
        };
        admin: {
            profileEdit: number;
        };
    };
    test: {
        retryAttempts: number;
        retryDelay: number;
        defaultTimeout: number;
        parallelRequests: number;
    };
    database: {
        cleanup: boolean;
        preserveTestData: boolean;
    };
}
declare class ConfigManager {
    private config;
    constructor();
    private loadConfig;
    get api(): {
        baseUrl: string;
        timeout: number;
    };
    get rateLimits(): {
        anonymous: {
            register: number;
            login: number;
        };
        user: {
            logout: number;
            profile: number;
            refresh: number;
        };
        admin: {
            profileEdit: number;
        };
    };
    get test(): {
        retryAttempts: number;
        retryDelay: number;
        defaultTimeout: number;
        parallelRequests: number;
    };
    get database(): {
        cleanup: boolean;
        preserveTestData: boolean;
    };
    get all(): TestConfig;
    updateConfig(updates: Partial<TestConfig>): void;
    validate(): {
        isValid: boolean;
        errors: string[];
    };
    getEnvironmentConfig(environment: 'development' | 'staging' | 'production'): {
        api: {
            baseUrl: string;
            timeout: number;
        };
        test: {
            retryAttempts: number;
            retryDelay: number;
        };
    } | {
        api: {
            baseUrl: string;
            timeout: number;
        };
        test: {
            retryAttempts: number;
            retryDelay: number;
        };
    } | {
        api: {
            baseUrl: string;
            timeout: number;
        };
        test: {
            retryAttempts: number;
            retryDelay: number;
        };
    };
    printConfig(): void;
}
export declare const config: ConfigManager;
export {};
