# Automation Testing Suite

## Tổng quan

Bộ test automation này được thiết kế để kiểm tra hệ thống xác thực (Authentication) và rate limiting của API. Bao gồm các test case toàn diện cho:

- ✅ Đăng ký tài khoản (Registration)
- ✅ Đăng nhập (Login)
- ✅ Làm mới token (Token Refresh)
- ✅ Lấy thông tin profile (Profile)
- ✅ Đăng xuất (Logout)
- ✅ Rate limiting theo vai trò người dùng
- ✅ Bảo mật (SQL Injection, XSS)

## Cấu trúc dự án

```
automation-tests/
├── package.json              # Dependencies và scripts
├── tsconfig.json            # TypeScript configuration
├── jest.config.js           # Jest test configuration
├── jest.setup.ts           # Custom Jest matchers
├── .env                    # Environment variables
└── src/
    ├── config/
    │   └── config.ts       # Test configuration manager
    ├── data/
    │   └── test-data.ts    # Test data generator
    ├── tests/
    │   ├── auth.test.ts    # Authentication API tests
    │   └── rate-limit.test.ts # Rate limiting tests
    └── utils/
        └── api-client.ts   # API client utility
```

## Cài đặt

1. **Cài đặt dependencies:**
```bash
cd automation-tests
npm install
```

2. **Cấu hình environment variables trong `.env`:**
```env
# API Configuration
BASE_URL=http://localhost:3000
API_TIMEOUT=30000
DEFAULT_TIMEOUT=30000

# Rate Limit Configuration
ANONYMOUS_REGISTER_LIMIT=5
ANONYMOUS_LOGIN_LIMIT=10
USER_LOGOUT_LIMIT=5
USER_PROFILE_LIMIT=20
USER_REFRESH_LIMIT=10
ADMIN_PROFILE_EDIT_LIMIT=50

# Test Configuration
TEST_RETRY_ATTEMPTS=3
TEST_RETRY_DELAY=1000
PARALLEL_REQUESTS=10

# Database Configuration
DB_CLEANUP=false
PRESERVE_TEST_DATA=false
```

## Chạy tests

### Chạy tất cả tests
```bash
npm test
```

### Chạy tests cụ thể
```bash
# Chạy authentication tests
npm run test:auth

# Chạy rate limiting tests
npm run test:rate-limit

# Chạy tests với coverage
npm run test:coverage

# Chạy tests trong watch mode
npm run test:watch
```

### Chạy tests với Allure reporting
```bash
# Chạy tests và generate Allure report
npm run test:allure

# Mở Allure report
npm run allure:serve
```

## Test Cases

### 1. Authentication Tests (`auth.test.ts`)

#### POST /api/auth/register
- ✅ Đăng ký thành công với dữ liệu hợp lệ
- ✅ Từ chối đăng ký với tên người dùng trùng lặp
- ✅ Từ chối đăng ký với mật khẩu không khớp
- ✅ Validation cho các trường bắt buộc
- ✅ Rate limiting cho anonymous users
- ✅ Bảo mật chống SQL injection và XSS

#### POST /api/auth/login
- ✅ Đăng nhập thành công với thông tin hợp lệ
- ✅ Từ chối đăng nhập với mật khẩu sai
- ✅ Từ chối đăng nhập với tên người dùng không tồn tại
- ✅ Validation cho các trường bắt buộc
- ✅ Rate limiting cho anonymous users
- ✅ Bảo mật chống SQL injection

#### POST /api/auth/refresh
- ✅ Làm mới token thành công với refresh token hợp lệ
- ✅ Từ chối làm mới với refresh token không hợp lệ
- ✅ Validation cho refresh token

#### GET /api/auth/profile
- ✅ Lấy thông tin profile thành công với token hợp lệ
- ✅ Từ chối truy cập với token không hợp lệ
- ✅ Từ chối truy cập khi không có token

#### POST /api/auth/logout
- ✅ Đăng xuất thành công với token hợp lệ
- ✅ Token bị vô hiệu hóa sau khi logout
- ✅ Từ chối đăng xuất với token không hợp lệ

### 2. Rate Limiting Tests (`rate-limit.test.ts`)

#### Anonymous User Rate Limits
- ✅ Rate limit cho register endpoint
- ✅ Rate limit cho login endpoint
- ✅ Reset rate limit sau khi hết thời gian window

#### Authenticated User Rate Limits
- ✅ Rate limit cho user profile endpoint
- ✅ Rate limit cho user logout endpoint
- ✅ Rate limit cho refresh token endpoint

#### Admin Rate Limits
- ✅ Rate limit cho admin profile edit endpoint

#### Rate Limit Headers
- ✅ Validate rate limit headers chính xác
- ✅ Giảm remaining count với mỗi request
- ✅ Rate limit độc lập cho các endpoint khác nhau

## Custom Jest Matchers

### `toHaveJwtTokens()`
Kiểm tra response có chứa JWT tokens hợp lệ:
```typescript
expect(response.data).toHaveJwtTokens();
```

### `toHaveRateLimitHeaders()`
Kiểm tra response có chứa rate limit headers:
```typescript
expect(response.headers).toHaveRateLimitHeaders();
```

### `toBeValidJwt()`
Kiểm tra chuỗi có phải là JWT token hợp lệ:
```typescript
expect(token).toBeValidJwt();
```

### `toHaveRateLimitExceeded()`
Kiểm tra response có thông báo rate limit exceeded:
```typescript
expect(response).toHaveRateLimitExceeded();
```

## API Client Utilities

### Concurrent Requests
```typescript
// Gửi nhiều requests đồng thời
const responses = await apiClient.makeConcurrentRequests(requests);

// Gửi requests với delay
const responses = await apiClient.makeConcurrentRequests(requests, 100);
```

### Authentication Methods
```typescript
// Đăng ký
const registerResponse = await apiClient.register(userData);

// Đăng nhập
const loginResponse = await apiClient.login(credentials);

// Làm mới token
const refreshResponse = await apiClient.refreshToken(refreshToken);

// Lấy profile
const profileResponse = await apiClient.getProfile(accessToken);

// Đăng xuất
const logoutResponse = await apiClient.logout(accessToken);
```

## Test Data Generator

### Predefined Test Users
```typescript
// Admin user
const admin = TestDataGenerator.TEST_USERS.ADMIN;

// Regular user
const user = TestDataGenerator.TEST_USERS.REGULAR_USER;

// Invalid data scenarios
const invalidData = TestDataGenerator.getInvalidRegistrationData();
```

### Random Data Generation
```typescript
// Generate random user
const user = TestDataGenerator.generateRandomUser('user');

// Generate multiple users
const users = TestDataGenerator.generateMultipleUsers(10, 'admin');

// Generate test data for rate limiting
const rateLimitData = TestDataGenerator.generateRateLimitTestUsers(50);
```

### Security Test Data
```typescript
// SQL Injection test data
const sqlInjection = TestDataGenerator.getSqlInjectionTestData();

// XSS test data
const xssData = TestDataGenerator.getXssTestData();
```

## Configuration Management

### Environment-specific Configs
```typescript
// Development environment
const devConfig = config.getEnvironmentConfig('development');

// Staging environment
const stagingConfig = config.getEnvironmentConfig('staging');

// Production environment
const prodConfig = config.getEnvironmentConfig('production');
```

### Runtime Configuration Updates
```typescript
// Update specific config values
config.updateConfig({
  api: {
    baseUrl: 'https://new-api.example.com',
    timeout: 60000,
  },
});

// Validate configuration
const { isValid, errors } = config.validate();
```

## Reporting

### Allure Reports
- Detailed test execution results
- Screenshots for failed tests
- Request/Response logs
- Performance metrics
- Trend analysis

### Console Logging
- Real-time test progress
- API request/response logging
- Rate limit status tracking
- Error details with stack traces

## CI/CD Integration

### GitHub Actions
```yaml
# .github/workflows/test.yml
name: API Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: cd automation-tests && npm install
      - run: cd automation-tests && npm test
```

### Jenkins Pipeline
```groovy
pipeline {
    agent any
    stages {
        stage('Install') {
            steps {
                sh 'cd automation-tests && npm install'
            }
        }
        stage('Test') {
            steps {
                sh 'cd automation-tests && npm run test:allure'
            }
        }
        stage('Report') {
            steps {
                publishHTML([
                    allowMissing: false,
                    alwaysLinkToLastBuild: true,
                    keepAll: true,
                    reportDir: 'automation-tests/allure-report',
                    reportFiles: 'index.html',
                    reportName: 'Allure Report'
                ])
            }
        }
    }
}
```

## Troubleshooting

### Common Issues

1. **Connection refused errors:**
   - Kiểm tra API server đang chạy
   - Verify BASE_URL trong .env file
   - Check network connectivity

2. **Rate limit test failures:**
   - Adjust rate limit values trong .env
   - Wait for rate limit windows to reset
   - Check server-side rate limiting configuration

3. **Token validation errors:**
   - Verify JWT secret key
   - Check token expiration times
   - Ensure proper Bearer token format

4. **Test timeouts:**
   - Increase timeout values trong .env
   - Optimize test data generation
   - Reduce concurrent request counts

### Debug Mode
```bash
# Run tests với debug logging
DEBUG=true npm test

# Run specific test với verbose output
npm test -- --verbose --testNamePattern="should register successfully"
```

## Best Practices

1. **Test Data Management:**
   - Use unique test data for each test run
   - Clean up test data after completion
   - Use factory patterns for data generation

2. **Rate Limiting Tests:**
   - Wait between test suites to reset limits
   - Use concurrent requests to test limits effectively
   - Verify rate limit headers in responses

3. **Security Testing:**
   - Include SQL injection and XSS test cases
   - Test with invalid and malicious inputs
   - Verify proper error handling

4. **Performance Testing:**
   - Monitor API response times
   - Test with realistic load scenarios
   - Use proper timeout configurations

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## Support

Nếu gặp vấn đề với test suite, vui lòng:
1. Check troubleshooting guide
2. Review configuration settings
3. Check API server logs
4. Create an issue với detailed information
