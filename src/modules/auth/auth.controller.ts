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

@ApiTags("Xác thực")
@Controller("api/auth")
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Post("register")
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
  async register(@Body() registerDto: RegisterDto): Promise<AuthResponseDto> {
    return this.authService.register(registerDto);
  }

  @Post("login")
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
  async login(@Body() loginDto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(loginDto);
  }

  @Get("profile")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Lấy thông tin người dùng" })
  @ApiResponse({
    status: 200,
    description: "Lấy thông tin người dùng thành công",
  })
  @ApiResponse({
    status: 401,
    description: "Không có quyền - token không hợp lệ hoặc thiếu token",
  })
  async getProfile(@Request() req: { user: { id: number } }) {
    return this.authService.getProfile(req.user.id);
  }

  @Post("refresh")
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
  async refresh(@Body() refreshTokenDto: RefreshTokenDto): Promise<AuthResponseDto> {
    return this.authService.refresh(refreshTokenDto);
  }

  @Post("logout")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Đăng xuất và vô hiệu hóa token" })
  @ApiResponse({
    status: 200,
    description: "Đăng xuất thành công",
  })
  @ApiResponse({
    status: 401,
    description: "Không có quyền - token không hợp lệ",
  })
  async logout(@Request() req: any, @CurrentUser() user: UserDto) {
    // Extract token from Authorization header
    console.log('user', user);
    const token = req.headers?.authorization;
    if (!token) {
      throw new Error("Không tìm thấy token trong Authorization header");
    }
    return this.authService.logout(token, +user.id);
  }

  @Put("profile/:id")
  @UseGuards(JwtAuthGuard)
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
  async updateProfile(
    @Param('id') userId: string,
    @Body() updateProfileDto: UpdateProfileDto,
    @CurrentUser() currentUser: any
  ) {
    return this.authService.updateProfile(+userId, updateProfileDto, currentUser);
  }
}
