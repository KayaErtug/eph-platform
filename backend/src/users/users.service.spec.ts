import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';


describe('UsersService', () => {
  let service: UsersService;
  const prisma = { user: { findUnique: jest.fn().mockResolvedValue(null) } };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('does not query persistence for an empty email', async () => {
    await expect(service.findByEmail('')).resolves.toBeNull();
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });
});
