import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { plainToClass } from "class-transformer";
import { UserDto } from "src/common/dtos/user.dto";

/** Lấy thông tin user đang request */
export const CurrentUser = createParamDecorator(
    (data: string, ctx: ExecutionContext) => {
        const request = ctx.switchToHttp().getRequest();
        const payload = {
            id: request.user?.id,
            isAdmin: request.user?.isAdmin,
        };
        return plainToClass(UserDto, { ...payload });
    },
);
