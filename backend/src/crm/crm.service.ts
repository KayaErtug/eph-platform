import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CustomerStatus, ActivityType, TaskStatus, Role } from '@prisma/client';

@Injectable()
export class CrmService {
  constructor(private prisma: PrismaService) {}

  private canAccessCustomer(customerOwnerId: string, userId: string, userRole: Role) {
    return userRole === Role.SUPER_ADMIN || customerOwnerId === userId;
  }

  private getCustomerWhere(userId: string, userRole: Role) {
    if (userRole === Role.SUPER_ADMIN) {
      return {};
    }

    return { ownerId: userId };
  }

  private async findCustomerForAccess(customerId: string, userId: string, userRole: Role) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      throw new NotFoundException('Müşteri bulunamadı.');
    }

    if (!this.canAccessCustomer(customer.ownerId, userId, userRole)) {
      throw new ForbiddenException('Bu CRM kaydına erişim yetkiniz yok.');
    }

    return customer;
  }

  async getCustomers(userId: string, userRole: Role) {
    return this.prisma.customer.findMany({
      where: this.getCustomerWhere(userId, userRole),
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
        activities: {
          include: { user: { select: { firstName: true, lastName: true } } },
          orderBy: { createdAt: 'desc' },
        },
        tasks: {
          include: { user: { select: { firstName: true, lastName: true } } },
          orderBy: { dueDate: 'asc' },
        },
      },
    });

    if (!customer) {
      throw new NotFoundException('Müşteri bulunamadı.');
    }

    if (!this.canAccessCustomer(customer.ownerId, userId, userRole)) {
      throw new ForbiddenException('Bu CRM kaydına erişim yetkiniz yok.');
    }

    return customer;
  }

  async updateCustomer(id: string, userId: string, userRole: Role, data: any) {
    await this.findCustomerForAccess(id, userId, userRole);

    return this.prisma.customer.update({
      where: { id },
      data,
    });
  }

  async updateStatus(id: string, userId: string, userRole: Role, status: CustomerStatus) {
    await this.findCustomerForAccess(id, userId, userRole);

    return this.prisma.customer.update({
      where: { id },
      data: { status, updatedAt: new Date() },
    });
  }

  async deleteCustomer(id: string, userId: string, userRole: Role) {
    await this.findCustomerForAccess(id, userId, userRole);

    return this.prisma.customer.delete({
      where: { id },
    });
  }

  async addActivity(customerId: string, userId: string, userRole: Role, data: { type: ActivityType; note: string }) {
    await this.findCustomerForAccess(customerId, userId, userRole);

    await this.prisma.customer.update({
      where: { id: customerId },
      data: { lastContactedAt: new Date() },
    });

    return this.prisma.activity.create({
      data: { customerId, userId, ...data },
    });
  }

  async addTask(customerId: string, userId: string, userRole: Role, data: { title: string; dueDate?: string }) {
    await this.findCustomerForAccess(customerId, userId, userRole);

    return this.prisma.task.create({
      data: {
        customerId,
        userId,
        title: data.title,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      },
    });
  }

  async updateTask(taskId: string, userId: string, userRole: Role, data: { status?: TaskStatus; title?: string; dueDate?: string }) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: { customer: true },
    });

    if (!task) {
      throw new NotFoundException('Görev bulunamadı.');
    }

    if (!this.canAccessCustomer(task.customer.ownerId, userId, userRole)) {
      throw new ForbiddenException('Bu CRM görevine erişim yetkiniz yok.');
    }

    return this.prisma.task.update({
      where: { id: taskId },
      data: {
        ...data,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      },
    });
  }

  async getPipeline(userId: string, userRole: Role) {
    const customers = await this.prisma.customer.findMany({
      where: this.getCustomerWhere(userId, userRole),
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        budget: true,
        status: true,
        tags: true,
        city: true,
        lastContactedAt: true,
        updatedAt: true,
        _count: { select: { activities: true, tasks: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const pipeline: Record<string, any[]> = {};
    const statuses = [
      'YENI_LEAD',
      'ILK_GORUSME',
      'PORTFOLYO_GONDERILDI',
      'YER_GOSTERIMI',
      'TEKLIF_SURECI',
      'PAZARLIK',
      'KAPANDI',
      'KAYBEDILDI',
    ];

    statuses.forEach((status) => {
      pipeline[status] = [];
    });

    customers.forEach((customer) => {
      pipeline[customer.status]?.push(customer);
    });

    return pipeline;
  }
}