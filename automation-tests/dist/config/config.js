"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
class ConfigManager {
    constructor() {
        this.config = this.loadConfig();
    }
    loadConfig() {
        return {
            api: {
                baseUrl: process.env.BASE_URL || 'http://localhost:3000',
                timeout: parseInt(process.env.API_TIMEOUT || '30000'),
            },
            rateLimits: {
                anonymous: {
                    register: parseInt(process.env.ANONYMOUS_REGISTER_LIMIT || '5'),
                    login: parseInt(process.env.ANONYMOUS_LOGIN_LIMIT || '10'),
                },
                user: {
                    logout: parseInt(process.env.USER_LOGOUT_LIMIT || '5'),
                    profile: parseInt(process.env.USER_PROFILE_LIMIT || '20'),
                    refresh: parseInt(process.env.USER_REFRESH_LIMIT || '10'),
                },
                admin: {
                    profileEdit: parseInt(process.env.ADMIN_PROFILE_EDIT_LIMIT || '50'),
                },
            },
            test: {
                retryAttempts: parseInt(process.env.TEST_RETRY_ATTEMPTS || '3'),
                retryDelay: parseInt(process.env.TEST_RETRY_DELAY || '1000'),
                defaultTimeout: parseInt(process.env.DEFAULT_TIMEOUT || '30000'),
                parallelRequests: parseInt(process.env.PARALLEL_REQUESTS || '10'),
            },
            database: {
                cleanup: process.env.DB_CLEANUP === 'true',
                preserveTestData: process.env.PRESERVE_TEST_DATA === 'true',
            },
        };
    }
    get api() {
        return this.config.api;
    }
    get rateLimits() {
        return this.config.rateLimits;
    }
    get test() {
        return this.config.test;
    }
    get database() {
        return this.config.database;
    }
    get all() {
        return this.config;
    }
    updateConfig(updates) {
        this.config = {
            ...this.config,
            ...updates,
        };
    }
    validate() {
        const errors = [];
        if (!this.config.api.baseUrl) {
            errors.push('Base URL is required');
        }
        if (this.config.api.timeout <= 0) {
            errors.push('API timeout must be greater than 0');
        }
        if (this.config.rateLimits.anonymous.register <= 0) {
            errors.push('Anonymous register rate limit must be greater than 0');
        }
        if (this.config.rateLimits.anonymous.login <= 0) {
            errors.push('Anonymous login rate limit must be greater than 0');
        }
        if (this.config.test.retryAttempts < 0) {
            errors.push('Retry attempts cannot be negative');
        }
        if (this.config.test.retryDelay < 0) {
            errors.push('Retry delay cannot be negative');
        }
        return {
            isValid: errors.length === 0,
            errors,
        };
    }
    getEnvironmentConfig(environment) {
        const envConfigs = {
            development: {
                api: {
                    baseUrl: 'http://localhost:3000',
                    timeout: 30000,
                },
                test: {
                    retryAttempts: 1,
                    retryDelay: 500,
                },
            },
            staging: {
                api: {
                    baseUrl: 'https://staging-api.example.com',
                    timeout: 60000,
                },
                test: {
                    retryAttempts: 2,
                    retryDelay: 1000,
                },
            },
            production: {
                api: {
                    baseUrl: 'https://api.example.com',
                    timeout: 60000,
                },
                test: {
                    retryAttempts: 3,
                    retryDelay: 2000,
                },
            },
        };
        return envConfigs[environment];
    }
    printConfig() {
        console.log('📋 Current Test Configuration:');
        console.log('================================');
        console.log('🔗 API:', JSON.stringify(this.config.api, null, 2));
        console.log('⏱️ Rate Limits:', JSON.stringify(this.config.rateLimits, null, 2));
        console.log('🧪 Test Settings:', JSON.stringify(this.config.test, null, 2));
        console.log('💾 Database:', JSON.stringify(this.config.database, null, 2));
        console.log('================================');
    }
}
exports.config = new ConfigManager();
//# sourceMappingURL=config.js.map