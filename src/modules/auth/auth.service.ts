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
    ) { }

    async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
        const { userName, password, confirmPassword, userCode } = registerDto;

        // Kiểm tra mật khẩu có khớp không
        if (password !== confirmPassword) {
            throw new BadRequestException('Mật khẩu không khớp');
        }                // Kiểm tra người dùng đã tồn tại chưa
        const existingUser = await this.userRepository.findOne({
            where: { userName : userName , userCode: userCode },
        });
        if (existingUser) {
            throw new ConflictException('Tên đăng nhập đã tồn tại');
        }

                // Mã hóa mật khẩu
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Tạo người dùng mới
        const user = this.userRepository.create({
            userName: userName,
            password: hashedPassword,
            userCode: registerDto.userCode,
        });

        const savedUser = await this.userRepository.save(user);

        // Tạo JWT tokens
        return await this.generateTokens(savedUser);
    }

    async login(loginDto: LoginDto): Promise<AuthResponseDto> {
        const { userName, password } = loginDto;

        // Tìm người dùng theo tên đăng nhập
        const user = await this.userRepository.findOne({
            where: { userName: userName },
        });

        if (!user) {
            throw new UnauthorizedException('Thông tin đăng nhập không hợp lệ');
        }

        // Xác minh mật khẩu
        const isPasswordValid = await bcrypt.compare(password, user?.password || '');
        if (!isPasswordValid) {
            throw new UnauthorizedException('Thông tin đăng nhập không hợp lệ');
        }

        // Tạo JWT tokens
        return await this.generateTokens(user);
    }

    async validateUserById(userId: number): Promise<User | null> {
        return this.userRepository.findOne({ where: { id: userId } });
    }

    async logout(token: string, userId: number): Promise<{ message: string }> {
        try {
            // Giải mã token để lấy thời gian hết hạn
            const decoded = this.jwtService.decode(token) as any;
            if (!decoded || !decoded.exp) {
                throw new UnauthorizedException('Token không hợp lệ');
            }

            // Chuyển đổi thời gian hết hạn từ giây sang mili giây
            const expiresAt = new Date(decoded.exp * 1000);
            console.log('Token expires at:', expiresAt);
            console.log('User ID:', userId);

            // Thêm token vào danh sách đen
            const blacklistedToken = this.blacklistedTokenRepository.create({
                token,
                userId,
                expiresAt: expiresAt,
            });

            await this.blacklistedTokenRepository.save(blacklistedToken);

            // Vô hiệu hóa tất cả refresh tokens của người dùng này
            await this.refreshTokenRepository.update(
                { userId, isRevoked: false },
                { isRevoked: true }
            );

            return { message: "Đăng xuất thành công" };
        } catch (error) {
            console.error('Logout error:', error);
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
        // Xóa các token blacklisted đã hết hạn để giữ database sạch sẽ
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
            // Kiểm tra token có trong blacklist không
            const isBlacklisted = await this.isTokenBlacklisted(token);
            if (isBlacklisted) {
                throw new UnauthorizedException("Token đã bị vô hiệu hóa");
            }

            // Xác thực và giải mã token
            const payload = this.jwtService.verify(token) as {
                sub: number;
                userName: string;
            };

            // Lấy thông tin người dùng từ database
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

    // Các phương thức hỗ trợ tạo token
    private async generateTokens(user: User): Promise<{ access_token: string; refresh_token: string }> {
        const payload = { userName: user.userName, sub: user.id };
        
        // Tạo access token (hết hạn sau 15 phút)
        const access_token = this.jwtService.sign(payload, { expiresIn: '15m' });
        
        // Tạo refresh token (hết hạn sau 7 ngày)
        const refresh_token = this.jwtService.sign(payload, { expiresIn: '7d' });
        
        // Lưu refresh token vào database
        const refreshTokenEntity = this.refreshTokenRepository.create({
            refreshToken: refresh_token,
            userId: user.id,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 ngày
            isRevoked: false,
        });
        
        await this.refreshTokenRepository.save(refreshTokenEntity);
        
        return { access_token, refresh_token };
    }

    async refresh(refreshTokenDto: RefreshTokenDto): Promise<AuthResponseDto> {
        const { refresh_token } = refreshTokenDto;

        try {
            // Xác thực refresh token
            const payload = this.jwtService.verify(refresh_token) as { sub: number; userName: string };

            // Kiểm tra refresh token có tồn tại trong database và chưa bị thu hồi
            const storedToken = await this.refreshTokenRepository.findOne({
                where: { refreshToken: refresh_token, isRevoked: false },
                relations: ['user'],
            });

            if (!storedToken || storedToken.expiresAt < new Date()) {
                throw new UnauthorizedException('Refresh token không hợp lệ hoặc đã hết hạn');
            }

            // Vô hiệu hóa refresh token cũ
            storedToken.isRevoked = true;
            await this.refreshTokenRepository.save(storedToken);

            // Tạo token mới
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

        console.log('currentUser', currentUser);

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

    /**
     * Validate JWT token for microservices
     */
    async validateToken(token: string): Promise<{ valid: boolean; user?: any; message?: string }> {
        try {
            // Check if token is blacklisted
            const blacklistedToken = await this.blacklistedTokenRepository.findOne({
                where: { token },
            });

            if (blacklistedToken) {
                return {
                    valid: false,
                    message: 'Token has been blacklisted',
                };
            }

            // Verify and decode token
            const decoded = this.jwtService.verify(token);
            
            // Get user information
            const user = await this.userRepository.findOne({
                where: { id: decoded.sub },
            });

            if (!user) {
                return {
                    valid: false,
                    message: 'User not found',
                };
            }

            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { password, ...userWithoutPassword } = user;

            return {
                valid: true,
                user: userWithoutPassword,
            };
        } catch (error) {
            return {
                valid: false,
                message: 'Invalid token',
            };
        }
    }
}
