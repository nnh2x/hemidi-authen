import { SetMetadata } from '@nestjs/common';

export enum UserRole {
    ANONYMOUS = 'anonymous',
    USER = 'user', 
    ADMIN = 'admin'
}

export interface RateLimitConfig {
    role: UserRole;
    limit: number; // Số request tối đa
    window: number; // Thời gian window (giây)
}

export const RATE_LIMIT_KEY = 'rate_limit_config';

/**
 * Decorator để thiết lập rate limit cho endpoint
 * @param configs Cấu hình rate limit cho từng role
 */
export const RateLimit = (configs: RateLimitConfig[]) => {
    return SetMetadata(RATE_LIMIT_KEY, configs);
};

// Helper function để tạo cấu hình rate limit nhanh
export const createRateLimitConfig = (
    anonymous: { limit: number; window: number },
    user: { limit: number; window: number },
    admin: { limit: number; window: number }
): RateLimitConfig[] => {
    return [
        { role: UserRole.ANONYMOUS, ...anonymous },
        { role: UserRole.USER, ...user },
        { role: UserRole.ADMIN, ...admin }
    ];
};
