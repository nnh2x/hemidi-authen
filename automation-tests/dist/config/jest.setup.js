"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../.env') });
jest.setTimeout(parseInt(process.env.DEFAULT_TIMEOUT || '30000'));
beforeAll(async () => {
    console.log('🚀 Starting Automation Tests...');
    console.log(`📍 Base URL: ${process.env.BASE_URL}`);
});
afterAll(async () => {
    console.log('✅ All tests completed');
});
expect.extend({
    toBeValidJWT(received) {
        const jwtRegex = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/;
        const pass = jwtRegex.test(received);
        if (pass) {
            return {
                message: () => `expected ${received} not to be a valid JWT`,
                pass: true,
            };
        }
        else {
            return {
                message: () => `expected ${received} to be a valid JWT`,
                pass: false,
            };
        }
    },
    toHaveRateLimitHeaders(received) {
        const requiredHeaders = [
            'x-ratelimit-limit',
            'x-ratelimit-remaining',
            'x-ratelimit-reset',
            'x-ratelimit-window'
        ];
        const missingHeaders = requiredHeaders.filter(header => !received.headers || !received.headers[header]);
        const pass = missingHeaders.length === 0;
        if (pass) {
            return {
                message: () => `expected response not to have rate limit headers`,
                pass: true,
            };
        }
        else {
            return {
                message: () => `expected response to have rate limit headers. Missing: ${missingHeaders.join(', ')}`,
                pass: false,
            };
        }
    }
});
//# sourceMappingURL=jest.setup.js.map