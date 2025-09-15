"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestDataGenerator = void 0;
class TestDataGenerator {
    static generateRandomUser(role = 'user') {
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 1000);
        return {
            userName: `test_user_${timestamp}_${random}`,
            password: 'TestPass123!',
            confirmPassword: 'TestPass123!',
            userCode: `CODE${timestamp}${random}`,
            role,
        };
    }
    static generateMultipleUsers(count, role = 'user') {
        return Array.from({ length: count }, () => this.generateRandomUser(role));
    }
    static getLoginCredentials(user) {
        return {
            userName: user.userName,
            password: user.password,
        };
    }
    static getInvalidRegistrationData() {
        return {
            EMPTY_USERNAME: {
                userName: '',
                password: 'ValidPass123!',
                confirmPassword: 'ValidPass123!',
                userCode: 'VALID001',
            },
            EMPTY_PASSWORD: {
                userName: 'valid_user',
                password: '',
                confirmPassword: '',
                userCode: 'VALID002',
            },
            SHORT_PASSWORD: {
                userName: 'valid_user',
                password: '123',
                confirmPassword: '123',
                userCode: 'VALID003',
            },
            WEAK_PASSWORD: {
                userName: 'valid_user',
                password: 'password',
                confirmPassword: 'password',
                userCode: 'VALID004',
            },
            PASSWORD_MISMATCH: {
                userName: 'valid_user',
                password: 'ValidPass123!',
                confirmPassword: 'DifferentPass123!',
                userCode: 'VALID005',
            },
            EMPTY_USER_CODE: {
                userName: 'valid_user',
                password: 'ValidPass123!',
                confirmPassword: 'ValidPass123!',
                userCode: '',
            },
            LONG_USERNAME: {
                userName: 'a'.repeat(256),
                password: 'ValidPass123!',
                confirmPassword: 'ValidPass123!',
                userCode: 'VALID006',
            },
        };
    }
    static getInvalidLoginData() {
        return {
            EMPTY_USERNAME: {
                userName: '',
                password: 'SomePassword123!',
            },
            EMPTY_PASSWORD: {
                userName: 'someuser',
                password: '',
            },
            WRONG_PASSWORD: {
                userName: 'existing_user',
                password: 'WrongPassword123!',
            },
            NON_EXISTENT_USER: {
                userName: 'non_existent_user_' + Date.now(),
                password: 'SomePassword123!',
            },
        };
    }
    static getSqlInjectionTestData() {
        return {
            REGISTRATION: {
                userName: "admin'; DROP TABLE users; --",
                password: 'ValidPass123!',
                confirmPassword: 'ValidPass123!',
                userCode: 'INJECT001',
            },
            LOGIN: {
                userName: "admin' OR '1'='1",
                password: "password' OR '1'='1",
            },
        };
    }
    static getXssTestData() {
        return {
            REGISTRATION: {
                userName: '<script>alert("XSS")</script>',
                password: 'ValidPass123!',
                confirmPassword: 'ValidPass123!',
                userCode: 'XSS001',
            },
            USER_CODE: {
                userName: 'valid_user',
                password: 'ValidPass123!',
                confirmPassword: 'ValidPass123!',
                userCode: '<img src=x onerror=alert("XSS")>',
            },
        };
    }
    static generateRateLimitTestUsers(count) {
        return {
            anonymous: Array.from({ length: count }, (_, i) => ({
                userName: `anon_user_${Date.now()}_${i}`,
                password: 'TestPass123!',
                confirmPassword: 'TestPass123!',
                userCode: `ANON${Date.now()}${i}`,
            })),
            users: Array.from({ length: count }, (_, i) => this.generateRandomUser('user')),
            admins: Array.from({ length: count }, (_, i) => this.generateRandomUser('admin')),
        };
    }
    static getProfileUpdateData() {
        return {
            VALID_UPDATE: {
                userName: 'updated_username',
                userCode: 'UPDATED001',
            },
            EMPTY_USERNAME: {
                userName: '',
                userCode: 'VALID001',
            },
            DUPLICATE_USERNAME: {
                userName: 'existing_username',
                userCode: 'VALID002',
            },
            XSS_USERNAME: {
                userName: '<script>alert("XSS")</script>',
                userCode: 'XSS002',
            },
        };
    }
}
exports.TestDataGenerator = TestDataGenerator;
TestDataGenerator.TEST_USERS = {
    ADMIN: {
        userName: 'admin_test',
        password: 'AdminPass123!',
        confirmPassword: 'AdminPass123!',
        userCode: 'ADMIN001',
        role: 'admin',
    },
    REGULAR_USER: {
        userName: 'user_test',
        password: 'UserPass123!',
        confirmPassword: 'UserPass123!',
        userCode: 'USER001',
        role: 'user',
    },
    INVALID_USER: {
        userName: '',
        password: '',
        confirmPassword: '',
        userCode: '',
    },
    PASSWORD_MISMATCH: {
        userName: 'test_mismatch',
        password: 'Password123!',
        confirmPassword: 'DifferentPassword123!',
        userCode: 'MISMATCH001',
    },
};
//# sourceMappingURL=test-data.js.map