import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { CrmService } from './crm.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ActivityType, CustomerPropertyRelation, CustomerStatus } from '@prisma/client';

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

  @Get('customers/:id/interests')
  getCustomerInterests(@Param('id') id: string, @CurrentUser() user: any) {
    return this.crmService.getCustomerInterests(id, user.id, user.role);
  }

  @Post('customers/:id/interests')
  addCustomerInterest(@Param('id') id: string, @CurrentUser() user: any, @Body() body: any) {
    return this.crmService.addCustomerInterest(id, user.id, user.role, body);
  }

  @Patch('interests/:id')
  updateCustomerInterest(@Param('id') id: string, @CurrentUser() user: any, @Body() body: any) {
    return this.crmService.updateCustomerInterest(id, user.id, user.role, body);
  }

  @Delete('interests/:id')
  deleteCustomerInterest(@Param('id') id: string, @CurrentUser() user: any) {
    return this.crmService.deleteCustomerInterest(id, user.id, user.role);
  }

  @Get('customers/:id/properties')
  getCustomerProperties(@Param('id') id: string, @CurrentUser() user: any) {
    return this.crmService.getCustomerProperties(id, user.id, user.role);
  }

  @Post('customers/:id/properties')
  addCustomerProperty(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() body: { unitId: string; relationType: CustomerPropertyRelation; notes?: string },
  ) {
    return this.crmService.addCustomerProperty(id, user.id, user.role, body);
  }

  @Delete('customer-properties/:id')
  deleteCustomerProperty(@Param('id') id: string, @CurrentUser() user: any) {
    return this.crmService.deleteCustomerProperty(id, user.id, user.role);
  }

  @Get('pipeline')
  getPipeline(@CurrentUser() user: any) {
    return this.crmService.getPipeline(user.id, user.role);
  }
}
