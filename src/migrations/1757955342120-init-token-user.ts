import { MigrationInterface, QueryRunner } from "typeorm";

export class InitTokenUser1757955342120 implements MigrationInterface {
    name = "InitTokenUser1757955342120";

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE \`blacklisted_tokens\` (\`id\` int NOT NULL AUTO_INCREMENT, \`created_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP, \`updated_at\` datetime NULL ON UPDATE CURRENT_TIMESTAMP, \`token\` text NOT NULL, \`userId\` int NOT NULL, \`expiresAt\` timestamp NOT NULL, \`blacklistedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
        );
        await queryRunner.query(
            `ALTER TABLE \`users\` CHANGE \`updated_at\` \`updated_at\` datetime NULL ON UPDATE CURRENT_TIMESTAMP`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE \`users\` CHANGE \`updated_at\` \`updated_at\` datetime NULL ON UPDATE CURRENT_TIMESTAMP`,
        );
        await queryRunner.query(`DROP TABLE \`blacklisted_tokens\``);
    }
}
