import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LeadsService {
  constructor(private prisma: PrismaService) {}

  async create(data: {
    fullName?: string;
    phone?: string;
    email?: string;
    profession?: string;
    city?: string;
    interest?: string;
    conversation?: string;
    source?: string;
  }) {
    return this.prisma.lead.create({ data });
  }

  async findAll() {
    return this.prisma.lead.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }
}