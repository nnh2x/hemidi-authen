import { Module } from "@nestjs/common";
import { JwtModule, JwtService } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { JwtStrategy } from "../gruard/jwt.strategy";
import { User } from "../../entities/user.entity";
import { BlacklistedToken } from "../../entities/blacklisted-token.entity";
import { RefreshToken } from "../../entities/refresh-token.entity";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { RateLimitService } from "../../services/rate-limit.service";
import { RateLimitGuard } from "../gruard/rate-limit.guard";
import { RateLimitCleanupService } from "../../services/rate-limit-cleanup.service";

@Module({
    imports: [
        TypeOrmModule.forFeature([User, BlacklistedToken, RefreshToken]),
        PassportModule,
        JwtModule.registerAsync({
            imports: [ConfigModule],
            useFactory: async (configService: ConfigService) => {
                const secret = configService.get<string>("JWT_SECRET");
                return {
                    secret: secret,
                    signOptions: {
                        expiresIn:
                            configService.get<string>("JWT_EXPIRATION") || "1d",
                    },
                };
            },
            inject: [ConfigService],
        }),
    ],
    controllers: [AuthController],
    providers: [
        AuthService, 
        JwtStrategy, 
        RateLimitService, 
        RateLimitGuard, 
        RateLimitCleanupService
    ],
    exports: [AuthService, RateLimitService],
})
export class AuthModule {}
