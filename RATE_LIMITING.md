# Rate Limiting Documentation

## Tổng quan
Hệ thống rate limiting được implement để bảo vệ API khỏi abuse và đảm bảo fair usage dựa trên user roles.

## Rate Limit Strategy

### User Roles
- **ANONYMOUS**: Người dùng chưa đăng nhập (dựa trên IP)
- **USER**: Người dùng đã đăng nhập thông thường
- **ADMIN**: Người dùng có quyền quản trị

### Rate Limit Configuration

#### POST /api/auth/register
- **Anonymous**: 3 requests / 5 phút
- **User**: 5 requests / 5 phút  
- **Admin**: 10 requests / 5 phút

*Lý do: Đăng ký tài khoản là hành động nhạy cảm, cần giới hạn chặt để tránh spam.*

#### POST /api/auth/login
- **Anonymous**: 5 requests / 5 phút
- **User**: 10 requests / 5 phút
- **Admin**: 20 requests / 5 phút

*Lý do: Chống brute force attack, nhưng vẫn cho phép retry hợp lệ.*

#### POST /api/auth/refresh
- **Anonymous**: 10 requests / 5 phút
- **User**: 20 requests / 5 phút
- **Admin**: 50 requests / 5 phút

*Lý do: Refresh token có thể được gọi thường xuyên khi access token hết hạn.*

#### GET /api/auth/profile
- **Anonymous**: 0 requests (cần đăng nhập)
- **User**: 30 requests / phút
- **Admin**: 100 requests / phút

*Lý do: Endpoint này có thể được gọi nhiều lần trong ứng dụng.*

#### POST /api/auth/logout
- **Anonymous**: 0 requests (cần đăng nhập)
- **User**: 10 requests / phút
- **Admin**: 20 requests / phút

*Lý do: Đăng xuất không cần gọi nhiều lần.*

#### PUT /api/auth/profile/:id
- **Anonymous**: 0 requests (cần đăng nhập)
- **User**: 5 requests / 5 phút
- **Admin**: 20 requests / 5 phút

*Lý do: Cập nhật profile ít khi được thực hiện.*

## Response Headers

Khi rate limit được áp dụng, các headers sau sẽ được thêm vào response:

```
X-RateLimit-Limit: 10        // Giới hạn requests trong window
X-RateLimit-Remaining: 7     // Số requests còn lại
X-RateLimit-Reset: 1640995200 // Timestamp khi reset (Unix time)
X-RateLimit-Window: 300      // Thời gian window (giây)
```

## Error Response

Khi vượt quá rate limit, API sẽ trả về HTTP 429:

```json
{
  "message": "Quá nhiều yêu cầu từ địa chỉ này. Vui lòng thử lại sau.",
  "error": "Too Many Requests",
  "statusCode": 429,
  "retryAfter": 120,
  "limit": 10,
  "window": 300,
  "role": "user"
}
```

## Implementation Details

### Components
1. **RateLimit Decorator**: Định nghĩa rate limit cho endpoints
2. **RateLimitGuard**: Guard để check rate limit trước khi xử lý request
3. **RateLimitService**: Service quản lý cache và logic rate limiting
4. **RateLimitCleanupService**: Service dọn dẹp cache định kỳ

### Cache Strategy
- Sử dụng in-memory Map để lưu trữ rate limit data
- Key format: `{identifier}:{endpoint}:{role}`
- Identifier: `user:{userId}` cho authenticated users, `ip:{ip}` cho anonymous
- Auto cleanup mỗi 5 phút để giải phóng memory

### Customization

Để thay đổi rate limit cho endpoint:

```typescript
@RateLimit(createRateLimitConfig(
  { limit: 5, window: 300 },    // Anonymous: 5 requests / 5 minutes
  { limit: 10, window: 300 },   // User: 10 requests / 5 minutes
  { limit: 20, window: 300 }    // Admin: 20 requests / 5 minutes
))
```

### Monitoring

Service cung cấp method `getCacheInfo()` để monitor cache:

```typescript
const info = rateLimitService.getCacheInfo();
console.log(`Total keys: ${info.totalKeys}, Active: ${info.activeKeys}`);
```

## Best Practices

1. **Gradual Limits**: Admin có limit cao hơn User, User cao hơn Anonymous
2. **Endpoint-specific**: Mỗi endpoint có rate limit phù hợp với use case
3. **Clear Error Messages**: Thông báo lỗi rõ ràng với thời gian retry
4. **Memory Management**: Auto cleanup để tránh memory leak
5. **Headers**: Cung cấp đầy đủ thông tin cho client

## Security Considerations

1. Rate limit dựa trên user role, không dễ bypass
2. IP-based limiting cho anonymous users
3. Separate limits cho từng endpoint
4. Reasonable limits để không ảnh hưởng UX bình thường
