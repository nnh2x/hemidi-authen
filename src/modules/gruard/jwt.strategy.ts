import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy, ExtractJwt } from "passport-jwt";
import { ConfigService } from "@nestjs/config";
import { AuthService } from "../auth/auth.service";
import { Request } from "express";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(
        private authService: AuthService,
        private configService: ConfigService,
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey:
                configService.get<string>("JWT_SECRET") ||
                "hemidi-default-secret-key-change-in-production",
            passReqToCallback: true, // Enable request passing to validate method
        });
    }

    async validate(req: Request, payload: { sub: number; userName: string }) {
        // Trích xuất token từ request header
        const token = ExtractJwt.fromAuthHeaderAsBearerToken()(req);

        if (!token) {
            throw new UnauthorizedException("Không tìm thấy token");
        }

        // Kiểm tra token có trong blacklist không
        const isBlacklisted = await this.authService.isTokenBlacklisted(token);
        if (isBlacklisted) {
            throw new UnauthorizedException("Token đã bị thu hồi");
        }

        // Xác thực người dùng
        const user = await this.authService.validateUserById(payload.sub);
        if (!user) {
            throw new UnauthorizedException("Không tìm thấy người dùng");
        }

        return user;
    }
}
