import {
  Controller,
  Post,
  Body,
  Get,
  Put,
  Param,
  UseGuards,
  Request,
  Headers,
  UnauthorizedException,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
} from "@nestjs/swagger";
import { AuthService } from "./auth.service";
import {
  LoginDto,
  RegisterDto,
  AuthResponseDto,
  RefreshTokenDto,
} from "../../common/dtos/auth.dto";
import { UpdateProfileDto } from "../../common/dtos/update-profile.dto";
import { CurrentUser } from "src/decorators/current-user.decorator";
import { UserDto } from "src/common/dtos/user.dto";
import { JwtAuthGuard } from "../gruard/jwt-auth.guard";
import { AdminGuard } from "../gruard/admin.guard";
import { RateLimitGuard } from "../gruard/rate-limit.guard";
import { RateLimit, createRateLimitConfig } from "../../decorators/rate-limit.decorator";

@ApiTags("Xác thực")
@Controller("api/auth")
@UseGuards(RateLimitGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Post("register")
  @RateLimit(createRateLimitConfig(
    { limit: 3, window: 300 },    // Anonymous: 3 requests / 5 minutes
    { limit: 5, window: 300 },    // User: 5 requests / 5 minutes  
    { limit: 10, window: 300 }    // Admin: 10 requests / 5 minutes
  ))
  @ApiOperation({ summary: "Đăng ký người dùng mới" })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({
    status: 201,
    description: "Đăng ký người dùng thành công",
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: "Yêu cầu không hợp lệ - mật khẩu không khớp",
  })
  @ApiResponse({
    status: 409,
    description: "Xung đột - tên đăng nhập đã tồn tại",
  })
  @ApiResponse({
    status: 429,
    description: "Quá nhiều yêu cầu - vui lòng thử lại sau",
  })
  async register(@Body() registerDto: RegisterDto): Promise<AuthResponseDto> {
    return this.authService.register(registerDto);
  }

  @Post("login")
  @RateLimit(createRateLimitConfig(
    { limit: 5, window: 300 },    // Anonymous: 5 requests / 5 minutes (chống brute force)
    { limit: 10, window: 300 },   // User: 10 requests / 5 minutes
    { limit: 20, window: 300 }    // Admin: 20 requests / 5 minutes
  ))
  @ApiOperation({ summary: "Đăng nhập bằng tên đăng nhập và mật khẩu" })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: "Đăng nhập thành công",
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: "Không có quyền - thông tin đăng nhập không hợp lệ",
  })
  @ApiResponse({
    status: 429,
    description: "Quá nhiều yêu cầu đăng nhập - vui lòng thử lại sau",
  })
  async login(@Body() loginDto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(loginDto);
  }

  @Get("profile")
  @UseGuards(JwtAuthGuard)
  @RateLimit(createRateLimitConfig(
    { limit: 0, window: 60 },     // Anonymous: 0 requests (cần đăng nhập)
    { limit: 30, window: 60 },    // User: 30 requests / minute
    { limit: 100, window: 60 }    // Admin: 100 requests / minute
  ))
  @ApiOperation({ summary: "Lấy thông tin người dùng" })
  @ApiResponse({
    status: 200,
    description: "Lấy thông tin người dùng thành công",
  })
  @ApiResponse({
    status: 401,
    description: "Không có quyền - token không hợp lệ hoặc thiếu token",
  })
  @ApiResponse({
    status: 429,
    description: "Quá nhiều yêu cầu - vui lòng thử lại sau",
  })
  async getProfile(@Request() req: { user: { id: number } }) {
    return this.authService.getProfile(req.user.id);
  }

  @Post("refresh")
  @RateLimit(createRateLimitConfig(
    { limit: 10, window: 300 },   // Anonymous: 10 requests / 5 minutes
    { limit: 20, window: 300 },   // User: 20 requests / 5 minutes
    { limit: 50, window: 300 }    // Admin: 50 requests / 5 minutes
  ))
  @ApiOperation({ summary: "Làm mới access token bằng refresh token" })
  @ApiBody({ type: RefreshTokenDto })
  @ApiResponse({
    status: 200,
    description: "Làm mới token thành công",
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: "Không có quyền - refresh token không hợp lệ",
  })
  @ApiResponse({
    status: 429,
    description: "Quá nhiều yêu cầu làm mới token - vui lòng thử lại sau",
  })
  async refresh(@Body() refreshTokenDto: RefreshTokenDto): Promise<AuthResponseDto> {
    return this.authService.refresh(refreshTokenDto);
  }

  @Post("logout")
  @UseGuards(JwtAuthGuard)
  @RateLimit(createRateLimitConfig(
    { limit: 0, window: 60 },     // Anonymous: 0 requests (cần đăng nhập)
    { limit: 10, window: 60 },    // User: 10 requests / minute
    { limit: 20, window: 60 }     // Admin: 20 requests / minute
  ))
  @ApiOperation({ summary: "Đăng xuất và vô hiệu hóa token" })
  @ApiResponse({
    status: 200,
    description: "Đăng xuất thành công",
  })
  @ApiResponse({
    status: 401,
    description: "Không có quyền - token không hợp lệ",
  })
  @ApiResponse({
    status: 429,
    description: "Quá nhiều yêu cầu đăng xuất - vui lòng thử lại sau",
  })
  async logout(@Request() req: any, @CurrentUser() user: UserDto) {
    // Extract token from Authorization header
    const authHeader = req.headers?.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException("Không tìm thấy token trong Authorization header");
    }

    // Remove "Bearer " prefix to get the actual token
    const token = authHeader.substring(7);
    return this.authService.logout(token, +user.id);
  }

  @Put("profile/:id")
  @UseGuards(JwtAuthGuard)
  @RateLimit(createRateLimitConfig(
    { limit: 0, window: 60 },     // Anonymous: 0 requests (cần đăng nhập)
    { limit: 5, window: 300 },    // User: 5 requests / 5 minutes (ít cập nhật)
    { limit: 20, window: 300 }    // Admin: 20 requests / 5 minutes
  ))
  @ApiOperation({ summary: "Cập nhật thông tin người dùng (admin có thể cập nhật mọi user)" })
  @ApiResponse({
    status: 200,
    description: "Cập nhật thông tin thành công",
  })
  @ApiResponse({
    status: 401,
    description: "Không có quyền - chỉ có thể cập nhật thông tin của chính mình hoặc cần quyền admin",
  })
  @ApiResponse({
    status: 404,
    description: "Không tìm thấy người dùng",
  })
  @ApiResponse({
    status: 429,
    description: "Quá nhiều yêu cầu cập nhật - vui lòng thử lại sau",
  })
  async updateProfile(
    @Param('id') userId: string,
    @Body() updateProfileDto: UpdateProfileDto,
    @CurrentUser() currentUser: any
  ) {
    return this.authService.updateProfile(+userId, updateProfileDto, currentUser);
  }

  @Post("validate-token")
  @RateLimit(createRateLimitConfig(
    { limit: 10, window: 60 },    // Anonymous: 10 requests / 1 minute
    { limit: 50, window: 60 },    // User: 50 requests / 1 minute
    { limit: 100, window: 60 }    // Admin: 100 requests / 1 minute
  ))
  @ApiOperation({ summary: "Xác thực token từ các microservices khác" })
  @ApiResponse({
    status: 200,
    description: "Token hợp lệ",
  })
  @ApiResponse({
    status: 401,
    description: "Token không hợp lệ",
  })
  async validateToken(@Body() body: { token: string }) {
    return this.authService.validateToken(body.token);
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  @RateLimit(createRateLimitConfig(
    { limit: 0, window: 60 },     // Anonymous: 0 requests (cần đăng nhập)
    { limit: 20, window: 60 },    // User: 20 requests / 1 minute
    { limit: 50, window: 60 }     // Admin: 50 requests / 1 minute
  ))
  @ApiOperation({ summary: "Lấy thông tin người dùng hiện tại" })
  @ApiResponse({
    status: 200,
    description: "Thông tin người dùng",
  })
  @ApiResponse({
    status: 401,
    description: "Token không hợp lệ",
  })
  async getCurrentUser(@CurrentUser() user: UserDto) {
    return { user };
  }

  @Get("health")
  @ApiOperation({ summary: "Kiểm tra tình trạng hoạt động của auth service" })
  @ApiResponse({
    status: 200,
    description: "Service đang hoạt động",
  })
  async healthCheck() {
    return {
      status: "ok",
      service: "Authentication Service",
      timestamp: new Date().toISOString(),
    };
  }
}
