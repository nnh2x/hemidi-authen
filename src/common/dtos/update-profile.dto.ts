import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsOptional, IsBoolean, MinLength } from "class-validator";

export class UpdateProfileDto {
    @ApiProperty({
        description: "Tên đăng nhập mới (chỉ admin)",
        example: "john_doe_updated",
        required: false,
    })
    @IsString()
    @IsOptional()
    userName?: string;

    @ApiProperty({
        description: "Mã người dùng mới (chỉ admin)",
        example: "new_user_code",
        required: false,
    })
    @IsString()
    @IsOptional()
    @MinLength(6)
    userCode?: string;

    @ApiProperty({
        description: "Quyền quản trị (chỉ admin)",
        example: true,
        required: false,
    })
    @IsBoolean()
    @IsOptional()
    isAdmin?: boolean;

    @ApiProperty({
        description: "Mật khẩu mới",
        example: "newPassword123",
        required: false,
    })
    @IsString()
    @IsOptional()
    @MinLength(6)
    newPassword?: string;
}
