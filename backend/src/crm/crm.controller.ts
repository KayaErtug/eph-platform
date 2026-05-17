import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { CrmService } from './crm.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CustomerStatus, ActivityType, TaskStatus } from '@prisma/client';

@Controller('crm')
@UseGuards(JwtAuthGuard)
export class CrmController {
  constructor(private readonly crmService: CrmService) {}

  @Get('customers')
  getCustomers(@CurrentUser() user: any) {
    return this.crmService.getCustomers(user.id, user.role);
  }

  @Post('customers')
  createCustomer(@CurrentUser() user: any, @Body() body: any) {
    return this.crmService.createCustomer(user.id, body);
  }

  @Get('customers/:id')
  getCustomer(@Param('id') id: string, @CurrentUser() user: any) {
    return this.crmService.getCustomer(id, user.id, user.role);
  }

  @Patch('customers/:id')
  updateCustomer(@Param('id') id: string, @CurrentUser() user: any, @Body() body: any) {
    return this.crmService.updateCustomer(id, user.id, user.role, body);
  }

  @Patch('customers/:id/status')
  updateStatus(@Param('id') id: string, @CurrentUser() user: any, @Body('status') status: CustomerStatus) {
    return this.crmService.updateStatus(id, user.id, user.role, status);
  }

  @Delete('customers/:id')
  deleteCustomer(@Param('id') id: string, @CurrentUser() user: any) {
    return this.crmService.deleteCustomer(id, user.id, user.role);
  }

  @Post('customers/:id/activities')
  addActivity(@Param('id') id: string, @CurrentUser() user: any, @Body() body: { type: ActivityType; note: string }) {
    return this.crmService.addActivity(id, user.id, user.role, body);
  }

  @Post('customers/:id/tasks')
  addTask(@Param('id') id: string, @CurrentUser() user: any, @Body() body: { title: string; dueDate?: string }) {
    return this.crmService.addTask(id, user.id, user.role, body);
  }

  @Patch('tasks/:id')
  updateTask(@Param('id') id: string, @CurrentUser() user: any, @Body() body: any) {
    return this.crmService.updateTask(id, user.id, user.role, body);
  }

  @Get('pipeline')
  getPipeline(@CurrentUser() user: any) {
    return this.crmService.getPipeline(user.id, user.role);
  }
}