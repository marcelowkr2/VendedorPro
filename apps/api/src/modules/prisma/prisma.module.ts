import { Module, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule implements OnModuleInit, OnModuleDestroy {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.prisma.onModuleInit();
  }

  async onModuleDestroy() {
    await this.prisma.onModuleDestroy();
  }
}