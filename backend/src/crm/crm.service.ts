import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CustomerStatus, ActivityType, TaskStatus, Role } from '@prisma/client';

@Injectable()
export class CrmService {
  constructor(private prisma: PrismaService) {}

  async getCustomers(userId: string, userRole: Role) {
    const where = userRole === Role.ADMIN ? {} : { ownerId: userId };
    return this.prisma.customer.findMany({
      where,
      include: {
        owner: { select: { firstName: true, lastName: true, role: true } },
        activities: { orderBy: { createdAt: 'desc' }, take: 1 },
        tasks: { where: { status: TaskStatus.BEKLIYOR }, orderBy: { dueDate: 'asc' } },
        _count: { select: { activities: true, tasks: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async createCustomer(userId: string, data: any) {
    return this.prisma.customer.create({
      data: { ...data, ownerId: userId },
    });
  }

  async getCustomer(id: string, userId: string, userRole: Role) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      include: {
        owner: { select: { firstName: true, lastName: true, role: true } },
        activities: { include: { user: { select: { firstName: true, lastName: true } } }, orderBy: { createdAt: 'desc' } },
        tasks: { include: { user: { select: { firstName: true, lastName: true } } }, orderBy: { dueDate: 'asc' } },
      },
    });
    if (!customer) throw new NotFoundException('Müşteri bulunamadı.');
    if (userRole !== Role.ADMIN && customer.ownerId !== userId) throw new ForbiddenException('Bu müşteriye erişim yetkiniz yok.');
    return customer;
  }

  async updateCustomer(id: string, userId: string, userRole: Role, data: any) {
    const customer = await this.prisma.customer.findUnique({ where: { id } });
    if (!customer) throw new NotFoundException('Müşteri bulunamadı.');
    if (userRole !== Role.ADMIN && customer.ownerId !== userId) throw new ForbiddenException('Yetki yok.');
    return this.prisma.customer.update({ where: { id }, data });
  }

  async updateStatus(id: string, userId: string, userRole: Role, status: CustomerStatus) {
    const customer = await this.prisma.customer.findUnique({ where: { id } });
    if (!customer) throw new NotFoundException('Müşteri bulunamadı.');
    if (userRole !== Role.ADMIN && customer.ownerId !== userId) throw new ForbiddenException('Yetki yok.');
    return this.prisma.customer.update({ where: { id }, data: { status, updatedAt: new Date() } });
  }

  async deleteCustomer(id: string, userId: string, userRole: Role) {
    const customer = await this.prisma.customer.findUnique({ where: { id } });
    if (!customer) throw new NotFoundException('Müşteri bulunamadı.');
    if (userRole !== Role.ADMIN && customer.ownerId !== userId) throw new ForbiddenException('Yetki yok.');
    return this.prisma.customer.delete({ where: { id } });
  }

  async addActivity(customerId: string, userId: string, userRole: Role, data: { type: ActivityType; note: string }) {
    const customer = await this.prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) throw new NotFoundException('Müşteri bulunamadı.');
    if (userRole !== Role.ADMIN && customer.ownerId !== userId) throw new ForbiddenException('Yetki yok.');
    await this.prisma.customer.update({ where: { id: customerId }, data: { lastContactedAt: new Date() } });
    return this.prisma.activity.create({ data: { customerId, userId, ...data } });
  }

  async addTask(customerId: string, userId: string, userRole: Role, data: { title: string; dueDate?: string }) {
    const customer = await this.prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) throw new NotFoundException('Müşteri bulunamadı.');
    if (userRole !== Role.ADMIN && customer.ownerId !== userId) throw new ForbiddenException('Yetki yok.');
    return this.prisma.task.create({
      data: { customerId, userId, title: data.title, dueDate: data.dueDate ? new Date(data.dueDate) : undefined },
    });
  }

  async updateTask(taskId: string, userId: string, userRole: Role, data: { status?: TaskStatus; title?: string; dueDate?: string }) {
    const task = await this.prisma.task.findUnique({ where: { id: taskId } });
    if (!task) throw new NotFoundException('Görev bulunamadı.');
    if (userRole !== Role.ADMIN && task.userId !== userId) throw new ForbiddenException('Yetki yok.');
    return this.prisma.task.update({
      where: { id: taskId },
      data: { ...data, dueDate: data.dueDate ? new Date(data.dueDate) : undefined },
    });
  }

  async getPipeline(userId: string, userRole: Role) {
    const where = userRole === Role.ADMIN ? {} : { ownerId: userId };
    const customers = await this.prisma.customer.findMany({
      where,
      select: {
        id: true, firstName: true, lastName: true, phone: true,
        budget: true, status: true, tags: true, city: true,
        lastContactedAt: true, updatedAt: true,
        _count: { select: { activities: true, tasks: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
    const pipeline: Record<string, any[]> = {};
    const statuses = ['YENI_LEAD','ILK_GORUSME','PORTFOLYO_GONDERILDI','YER_GOSTERIMI','TEKLIF_SURECI','PAZARLIK','KAPANDI','KAYBEDILDI'];
    statuses.forEach(s => { pipeline[s] = []; });
    customers.forEach(c => { pipeline[c.status]?.push(c); });
    return pipeline;
  }
}