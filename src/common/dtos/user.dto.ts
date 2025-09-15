import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsUUID } from "class-validator";

/** Interface user */
export class UserDto {
    @ApiProperty({
        description: "ID người dùng",
        example: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    })
    @IsUUID()
    id: string;

    @ApiProperty({ description: "Là admin?", example: "false" })
    isAdmin: boolean;
}
