import { Test, TestingModule } from '@nestjs/testing';
import { ProjectsService } from './projects.service';
import { PrismaService } from '../prisma/prisma.service';
import { PoolProjectsService } from '../pool-projects/pool-projects.service';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { PortfolioApprovalStatus, Role } from '@prisma/client';

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

describe('ProjectsService EPH-06 write permissions', () => {
  const otherRoles = Object.values(Role).filter(role => role !== Role.SUPER_ADMIN);
  let service: ProjectsService;
  let prisma: any;

  beforeEach(() => {
    prisma = { project: {
      findUnique: jest.fn().mockResolvedValue({ id: 'project', ownerId: 'owner', units: [] }),
      update: jest.fn().mockResolvedValue({ id: 'project' }),
      delete: jest.fn().mockResolvedValue({ id: 'project' }),
    } };
    service = new ProjectsService(prisma, {} as PoolProjectsService);
  });

  async function write(operation: 'update' | 'remove', userId: string, role?: Role) {
    return operation === 'update'
      ? service.update('project', userId, { name: 'Updated' }, role)
      : service.remove('project', userId, role);
  }

  describe.each(['update', 'remove'] as const)('%s', operation => {
    const mutation = () => operation === 'update' ? prisma.project.update : prisma.project.delete;

    it('allows super admin to write another owner project even with locked units', async () => {
      prisma.project.findUnique.mockResolvedValue({ ownerId: 'owner', units: [{ approvalStatus: PortfolioApprovalStatus.HAVUZDA }] });
      await expect(write(operation, 'super', Role.SUPER_ADMIN)).resolves.toEqual({ id: 'project' });
      expect(mutation()).toHaveBeenCalledTimes(1);
      expect(mutation().mock.calls[0][0].where).toEqual({ id: 'project' });
      if (operation === 'update') expect(prisma.project.update.mock.calls[0][0].data).toEqual({ name: 'Updated' });
    });

    it.each(otherRoles)('rejects non-owner role %s before mutation', async role => {
      await expect(write(operation, 'outsider', role)).rejects.toBeInstanceOf(ForbiddenException);
      expect(mutation()).not.toHaveBeenCalled();
    });

    it('rejects a non-owner without a role', async () => {
      await expect(write(operation, 'outsider')).rejects.toBeInstanceOf(ForbiddenException);
      expect(mutation()).not.toHaveBeenCalled();
    });

    it.each(otherRoles)('preserves owner access and content locks for %s', async role => {
      await expect(write(operation, 'owner', role)).resolves.toEqual({ id: 'project' });
      mutation().mockClear();
      prisma.project.findUnique.mockResolvedValue({ ownerId: 'owner', units: [{ approvalStatus: PortfolioApprovalStatus.HAVUZDA }] });
      await expect(write(operation, 'owner', role)).rejects.toBeInstanceOf(ForbiddenException);
      expect(mutation()).not.toHaveBeenCalled();
    });

    it('keeps missing projects as not found for super admin', async () => {
      prisma.project.findUnique.mockResolvedValue(null);
      await expect(write(operation, 'super', Role.SUPER_ADMIN)).rejects.toBeInstanceOf(NotFoundException);
      expect(mutation()).not.toHaveBeenCalled();
    });
  });
});
