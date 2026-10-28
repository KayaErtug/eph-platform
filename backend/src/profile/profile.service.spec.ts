import { Test, TestingModule } from '@nestjs/testing';
import { ProfileService } from './profile.service';
import { PrismaService } from '../prisma/prisma.service';
import { SupabaseService } from '../supabase/supabase.service';

describe('ProfileService', () => {
  let service: ProfileService;
  const prisma = { user: { findUnique: jest.fn().mockResolvedValue(null) } };
  const supabase = { createSignedUrl: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProfileService,
        { provide: PrismaService, useValue: prisma },
        { provide: SupabaseService, useValue: supabase },
      ],
    }).compile();

    service = module.get<ProfileService>(ProfileService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('returns no profile for a missing user', async () => {
    await expect(service.getProfile('missing-user')).resolves.toBeNull();
    expect(supabase.createSignedUrl).not.toHaveBeenCalled();
  });
});
