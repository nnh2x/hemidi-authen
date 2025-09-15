import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { AuthModule } from "./modules/auth/auth.module";
import { TokenCleanupService } from "./services/token-cleanup.service";
import { ConfigModule, ConfigService } from "@nestjs/config";
import typeorm from "./config/typeorm";

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
        }),
        ConfigModule.forRoot({
            isGlobal: true,
            load: [typeorm],
        }),
        TypeOrmModule.forRootAsync({
            inject: [ConfigService],
            useFactory: async (configService: ConfigService) =>
                configService.get("typeorm")!,
        }),
        AuthModule,
    ],
    controllers: [AppController, AppController],
    providers: [AppService, TokenCleanupService],
})
export class AppModule {}
