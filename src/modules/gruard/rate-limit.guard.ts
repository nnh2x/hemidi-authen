import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RateLimitService } from '../../services/rate-limit.service';
import { RATE_LIMIT_KEY, RateLimitConfig } from '../../decorators/rate-limit.decorator';

@Injectable()
export class RateLimitGuard implements CanActivate {
    constructor(
        private readonly rateLimitService: RateLimitService,
        private readonly reflector: Reflector
    ) {}

    canActivate(context: ExecutionContext): boolean {
        // Lấy rate limit config từ metadata của method hoặc class
        const rateLimitConfigs: RateLimitConfig[] = 
            this.reflector.getAllAndOverride(RATE_LIMIT_KEY, [
                context.getHandler(),
                context.getClass(),
            ]);

        if (!rateLimitConfigs || rateLimitConfigs.length === 0) {
            return true;
        }

        const request = context.switchToHttp().getRequest();
        const response = context.switchToHttp().getResponse();
        
        // Lấy user từ request (có thể null nếu endpoint không cần auth)
        const user = request.user;
        
        // Xác định role của user
        const userRole = this.rateLimitService.getUserRole(user);
        
        // Tìm config phù hợp với role hiện tại
        const config = rateLimitConfigs.find(c => c.role === userRole);
        
        if (!config) {
            // Nếu không tìm thấy config cho role này, cho phép request
            return true;
        }

        // Lấy identifier (IP hoặc user ID)
        const identifier = this.rateLimitService.getIdentifier(request, user);
        
        // Lấy endpoint path
        const endpoint = `${request.method}:${request.route?.path || request.path}`;

        // Kiểm tra rate limit
        const result = this.rateLimitService.checkRateLimit(
            identifier,
            endpoint,
            userRole,
            config
        );

        // Thêm rate limit headers vào response
        response.setHeader('X-RateLimit-Limit', config.limit);
        response.setHeader('X-RateLimit-Remaining', result.remaining);
        response.setHeader('X-RateLimit-Reset', Math.ceil(result.resetTime / 1000));
        response.setHeader('X-RateLimit-Window', config.window);

        if (!result.allowed) {
            const resetTime = Math.ceil((result.resetTime - Date.now()) / 1000);
            
            throw new HttpException(
                {
                    message: 'Quá nhiều yêu cầu từ địa chỉ này. Vui lòng thử lại sau.',
                    error: 'Too Many Requests',
                    statusCode: HttpStatus.TOO_MANY_REQUESTS,
                    retryAfter: resetTime,
                    limit: config.limit,
                    window: config.window,
                    role: userRole
                },
                HttpStatus.TOO_MANY_REQUESTS
            );
        }

        return true;
    }
}
