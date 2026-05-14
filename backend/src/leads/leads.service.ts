import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail.service';

@Injectable()
export class LeadsService {
  constructor(
    private prisma: PrismaService,
    private mail: MailService,
  ) {}

  async create(data: {
    fullName?: string; phone?: string; email?: string;
    profession?: string; city?: string; interest?: string;
    conversation?: string; source?: string;
  }) {
    const lead = await this.prisma.lead.create({ data });
    try {
      await this.mail.sendNewLead({
        fullName: data.fullName, phone: data.phone,
        email: data.email, profession: data.profession,
        city: data.city, interest: data.interest,
      });
    } catch {}
    return lead;
  }

  async findAll() {
    return this.prisma.lead.findMany({ orderBy: { createdAt: 'desc' } });
  }
}