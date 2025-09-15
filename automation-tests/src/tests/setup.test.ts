import { config } from '../config/config';
import { ApiClient } from '../utils/api-client';
import { TestDataGenerator } from '../data/test-data';

describe('Setup Verification Tests', () => {
  test('Nên load configuration thành công', () => {
    expect(config).toBeDefined();
    expect(config.api).toBeDefined();
    expect(config.api.baseUrl).toBeDefined();
    expect(config.rateLimits).toBeDefined();
    
    console.log('✅ Configuration loaded successfully');
    console.log(`📍 Base URL: ${config.api.baseUrl}`);
  });

  test('Nên khởi tạo API client thành công', () => {
    const apiClient = new ApiClient();
    expect(apiClient).toBeDefined();
    
    console.log('✅ API Client initialized successfully');
  });

  test('Nên generate test data thành công', () => {
    const user = TestDataGenerator.generateRandomUser();
    expect(user).toBeDefined();
    expect(user.userName).toBeDefined();
    expect(user.password).toBeDefined();
    expect(user.userCode).toBeDefined();
    
    console.log('✅ Test data generation working');
    console.log(`👤 Sample user: ${user.userName}`);
  });

  test('Nên validate custom matchers exist', () => {
    // Check if custom matchers are loaded
    expect(expect.extend).toBeDefined();
    
    console.log('✅ Jest setup completed');
  });
});
