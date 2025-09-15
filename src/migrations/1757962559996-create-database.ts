import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateDatabase1757962559996 implements MigrationInterface {
    name = 'CreateDatabase1757962559996'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`users\` (\`id\` int NOT NULL AUTO_INCREMENT, \`created_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP, \`updated_at\` datetime NULL ON UPDATE CURRENT_TIMESTAMP, \`is_deleted\` tinyint NOT NULL DEFAULT false, \`user_name\` varchar(255) NOT NULL, \`user_code\` varchar(255) NOT NULL, \`password\` varchar(255) NOT NULL, \`is_admin\` tinyint NOT NULL DEFAULT 0, UNIQUE INDEX \`IDX_b03c48156a562742ab56e2efaa\` (\`user_name\`, \`user_code\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`blacklisted_tokens\` (\`id\` int NOT NULL AUTO_INCREMENT, \`created_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP, \`updated_at\` datetime NULL ON UPDATE CURRENT_TIMESTAMP, \`is_deleted\` tinyint NOT NULL DEFAULT false, \`token\` text NOT NULL, \`user_id\` int NOT NULL, \`expires_at\` timestamp NOT NULL, \`blacklisted_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`refresh_tokens\` (\`id\` int NOT NULL AUTO_INCREMENT, \`created_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP, \`updated_at\` datetime NULL ON UPDATE CURRENT_TIMESTAMP, \`is_deleted\` tinyint NOT NULL DEFAULT false, \`refreshToken\` text NOT NULL, \`userId\` int NOT NULL, \`expiresAt\` timestamp NOT NULL, \`isRevoked\` tinyint NOT NULL DEFAULT 0, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`refresh_tokens\` ADD CONSTRAINT \`FK_610102b60fea1455310ccd299de\` FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`refresh_tokens\` DROP FOREIGN KEY \`FK_610102b60fea1455310ccd299de\``);
        await queryRunner.query(`DROP TABLE \`refresh_tokens\``);
        await queryRunner.query(`DROP TABLE \`blacklisted_tokens\``);
        await queryRunner.query(`DROP INDEX \`IDX_b03c48156a562742ab56e2efaa\` ON \`users\``);
        await queryRunner.query(`DROP TABLE \`users\``);
    }

}
