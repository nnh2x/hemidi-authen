import { Entity, Column } from "typeorm";
import { ApiProperty } from "@nestjs/swagger";
import { BaseEntity } from "./base.entity";

@Entity("blacklisted_tokens")
export class BlacklistedToken extends BaseEntity {
    @ApiProperty({
        description: "JWT token that has been blacklisted",
        example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    })
    @Column({ type: "text", nullable: false })
    token: string;

    @ApiProperty({
        description: "User ID who owns this token",
        example: 1,
    })
    @Column({
        name: "user_id",
        nullable: false,
    })
    userId: number;

    @ApiProperty({
        description: "Token expiry date",
        example: "2023-01-02T00:00:00.000Z",
    })
    @Column({ type: "timestamp", name: "expires_at", nullable: false })
    expiresAt: Date;

    @ApiProperty({
        description: "Token blacklist timestamp",
        example: "2023-01-01T12:00:00.000Z",
    })
    @Column({
        type: "timestamp",
        default: () => "CURRENT_TIMESTAMP",
        name: "blacklisted_at",
    })
    blacklistedAt: Date;
}
