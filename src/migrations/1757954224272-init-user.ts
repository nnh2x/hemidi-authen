import { MigrationInterface, QueryRunner } from "typeorm";

export class InitUser1757954224272 implements MigrationInterface {
    name = "InitUser1757954224272";

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE \`users\` (\`id\` int NOT NULL AUTO_INCREMENT, \`created_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP, \`updated_at\` datetime NULL ON UPDATE CURRENT_TIMESTAMP, \`user_name\` varchar(255) NOT NULL, \`user_code\` varchar(255) NOT NULL, \`password\` varchar(255) NOT NULL, UNIQUE INDEX \`IDX_b03c48156a562742ab56e2efaa\` (\`user_name\`, \`user_code\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `DROP INDEX \`IDX_b03c48156a562742ab56e2efaa\` ON \`users\``,
        );
        await queryRunner.query(`DROP TABLE \`users\``);
    }
}
