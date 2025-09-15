import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { RateLimitService } from './rate-limit.service';

@Injectable()
export class RateLimitCleanupService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(RateLimitCleanupService.name);
    private cleanupInterval: NodeJS.Timeout;

    constructor(private readonly rateLimitService: RateLimitService) {}

    onModuleInit() {
        // Dọn dẹp cache mỗi 5 phút (300,000ms)
        this.cleanupInterval = setInterval(() => {
            this.handleRateLimitCleanup();
        }, 5 * 60 * 1000);
        
        this.logger.log('Rate limit cleanup service initialized');
    }

    onModuleDestroy() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.logger.log('Rate limit cleanup service destroyed');
        }
    }

    /**
     * Dọn dẹp cache rate limit
     */
    private handleRateLimitCleanup() {
        const before = this.rateLimitService.getCacheInfo();
        
        this.rateLimitService.cleanup();
        
        const after = this.rateLimitService.getCacheInfo();
        
        if (before.totalKeys > after.totalKeys) {
            this.logger.log(
                `Rate limit cleanup completed. ` +
                `Before: ${before.totalKeys} keys (${before.activeKeys} active). ` +
                `After: ${after.totalKeys} keys (${after.activeKeys} active). ` +
                `Cleaned: ${before.totalKeys - after.totalKeys} keys.`
            );
        }
    }

    /**
     * Manual cleanup trigger (cho testing)
     */
    manualCleanup(): void {
        this.handleRateLimitCleanup();
    }
}
