import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { REQUIRED_PERMISSION_KEY } from '../decorators/require-permission.decorator';
import { resolvePermission } from '../permission.resolver';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const key = this.reflector.getAllAndOverride<string | undefined>(
      REQUIRED_PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!key) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    const role = user?.role as Role | undefined;
    const userId = user?.id || user?.sub || user?.userId;

    if (!role || !userId) {
      throw new ForbiddenException('Yetkisiz erişim.');
    }

    const resolved = await resolvePermission(this.prisma, userId, role, key);

    if (!resolved.enabled) {
      throw new ForbiddenException('Bu işlem için yetkiniz yok.');
    }

    return true;
  }
}
