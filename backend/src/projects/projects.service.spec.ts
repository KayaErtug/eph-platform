import { Test, TestingModule } from '@nestjs/testing';
import { ProjectsService } from './projects.service';
import { PrismaService } from '../prisma/prisma.service';
import { PoolProjectsService } from '../pool-projects/pool-projects.service';
import { NotFoundException } from '@nestjs/common';

describe('ProjectsService', () => {
  let service: ProjectsService;
  const prisma = { project: { findFirst: jest.fn().mockResolvedValue(null) } };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsService,
        { provide: PrismaService, useValue: prisma },
        { provide: PoolProjectsService, useValue: {} },
      ],
    }).compile();

    service = module.get<ProjectsService>(ProjectsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('does not return a missing or invisible project', async () => {
    await expect(service.findOne('missing-project', { id: 'viewer' })).rejects.toBeInstanceOf(NotFoundException);
  });
});
