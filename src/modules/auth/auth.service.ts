import {
    Injectable,
    UnauthorizedException,
    ConflictException,
    BadRequestException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import * as bcrypt from "bcryptjs";
import { User } from "../../entities/user.entity";
import { BlacklistedToken } from "../../entities/blacklisted-token.entity";
import { RefreshToken } from "../../entities/refresh-token.entity";
import {
    LoginDto,
    RegisterDto,
    RefreshTokenDto,
    AuthResponseDto,
} from "../../common/dtos/auth.dto";
import { UpdateProfileDto } from "../../common/dtos/update-profile.dto";

@Injectable()
export class AuthService {
    constructor(
        @InjectRepository(User)
        private userRepository: Repository<User>,
        @InjectRepository(BlacklistedToken)
        private blacklistedTokenRepository: Repository<BlacklistedToken>,
        @InjectRepository(RefreshToken)
        private refreshTokenRepository: Repository<RefreshToken>,
        private jwtService: JwtService,
    ) {}

    async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
        const { userName, password, confirmPassword } = registerDto;

    // Check if passwords match
    if (password !== confirmPassword) {
      throw new BadRequestException('Mật khẩu không khớp');
    }        // Check if user already exists
        const existingUser = await this.userRepository.findOne({
            where: { userName: userName },
        });
        if (existingUser) {
      throw new ConflictException('Tên đăng nhập đã tồn tại');
    }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const user = this.userRepository.create({
            userName: userName,
            password: hashedPassword,
            userCode: registerDto.userCode,
        });

        const savedUser = await this.userRepository.save(user);

        // Generate JWT tokens
        return await this.generateTokens(savedUser);
    }

    async login(loginDto: LoginDto): Promise<AuthResponseDto> {
        const { userName, password } = loginDto;

        // Find user by userName
        const user = await this.userRepository.findOne({
            where: { userName: userName },
        });
    if (!user) {
            throw new UnauthorizedException("Invalid credentials");
        }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user?.password || '');
    if (!isPasswordValid) {
      throw new UnauthorizedException('Thông tin đăng nhập không hợp lệ');
    }

        // Generate JWT tokens
        return await this.generateTokens(user);
    }

    async validateUserById(userId: number): Promise<User | null> {
        return this.userRepository.findOne({ where: { id: userId } });
    }

    async logout(token: string, userId: number): Promise<{ message: string }> {
        try {
            const expiresAt = new Date(1 * 1000); // Convert from seconds to milliseconds
            console.log('object', expiresAt);
            console.log('userId');

            // Add token to blacklist
            const blacklistedToken = this.blacklistedTokenRepository.create({
                token,
                userId,
                expiresAt: expiresAt,
            });

            await this.blacklistedTokenRepository.save(blacklistedToken);

            return { message: "Đăng xuất thành công" };
        } catch {
            throw new UnauthorizedException("Token không hợp lệ");
        }
    }

    async isTokenBlacklisted(token: string): Promise<boolean> {
        const blacklistedToken = await this.blacklistedTokenRepository.findOne({
            where: { token },
        });
        return !!blacklistedToken;
    }

    async cleanupExpiredTokens(): Promise<void> {
        // Remove expired blacklisted tokens to keep the database clean
        await this.blacklistedTokenRepository
            .createQueryBuilder()
            .delete()
            .where("expiresAt < :now", { now: new Date() })
            .execute();
    }

    async getCurrentUserFromToken(
        token: string,
    ): Promise<Omit<User, "password">> {
        try {
            // Check if token is blacklisted first
            const isBlacklisted = await this.isTokenBlacklisted(token);
            if (isBlacklisted) {
                throw new UnauthorizedException("Token đã bị vô hiệu hóa");
            }

            // Verify and decode token
            const payload = this.jwtService.verify(token) as {
                sub: number;
                userName: string;
            };

            // Get user from database
            const user = await this.userRepository.findOne({
                where: { id: payload.sub },
            });
            if (!user) {
                throw new UnauthorizedException("Không tìm thấy người dùng");
            }

            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { password, ...result } = user;
            return result;
        } catch (error) {
            if (error instanceof UnauthorizedException) {
                throw error;
            }
            throw new UnauthorizedException("Token không hợp lệ");
        }
    }

    async getProfile(userId: number): Promise<Omit<User, "password">> {
        const user = await this.userRepository.findOne({
            where: { id: userId },
        });
        if (!user) {
            throw new UnauthorizedException("Không tìm thấy người dùng");
        }

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { password, ...result } = user;
        return result;
    }

    // Helper methods for token generation
    private async generateTokens(user: User): Promise<{ access_token: string; refresh_token: string }> {
        const payload = { userName: user.userName, sub: user.id };
        
        // Generate access token (expires in 15 minutes)
        const access_token = this.jwtService.sign(payload, { expiresIn: '15m' });
        
        // Generate refresh token (expires in 7 days)
        const refresh_token = this.jwtService.sign(payload, { expiresIn: '7d' });
        
        // Save refresh token to database
        const refreshTokenEntity = this.refreshTokenRepository.create({
            refreshToken: refresh_token,
            userId: user.id,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
            isRevoked: false,
        });
        
        await this.refreshTokenRepository.save(refreshTokenEntity);
        
        return { access_token, refresh_token };
    }

    async refresh(refreshTokenDto: RefreshTokenDto): Promise<AuthResponseDto> {
        const { refresh_token } = refreshTokenDto;
        
        try {
            // Verify refresh token
            const payload = this.jwtService.verify(refresh_token) as { sub: number; userName: string };
            
            // Check if refresh token exists in database and is not revoked
            const storedToken = await this.refreshTokenRepository.findOne({
                where: { refreshToken: refresh_token, isRevoked: false },
                relations: ['user'],
            });
            
            if (!storedToken || storedToken.expiresAt < new Date()) {
                throw new UnauthorizedException('Refresh token không hợp lệ hoặc đã hết hạn');
            }
            
            // Revoke old refresh token
            storedToken.isRevoked = true;
            await this.refreshTokenRepository.save(storedToken);
            
            // Generate new tokens
            const user = await this.userRepository.findOne({ where: { id: payload.sub } });
            if (!user) {
                throw new UnauthorizedException('Không tìm thấy người dùng');
            }
            
            return await this.generateTokens(user);
        } catch (error) {
            throw new UnauthorizedException('Refresh token không hợp lệ');
        }
    }

    async updateProfile(userId: number, updateData: UpdateProfileDto, currentUser: User): Promise<Omit<User, "password">> {
        const user = await this.userRepository.findOne({ where: { id: userId } });
        if (!user) {
            throw new UnauthorizedException('Không tìm thấy người dùng');
        }

        // Check if user is updating their own profile or if current user is admin
        if (userId !== currentUser.id && !currentUser.isAdmin) {
            throw new UnauthorizedException('Bạn chỉ có thể cập nhật thông tin của chính mình');
        }

        // Only admin can update certain fields
        if (!currentUser.isAdmin) {
            const { userName, userCode, isAdmin, ...allowedUpdates } = updateData;
            updateData = allowedUpdates;
        }

        // Hash new password if provided
        if (updateData.newPassword) {
            (updateData as any).password = await bcrypt.hash(updateData.newPassword, 10);
            delete updateData.newPassword;
        }

        // Update user
        Object.assign(user, updateData);
        const updatedUser = await this.userRepository.save(user);

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { password, ...result } = updatedUser;
        return result;
    }
}
