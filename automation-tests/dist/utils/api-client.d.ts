export interface ApiResponse<T = any> {
    data: T;
    status: number;
    headers: Record<string, string>;
}
export interface AuthTokens {
    access_token: string;
    refresh_token: string;
}
export interface RequestConfig {
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    url: string;
    data?: any;
    headers?: Record<string, string>;
}
export declare class ApiClient {
    private baseURL;
    private timeout;
    constructor(baseURL?: string);
    request<T = any>(config: RequestConfig): Promise<ApiResponse<T>>;
    register(userData: {
        userName: string;
        password: string;
        confirmPassword: string;
        userCode: string;
    }): Promise<ApiResponse<AuthTokens>>;
    login(credentials: {
        userName: string;
        password: string;
    }): Promise<ApiResponse<AuthTokens>>;
    refreshToken(refreshToken: string): Promise<ApiResponse<AuthTokens>>;
    logout(token: string): Promise<ApiResponse>;
    getProfile(token: string): Promise<ApiResponse>;
    updateProfile(token: string, userId: number, updateData: any): Promise<ApiResponse>;
    makeConcurrentRequests<T = any>(requestConfigs: RequestConfig[], delay?: number): Promise<ApiResponse<T>[]>;
    wait(ms: number): Promise<void>;
}
