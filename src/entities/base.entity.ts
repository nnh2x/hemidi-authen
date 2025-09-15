import { ApiProperty } from "@nestjs/swagger";
import { Column, PrimaryGeneratedColumn } from "typeorm";

export class BaseEntity {
    @ApiProperty({
        description: "Id User",
        example: 1,
    })
    @PrimaryGeneratedColumn()
    id: number;

    @ApiProperty({
        description: "Created timestamp",
        example: "2023-01-01T00:00:00.000Z",
    })
    @Column({
        name: "created_at",
        default: () => "CURRENT_TIMESTAMP",
    })
    createdAt: Date;

    @ApiProperty({
        description: "Last update timestamp",
        example: "2023-01-01T00:00:00.000Z",
    })
    @Column({
        name: "updated_at",
        default: () => null,
        onUpdate: "CURRENT_TIMESTAMP",
        nullable: true,
    })
    updatedAt: Date;

    @Column({
        name: "is_deleted",
        default: () => false,
    })
    isDeleted: boolean;
}
