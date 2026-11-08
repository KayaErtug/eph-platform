import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OfficeRealtorGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const userId = req.user?.id || req.user?.sub;
    const user = userId ? await this.prisma.user.findUnique({ where: { id: userId }, select: { role: true } }) : null;
    if (!user) throw new ForbiddenException('Oturum doğrulanamadı.');
    req.user.role = user.role;
    if (user.role === Role.SUPER_ADMIN) return true;
    const handler = context.getHandler().name;
    if (context.getClass().name === 'OfficeManagementController') {
      if (handler === 'rollout' || handler === 'activate') {
        throw new ForbiddenException('Yalnız Yazılım Ekibi erişebilir.');
      }
      if (handler === 'walletOptions') return true;
    }
    if (user.role !== Role.EMLAKCI) throw new ForbiddenException('Ofisim yalnız emlakçı hesaplarına açıktır.');
    return true;
  }
}
