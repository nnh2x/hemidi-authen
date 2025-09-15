import { MigrationInterface, QueryRunner } from "typeorm";

export class InitTokenConfig1757955485736 implements MigrationInterface {
    name = "InitTokenConfig1757955485736";

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE \`blacklisted_tokens\` DROP COLUMN \`userId\``,
        );
        await queryRunner.query(
            `ALTER TABLE \`blacklisted_tokens\` DROP COLUMN \`expiresAt\``,
        );
        await queryRunner.query(
            `ALTER TABLE \`blacklisted_tokens\` DROP COLUMN \`blacklistedAt\``,
        );
        await queryRunner.query(
            `ALTER TABLE \`blacklisted_tokens\` ADD \`user_id\` int NOT NULL`,
        );
        await queryRunner.query(
            `ALTER TABLE \`blacklisted_tokens\` ADD \`expires_at\` timestamp NOT NULL`,
        );
        await queryRunner.query(
            `ALTER TABLE \`blacklisted_tokens\` ADD \`blacklisted_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP`,
        );
        await queryRunner.query(
            `ALTER TABLE \`users\` CHANGE \`updated_at\` \`updated_at\` datetime NULL ON UPDATE CURRENT_TIMESTAMP`,
        );
        await queryRunner.query(
            `ALTER TABLE \`blacklisted_tokens\` CHANGE \`updated_at\` \`updated_at\` datetime NULL ON UPDATE CURRENT_TIMESTAMP`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE \`blacklisted_tokens\` CHANGE \`updated_at\` \`updated_at\` datetime NULL ON UPDATE CURRENT_TIMESTAMP`,
        );
        await queryRunner.query(
            `ALTER TABLE \`users\` CHANGE \`updated_at\` \`updated_at\` datetime NULL ON UPDATE CURRENT_TIMESTAMP`,
        );
        await queryRunner.query(
            `ALTER TABLE \`blacklisted_tokens\` DROP COLUMN \`blacklisted_at\``,
        );
        await queryRunner.query(
            `ALTER TABLE \`blacklisted_tokens\` DROP COLUMN \`expires_at\``,
        );
        await queryRunner.query(
            `ALTER TABLE \`blacklisted_tokens\` DROP COLUMN \`user_id\``,
        );
        await queryRunner.query(
            `ALTER TABLE \`blacklisted_tokens\` ADD \`blacklistedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP`,
        );
        await queryRunner.query(
            `ALTER TABLE \`blacklisted_tokens\` ADD \`expiresAt\` timestamp NOT NULL`,
        );
        await queryRunner.query(
            `ALTER TABLE \`blacklisted_tokens\` ADD \`userId\` int NOT NULL`,
        );
    }
}
