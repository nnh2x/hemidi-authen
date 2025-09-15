import { MigrationInterface, QueryRunner } from "typeorm";

export class AddDelete1757955892040 implements MigrationInterface {
    name = "AddDelete1757955892040";

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE \`blacklisted_tokens\` ADD \`is_deleted\` tinyint NOT NULL DEFAULT false`,
        );
        await queryRunner.query(
            `ALTER TABLE \`users\` ADD \`is_deleted\` tinyint NOT NULL DEFAULT false`,
        );
        await queryRunner.query(
            `ALTER TABLE \`blacklisted_tokens\` CHANGE \`updated_at\` \`updated_at\` datetime NULL ON UPDATE CURRENT_TIMESTAMP`,
        );
        await queryRunner.query(
            `ALTER TABLE \`users\` CHANGE \`updated_at\` \`updated_at\` datetime NULL ON UPDATE CURRENT_TIMESTAMP`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE \`users\` CHANGE \`updated_at\` \`updated_at\` datetime NULL ON UPDATE CURRENT_TIMESTAMP`,
        );
        await queryRunner.query(
            `ALTER TABLE \`blacklisted_tokens\` CHANGE \`updated_at\` \`updated_at\` datetime NULL ON UPDATE CURRENT_TIMESTAMP`,
        );
        await queryRunner.query(
            `ALTER TABLE \`users\` DROP COLUMN \`is_deleted\``,
        );
        await queryRunner.query(
            `ALTER TABLE \`blacklisted_tokens\` DROP COLUMN \`is_deleted\``,
        );
    }
}
