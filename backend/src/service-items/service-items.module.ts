import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ServiceItemsController } from './service-items.controller';
import { ServiceItemsService } from './service-items.service';

@Module({
  imports: [PrismaModule],
  controllers: [ServiceItemsController],
  providers: [ServiceItemsService],
})
export class ServiceItemsModule {}