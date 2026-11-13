import { Controller, Get, Post, Param, Patch, Delete, Body, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { CustomersService } from './customers.service';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { customerInputSchema } from '@vendedorpro/shared';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { z } from 'zod';

type CustomerInput = z.infer<typeof customerInputSchema>;

@Controller('customers')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class CustomersController {
  constructor(private readonly svc: CustomersService) {}

  @Get()
  @Permissions('CUSTOMER_READ')
  async list(@TenantId() tenantId: string, @Query('q') q?: string, @Query('limit') limit?: string) {
    return this.svc.list(tenantId, q, Number(limit) || 50);
  }

  @Post()
  @Permissions('CUSTOMER_CREATE')
  async create(
    @TenantId() tenantId: string,
    @CurrentUser('id') userId: string,
    @Body(new ZodValidationPipe(customerInputSchema)) body: CustomerInput,
  ) {
    return this.svc.create(tenantId, body, userId);
  }

  @Get(':id')
  @Permissions('CUSTOMER_READ')
  async findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.svc.findOne(tenantId, id);
  }

  @Patch(':id')
  @Permissions('CUSTOMER_UPDATE')
  async update(
    @TenantId() tenantId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(customerInputSchema.partial())) body: Partial<CustomerInput>,
  ) {
    return this.svc.update(tenantId, id, body, userId);
  }

  @Delete(':id')
  @Permissions('CUSTOMER_DELETE')
  async remove(@TenantId() tenantId: string, @CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.svc.remove(tenantId, id, userId);
  }
}