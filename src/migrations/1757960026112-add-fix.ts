import { MigrationInterface, QueryRunner } from "typeorm";

export class AddFix1757960026112 implements MigrationInterface {
    name = 'AddFix1757960026112'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`users\` CHANGE \`updated_at\` \`updated_at\` datetime NULL ON UPDATE CURRENT_TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE \`users\` CHANGE \`is_deleted\` \`is_deleted\` tinyint NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE \`blacklisted_tokens\` CHANGE \`updated_at\` \`updated_at\` datetime NULL ON UPDATE CURRENT_TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE \`blacklisted_tokens\` CHANGE \`is_deleted\` \`is_deleted\` tinyint NOT NULL DEFAULT false`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`blacklisted_tokens\` CHANGE \`is_deleted\` \`is_deleted\` tinyint NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE \`blacklisted_tokens\` CHANGE \`updated_at\` \`updated_at\` datetime NULL ON UPDATE CURRENT_TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE \`users\` CHANGE \`is_deleted\` \`is_deleted\` tinyint NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE \`users\` CHANGE \`updated_at\` \`updated_at\` datetime NULL ON UPDATE CURRENT_TIMESTAMP`);
    }

}
