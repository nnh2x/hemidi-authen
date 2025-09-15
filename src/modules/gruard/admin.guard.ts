import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Không có thông tin người dùng');
    }

    if (!user.isAdmin) {
      throw new ForbiddenException('Chỉ admin mới có quyền thực hiện thao tác này');
    }

    return true;
  }
}
