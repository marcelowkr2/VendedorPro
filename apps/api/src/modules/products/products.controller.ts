import { Controller, Get, Post, Param, Patch, Delete, Body, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { ProductsService } from './products.service';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { productInputSchema } from '@vendedorpro/shared';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('products')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class ProductsController {
  constructor(private readonly svc: ProductsService) {}

  @Get()
  @Permissions('PRODUCT_READ')
  async list(@TenantId() tenantId: string, @Query('q') q?: string, @Query('limit') limit?: string) {
    return this.svc.list(tenantId, q, Number(limit) || 50);
  }

  @Post()
  @Permissions('PRODUCT_CREATE')
  async create(
    @TenantId() tenantId: string,
    @CurrentUser('id') userId: string,
    @Body(new ZodValidationPipe(productInputSchema)) body: any,
  ) {
    return this.svc.create(tenantId, userId, body);
  }

  @Get(':id')
  @Permissions('PRODUCT_READ')
  async findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.svc.findOne(tenantId, id);
  }

  @Patch(':id')
  @Permissions('PRODUCT_UPDATE')
  async update(
    @TenantId() tenantId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(productInputSchema.partial())) body: any,
  ) {
    return this.svc.update(tenantId, id, body, userId);
  }

  @Delete(':id')
  @Permissions('PRODUCT_DELETE')
  async remove(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.svc.remove(tenantId, id);
  }
}