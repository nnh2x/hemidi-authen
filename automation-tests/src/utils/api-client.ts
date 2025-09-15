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

export class ApiClient {
  private baseURL: string;
  private timeout: number;

  constructor(baseURL: string = process.env.BASE_URL || 'http://localhost:3000') {
    this.baseURL = baseURL;
    this.timeout = parseInt(process.env.DEFAULT_TIMEOUT || '30000');
  }

  // Generic request method using fetch
  async request<T = any>(config: RequestConfig): Promise<ApiResponse<T>> {
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

      let data: T;
      try {
        data = await response.json() as T;
      } catch {
        data = {} as T;
      }

      const headers: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        headers[key] = value;
      });

      console.log(`${response.ok ? '✅' : '❌'} ${response.status} ${config.method} ${config.url}`);

      return {
        data,
        status: response.status,
        headers,
      };
    } catch (error: any) {
      clearTimeout(timeoutId);
      console.error('❌ Request Error:', error.message);
      throw error;
    }
  }

  // Authentication endpoints
  async register(userData: {
    userName: string;
    password: string;
    confirmPassword: string;
    userCode: string;
  }): Promise<ApiResponse<AuthTokens>> {
    return this.request({
      method: 'POST',
      url: '/api/auth/register',
      data: userData,
    });
  }

  async login(credentials: {
    userName: string;
    password: string;
  }): Promise<ApiResponse<AuthTokens>> {
    return this.request({
      method: 'POST',
      url: '/api/auth/login',
      data: credentials,
    });
  }

  async refreshToken(refreshToken: string): Promise<ApiResponse<AuthTokens>> {
    return this.request({
      method: 'POST',
      url: '/api/auth/refresh',
      data: { refresh_token: refreshToken },
    });
  }

  async logout(token: string): Promise<ApiResponse> {
    return this.request({
      method: 'POST',
      url: '/api/auth/logout',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  async getProfile(token: string): Promise<ApiResponse> {
    return this.request({
      method: 'GET',
      url: '/api/auth/profile',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  async updateProfile(token: string, userId: number, updateData: any): Promise<ApiResponse> {
    return this.request({
      method: 'PUT',
      url: `/api/auth/profile/${userId}`,
      headers: {
        Authorization: `Bearer ${token}`,
      },
      data: updateData,
    });
  }

  // Utility method for concurrent requests
  async makeConcurrentRequests<T = any>(
    requestConfigs: RequestConfig[],
    delay: number = 0
  ): Promise<ApiResponse<T>[]> {
    if (delay > 0) {
      // Add delay between requests
      const promises = requestConfigs.map((config, index) => {
        return new Promise<ApiResponse<T>>((resolve) => {
          setTimeout(async () => {
            const response = await this.request<T>(config);
            resolve(response);
          }, index * delay);
        });
      });
      return Promise.all(promises);
    } else {
      // Send all requests simultaneously
      const promises = requestConfigs.map(config => this.request<T>(config));
      return Promise.all(promises);
    }
  }

  // Helper method to wait
  async wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
