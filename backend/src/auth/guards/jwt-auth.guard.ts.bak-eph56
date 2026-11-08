import {
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

type EphAuthenticatedRequest = {
  originalUrl?: string;
  url?: string;
  user?: {
    professionalVerificationStatus?: string | null;
    officeMembershipRequired?: boolean;
  };
};

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const authenticated = await super.canActivate(context);

    if (!authenticated) {
      return false;
    }

    const request =
      context.switchToHttp().getRequest<EphAuthenticatedRequest>();

    const status =
      request.user?.professionalVerificationStatus ?? null;

    const officePath = String(request.originalUrl || request.url || '').split('?')[0].replace(/^\/api(?=\/)/, '');
    if (request.user?.officeMembershipRequired && (!status || status === 'VERIFIED') && !['/profile', '/office', '/safety', '/push', '/notification-settings', '/notifications', '/auth/me'].some(path => officePath === path || officePath.startsWith(path + '/'))) {
      throw new ForbiddenException({ code: 'OFFICE_MEMBERSHIP_REQUIRED', message: 'Danışman hesabınızı aktif bir ofise bağlayın. Ofisim ekranından başvurunuzu tamamlayın.', officeRoute: '/office' });
    }

    // Legacy kullanıcılar ile doğrulanmış kullanıcıların erişimi değişmez.
    if (!status || status === 'VERIFIED') {
      return true;
    }

    const requestPath = String(
      request.originalUrl || request.url || '',
    ).split('?')[0];

    // Mesleki doğrulaması bekleyen kullanıcı Profil alanına erişebilmelidir.
    if (
      requestPath === '/profile' ||
      requestPath.startsWith('/profile/') ||
      requestPath === '/auth/me' ||
      requestPath === '/safety/me' ||
      requestPath.startsWith('/safety/blocks')
    ) {
      return true;
    }

    throw new ForbiddenException({
      code: 'PROFESSIONAL_VERIFICATION_REQUIRED',
      message:
        'Mesleki doğrulamanızı Profil sayfasından tamamlayınız.',
      professionalVerificationStatus: status,
      profileRoute: '/profile',
    });
  }
}
