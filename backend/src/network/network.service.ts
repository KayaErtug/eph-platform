import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

type CreateNetworkPostDto = {
  userId: string;
  type: string;
  title: string;
  description?: string;
  city?: string | null;
  district?: string | null;
  neighborhood?: string | null;
  budget?: number | null;
  urgency?: string | null;
  visibility?: string;
  tags?: string[];
  expiresAt?: string;
};

@Injectable()
export class NetworkService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const now = new Date();

    return this.prisma.networkPost.findMany({
      where: {
        isActive: true,
        expiresAt: {
          gt: now,
        },
      },
      include: {
        User: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async create(dto: CreateNetworkPostDto) {
    return this.prisma.networkPost.create({
      data: {
        id: randomUUID(),
        userId: dto.userId,
        type: dto.type,
        title: dto.title,
        description: dto.description || '',
        city: dto.city || null,
        district: dto.district || null,
        neighborhood: dto.neighborhood || null,
        budget: dto.budget || null,
        urgency: dto.urgency || 'Normal',
        visibility: (dto.visibility as any) || 'TUM_EPH',
        tags: dto.tags || [],
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        isActive: true,
        updatedAt: new Date(),
      },
      include: {
        User: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
      },
    });
  }
}