export interface TestUser {
    userName: string;
    password: string;
    confirmPassword: string;
    userCode: string;
    role?: 'admin' | 'user';
}
export interface LoginCredentials {
    userName: string;
    password: string;
}
export declare class TestDataGenerator {
    static readonly TEST_USERS: {
        ADMIN: {
            userName: string;
            password: string;
            confirmPassword: string;
            userCode: string;
            role: "admin";
        };
        REGULAR_USER: {
            userName: string;
            password: string;
            confirmPassword: string;
            userCode: string;
            role: "user";
        };
        INVALID_USER: {
            userName: string;
            password: string;
            confirmPassword: string;
            userCode: string;
        };
        PASSWORD_MISMATCH: {
            userName: string;
            password: string;
            confirmPassword: string;
            userCode: string;
        };
    };
    static generateRandomUser(role?: 'admin' | 'user'): TestUser;
    static generateMultipleUsers(count: number, role?: 'admin' | 'user'): TestUser[];
    static getLoginCredentials(user: TestUser): LoginCredentials;
    static getInvalidRegistrationData(): {
        EMPTY_USERNAME: {
            userName: string;
            password: string;
            confirmPassword: string;
            userCode: string;
        };
        EMPTY_PASSWORD: {
            userName: string;
            password: string;
            confirmPassword: string;
            userCode: string;
        };
        SHORT_PASSWORD: {
            userName: string;
            password: string;
            confirmPassword: string;
            userCode: string;
        };
        WEAK_PASSWORD: {
            userName: string;
            password: string;
            confirmPassword: string;
            userCode: string;
        };
        PASSWORD_MISMATCH: {
            userName: string;
            password: string;
            confirmPassword: string;
            userCode: string;
        };
        EMPTY_USER_CODE: {
            userName: string;
            password: string;
            confirmPassword: string;
            userCode: string;
        };
        LONG_USERNAME: {
            userName: string;
            password: string;
            confirmPassword: string;
            userCode: string;
        };
    };
    static getInvalidLoginData(): {
        EMPTY_USERNAME: {
            userName: string;
            password: string;
        };
        EMPTY_PASSWORD: {
            userName: string;
            password: string;
        };
        WRONG_PASSWORD: {
            userName: string;
            password: string;
        };
        NON_EXISTENT_USER: {
            userName: string;
            password: string;
        };
    };
    static getSqlInjectionTestData(): {
        REGISTRATION: {
            userName: string;
            password: string;
            confirmPassword: string;
            userCode: string;
        };
        LOGIN: {
            userName: string;
            password: string;
        };
    };
    static getXssTestData(): {
        REGISTRATION: {
            userName: string;
            password: string;
            confirmPassword: string;
            userCode: string;
        };
        USER_CODE: {
            userName: string;
            password: string;
            confirmPassword: string;
            userCode: string;
        };
    };
    static generateRateLimitTestUsers(count: number): {
        anonymous: {
            userName: string;
            password: string;
            confirmPassword: string;
            userCode: string;
        }[];
        users: TestUser[];
        admins: TestUser[];
    };
    static getProfileUpdateData(): {
        VALID_UPDATE: {
            userName: string;
            userCode: string;
        };
        EMPTY_USERNAME: {
            userName: string;
            userCode: string;
        };
        DUPLICATE_USERNAME: {
            userName: string;
            userCode: string;
        };
        XSS_USERNAME: {
            userName: string;
            userCode: string;
        };
    };
}
