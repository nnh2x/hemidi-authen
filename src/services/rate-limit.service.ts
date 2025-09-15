import { Injectable } from '@nestjs/common';
import { RateLimitConfig, UserRole } from '../decorators/rate-limit.decorator';

interface RateLimitRecord {
    count: number;
    resetTime: number;
}

@Injectable()
export class RateLimitService {
    private cache = new Map<string, RateLimitRecord>();
    
    /**
     * Tạo key để lưu trữ rate limit
     * @param identifier - IP hoặc user ID
     * @param endpoint - Endpoint path
     * @param role - User role
     */
    private generateKey(identifier: string, endpoint: string, role: UserRole): string {
        return `${identifier}:${endpoint}:${role}`;
    }

    /**
     * Kiểm tra và cập nhật rate limit
     * @param identifier - IP hoặc user ID  
     * @param endpoint - Endpoint path
     * @param role - User role
     * @param config - Cấu hình rate limit
     * @returns { allowed: boolean, remaining: number, resetTime: number }
     */
    checkRateLimit(
        identifier: string, 
        endpoint: string, 
        role: UserRole, 
        config: RateLimitConfig
    ): { allowed: boolean; remaining: number; resetTime: number } {
        const key = this.generateKey(identifier, endpoint, role);
        const now = Date.now();
        const windowMs = config.window * 1000; // Chuyển giây sang milliseconds
        
        let record = this.cache.get(key);
        
        // Nếu chưa có record hoặc window đã hết hạn, tạo mới
        if (!record || now >= record.resetTime) {
            record = {
                count: 1,
                resetTime: now + windowMs
            };
            this.cache.set(key, record);
            
            return {
                allowed: true,
                remaining: config.limit - 1,
                resetTime: record.resetTime
            };
        }
        
        // Kiểm tra xem có vượt quá limit không
        if (record.count >= config.limit) {
            return {
                allowed: false,
                remaining: 0,
                resetTime: record.resetTime
            };
        }
        
        // Tăng counter
        record.count++;
        this.cache.set(key, record);
        
        return {
            allowed: true,
            remaining: config.limit - record.count,
            resetTime: record.resetTime
        };
    }

    /**
     * Xác định role của user
     * @param user - User object (có thể null nếu chưa đăng nhập)
     */
    getUserRole(user?: any): UserRole {
        if (!user) {
            return UserRole.ANONYMOUS;
        }
        
        if (user.isAdmin) {
            return UserRole.ADMIN;
        }
        
        return UserRole.USER;
    }

    /**
     * Lấy identifier cho rate limiting (IP hoặc user ID)
     * @param request - HTTP request object
     * @param user - User object (có thể null)
     */
    getIdentifier(request: any, user?: any): string {
        // Nếu có user, dùng user ID, nếu không dùng IP
        if (user && user.id) {
            return `user:${user.id}`;
        }
        
        // Lấy IP từ request (xử lý proxy)
        const ip = request.ip || 
                  request.connection?.remoteAddress || 
                  request.socket?.remoteAddress ||
                  (request.headers['x-forwarded-for'] as string)?.split(',')[0] ||
                  'unknown';
                  
        return `ip:${ip}`;
    }

    /**
     * Dọn dẹp cache định kỳ (gọi từ cron job)
     */
    cleanup(): void {
        const now = Date.now();
        
        for (const [key, record] of this.cache.entries()) {
            if (now >= record.resetTime) {
                this.cache.delete(key);
            }
        }
    }

    /**
     * Lấy thông tin cache hiện tại (để debug)
     */
    getCacheInfo(): { totalKeys: number; activeKeys: number } {
        const now = Date.now();
        let activeKeys = 0;
        
        for (const record of this.cache.values()) {
            if (now < record.resetTime) {
                activeKeys++;
            }
        }
        
        return {
            totalKeys: this.cache.size,
            activeKeys
        };
    }
}
