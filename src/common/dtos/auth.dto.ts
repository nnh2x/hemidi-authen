import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsNotEmpty, MinLength } from "class-validator";

export class LoginDto {
    @ApiProperty({
        description: "Tên đăng nhập để xác thực",
        example: "john_doe",
    })
    @IsString()
    @IsNotEmpty()
    userName: string;

    @ApiProperty({
        description: "Mật khẩu người dùng",
        example: "password123",
    })
    @IsString()
    @IsNotEmpty()
    @MinLength(6)
    password: string;
}

export class RegisterDto extends LoginDto {
    @ApiProperty({
        description: "Xác nhận mật khẩu",
        example: "password123",
    })
    @IsString()
    @IsNotEmpty()
    @MinLength(6)
    confirmPassword: string;

    @ApiProperty({
        description: "Mã người dùng",
        example: "huyngo",
    })
    @IsString()
    @IsNotEmpty({ message: "Mã người dùng là bắt buộc" })
    @MinLength(6)
    userCode: string;
}

export class AuthResponseDto {
    @ApiProperty({
        description: "JWT access token",
        example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    })
    access_token: string;

    @ApiProperty({
        description: "JWT refresh token",
        example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    })
    refresh_token: string;
}

export class RefreshTokenDto {
    @ApiProperty({
        description: "Refresh token để làm mới access token",
        example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    })
    @IsString()
    @IsNotEmpty()
    refresh_token: string;
}