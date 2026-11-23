import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateServiceItemDto } from './dto/create-service-item.dto';
import { UpdateServiceItemDto } from './dto/update-service-item.dto';

@Injectable()
export class ServiceItemsService {
  constructor(private readonly prisma: PrismaService) {}

  create(providerId: string, dto: CreateServiceItemDto) {
    return this.prisma.serviceItem.create({
      data: {
        label: dto.label,
        unit: dto.unit,
        unitPriceHT: dto.unitPriceHT,
        vatRate: dto.vatRate,
        providerId,
      },
    });
  }

  findAllByProvider(providerId: string) {
    return this.prisma.serviceItem.findMany({
      where: { providerId },
      orderBy: { label: 'asc' },
    });
  }

  async findOne(id: string, providerId: string) {
    const item = await this.prisma.serviceItem.findUnique({
      where: { id },
    });

    if (!item) {
      throw new NotFoundException('Prestation introuvable');
    }

    if (item.providerId !== providerId) {
      throw new ForbiddenException(
        "Vous n'avez pas accès à cette prestation",
      );
    }

    return item;
  }

  async update(id: string, providerId: string, dto: UpdateServiceItemDto) {
    await this.findOne(id, providerId);

    return this.prisma.serviceItem.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string, providerId: string) {
    await this.findOne(id, providerId);

    await this.prisma.serviceItem.delete({
      where: { id },
    });

    return { message: 'Prestation supprimée du catalogue' };
  }
}