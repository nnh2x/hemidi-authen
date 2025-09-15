import { registerAs } from "@nestjs/config";
import { TypeOrmModuleOptions } from "@nestjs/typeorm";
import { DataSource, DataSourceOptions } from "typeorm";
import { config as dotenvConfig } from "dotenv";
dotenvConfig({ path: ".env" });

const config: TypeOrmModuleOptions = {
    type: "mysql",
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    entities: [__dirname + "/../**/*.entity.{js,ts}"],
    migrations: [__dirname + "/../migrations/*.{js,ts}"],
    synchronize: false,
    autoLoadEntities: true,
    logging: true,
    extra: {
        connectionTimeoutMillis: 10000, // Thời gian chờ kết nối
    },
    ssl: false,
};

export default registerAs("typeorm", (): TypeOrmModuleOptions => config);
export const connectionSource = new DataSource(config as DataSourceOptions);
