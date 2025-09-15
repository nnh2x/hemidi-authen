import { Entity, Column, Index } from "typeorm";
import { ApiProperty } from "@nestjs/swagger";
import { BaseEntity } from "./base.entity";

@Index(["userName", "userCode"], { unique: true })
@Entity("users")
export class User extends BaseEntity {
    @ApiProperty({
        description: "Username for the user",
        example: "john_doe",
    })
    @Column({
        name: "user_name",
        nullable: false,
    })
    userName: string;

    @ApiProperty({
        description: "Code for the user",
        example: "user_code",
    })
    @Column({
        name: "user_code",
    })
    userCode: string;

    @Column({
        name: "password",
    })
    password: string;

    @ApiProperty({
        description: "Quyền quản trị của người dùng",
        example: false,
    })
    @Column({
        name: "is_admin",
        default: false,
    })
    isAdmin: boolean;
}
