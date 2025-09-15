"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiClient = void 0;
class ApiClient {
    constructor(baseURL = process.env.BASE_URL || 'http://localhost:3000') {
        this.baseURL = baseURL;
        this.timeout = parseInt(process.env.DEFAULT_TIMEOUT || '30000');
    }
    async request(config) {
        const url = `${this.baseURL}${config.url}`;
        console.log(`🔄 ${config.method} ${config.url}`);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);
        try {
            const response = await fetch(url, {
                method: config.method,
                headers: {
                    'Content-Type': 'application/json',
                    ...config.headers,
                },
                body: config.data ? JSON.stringify(config.data) : undefined,
                signal: controller.signal,
            });
            clearTimeout(timeoutId);
            let data;
            try {
                data = await response.json();
            }
            catch {
                data = {};
            }
            const headers = {};
            response.headers.forEach((value, key) => {
                headers[key] = value;
            });
            console.log(`${response.ok ? '✅' : '❌'} ${response.status} ${config.method} ${config.url}`);
            return {
                data,
                status: response.status,
                headers,
            };
        }
        catch (error) {
            clearTimeout(timeoutId);
            console.error('❌ Request Error:', error.message);
            throw error;
        }
    }
    async register(userData) {
        return this.request({
            method: 'POST',
            url: '/api/auth/register',
            data: userData,
        });
    }
    async login(credentials) {
        return this.request({
            method: 'POST',
            url: '/api/auth/login',
            data: credentials,
        });
    }
    async refreshToken(refreshToken) {
        return this.request({
            method: 'POST',
            url: '/api/auth/refresh',
            data: { refresh_token: refreshToken },
        });
    }
    async logout(token) {
        return this.request({
            method: 'POST',
            url: '/api/auth/logout',
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
    }
    async getProfile(token) {
        return this.request({
            method: 'GET',
            url: '/api/auth/profile',
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
    }
    async updateProfile(token, userId, updateData) {
        return this.request({
            method: 'PUT',
            url: `/api/auth/profile/${userId}`,
            headers: {
                Authorization: `Bearer ${token}`,
            },
            data: updateData,
        });
    }
    async makeConcurrentRequests(requestConfigs, delay = 0) {
        if (delay > 0) {
            const promises = requestConfigs.map((config, index) => {
                return new Promise((resolve) => {
                    setTimeout(async () => {
                        const response = await this.request(config);
                        resolve(response);
                    }, index * delay);
                });
            });
            return Promise.all(promises);
        }
        else {
            const promises = requestConfigs.map(config => this.request(config));
            return Promise.all(promises);
        }
    }
    async wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
exports.ApiClient = ApiClient;
//# sourceMappingURL=api-client.js.map