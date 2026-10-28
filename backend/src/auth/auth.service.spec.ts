import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { InvitationsService } from '../invitations/invitations.service';
import { MailService } from '../mail.service';

describe('AuthService', () => {
  let service: AuthService;
  const users = { findByPhoneOrEmail: jest.fn().mockResolvedValue(null) };
  const invitations = { validate: jest.fn() };
  const jwt = { sign: jest.fn() };
  const prisma = { user: { findUnique: jest.fn() } };
  const mail = { sendPasswordResetCode: jest.fn(), sendPasswordChangedNotification: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: users },
        { provide: InvitationsService, useValue: invitations },
        { provide: JwtService, useValue: jwt },
        { provide: PrismaService, useValue: prisma },
        { provide: MailService, useValue: mail },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('does not issue a token for an unknown user', async () => {
    await expect(service.login({ phoneOrEmail: 'missing@example.invalid', password: 'test-password' })).rejects.toBeInstanceOf(UnauthorizedException);
    expect(jwt.sign).not.toHaveBeenCalled();
  });
});
