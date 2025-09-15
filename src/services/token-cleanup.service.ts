import { Injectable, Logger } from "@nestjs/common";
import { AuthService } from "../modules/auth/auth.service";

@Injectable()
export class TokenCleanupService {
    private readonly logger = new Logger(TokenCleanupService.name);

    constructor(private authService: AuthService) {}

    async cleanupExpiredTokens() {
        this.logger.log("Starting token cleanup...");
        try {
            await this.authService.cleanupExpiredTokens();
            this.logger.log("Token cleanup completed successfully");
        } catch (error) {
            this.logger.error("Token cleanup failed", error);
        }
    }
}
