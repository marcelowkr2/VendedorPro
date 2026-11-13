import { Controller, Get, Param, Patch, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { UsersService } from './users.service';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { z } from 'zod';

const userStatusSchema = z.object({ active: z.boolean() }).strict();

@Controller('users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class UsersController {
  constructor(private readonly svc: UsersService) {}

  @Get()
  @Permissions('ADMIN_GLOBAL')
  async list() {
    return this.svc.list();
  }

  @Get(':id')
  @Permissions('ADMIN_GLOBAL')
  async findOne(@Param('id') id: string) {
    return this.svc.findOne(id);
  }

  @Patch(':id')
  @Permissions('ADMIN_GLOBAL')
  async update(
    @Param('id') id: string,
    @CurrentUser('id') actorId: string,
    @Body(new ZodValidationPipe(userStatusSchema)) body: z.infer<typeof userStatusSchema>,
  ) {
    return this.svc.setActive(id, body.active, actorId);
  }
}