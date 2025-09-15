import { Injectable, NestMiddleware, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { Reflector } from '@nestjs/core';
import { RateLimitService } from '../services/rate-limit.service';
import { RATE_LIMIT_KEY, RateLimitConfig, UserRole } from '../decorators/rate-limit.decorator';

@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
    constructor(
        private readonly rateLimitService: RateLimitService,
        private readonly reflector: Reflector
    ) {}

    use(req: Request, res: Response, next: NextFunction) {
        // Lấy handler method từ request
        const handler = (req as any).route?.handler || (req as any).method;
        
        if (!handler) {
            return next();
        }

        // Lấy rate limit config từ metadata
        const rateLimitConfigs: RateLimitConfig[] = this.reflector.get(
            RATE_LIMIT_KEY,
            handler
        );

        if (!rateLimitConfigs || rateLimitConfigs.length === 0) {
            return next();
        }

        // Lấy user từ request (có thể null nếu endpoint không cần auth)
        const user = (req as any).user;
        
        // Xác định role của user
        const userRole = this.rateLimitService.getUserRole(user);
        
        // Tìm config phù hợp với role hiện tại
        const config = rateLimitConfigs.find(c => c.role === userRole);
        
        if (!config) {
            // Nếu không tìm thấy config cho role này, cho phép request
            return next();
        }

        // Lấy identifier (IP hoặc user ID)
        const identifier = this.rateLimitService.getIdentifier(req, user);
        
        // Lấy endpoint path
        const endpoint = req.route?.path || req.path;

        // Kiểm tra rate limit
        const result = this.rateLimitService.checkRateLimit(
            identifier,
            endpoint,
            userRole,
            config
        );

        // Thêm rate limit headers vào response
        res.setHeader('X-RateLimit-Limit', config.limit);
        res.setHeader('X-RateLimit-Remaining', result.remaining);
        res.setHeader('X-RateLimit-Reset', Math.ceil(result.resetTime / 1000));
        res.setHeader('X-RateLimit-Window', config.window);

        if (!result.allowed) {
            const resetTime = Math.ceil((result.resetTime - Date.now()) / 1000);
            
            throw new HttpException(
                {
                    message: 'Quá nhiều yêu cầu từ địa chỉ này',
                    error: 'Too Many Requests',
                    statusCode: HttpStatus.TOO_MANY_REQUESTS,
                    retryAfter: resetTime
                },
                HttpStatus.TOO_MANY_REQUESTS
            );
        }

        next();
    }
}
