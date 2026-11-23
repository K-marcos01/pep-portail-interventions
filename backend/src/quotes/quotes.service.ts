import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { QuoteStatus, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateQuoteDto } from './dto/create-quote.dto';

@Injectable()
export class QuotesService {
  constructor(private readonly prisma: PrismaService) {}

  async listClients() {
    return this.prisma.user.findMany({
      where: { role: Role.CLIENT },
      select: {
        id: true,
        email: true,
        fullName: true,
        companyName: true,
      },
      orderBy: { fullName: 'asc' },
    });
  }

  async create(providerId: string, dto: CreateQuoteDto) {
    const client = await this.prisma.user.findUnique({
      where: { id: dto.clientId },
    });

    if (!client || client.role !== Role.CLIENT) {
      throw new NotFoundException(
        'Client introuvable ou utilisateur non enregistré en tant que CLIENT',
      );
    }

    const serviceItemIds = dto.lines
      .map((line) => line.serviceItemId)
      .filter((id): id is string => Boolean(id));

    const serviceItems = serviceItemIds.length
      ? await this.prisma.serviceItem.findMany({
          where: {
            id: { in: serviceItemIds },
            providerId,
          },
        })
      : [];

    const serviceItemMap = new Map(
      serviceItems.map((item) => [item.id, item]),
    );

    let totalHT = 0;
    let totalTTC = 0;

    const preparedLines = dto.lines.map((line) => {
      const linkedItem = line.serviceItemId
        ? serviceItemMap.get(line.serviceItemId)
        : undefined;

      if (line.serviceItemId && !linkedItem) {
        throw new NotFoundException(
          `Prestation catalogue introuvable : ${line.serviceItemId}`,
        );
      }

      const rawVat = line.vatRate ?? linkedItem?.vatRate ?? 20;
      const vatMultiplier = rawVat >= 1 ? rawVat / 100 : rawVat;

      const lineHT = line.quantity * line.unitPriceHT;
      const lineTTC = lineHT * (1 + vatMultiplier);

      totalHT += lineHT;
      totalTTC += lineTTC;

      return {
        label: line.label,
        quantity: line.quantity,
        unitPriceHT: line.unitPriceHT,
        serviceItemId: line.serviceItemId ?? null,
      };
    });

    totalHT = Math.round(totalHT * 100) / 100;
    totalTTC = Math.round(totalTTC * 100) / 100;

    return this.prisma.quote.create({
      data: {
        reference: this.generateReference(),
        status: QuoteStatus.DRAFT,
        totalHT,
        totalTTC,
        providerId,
        clientId: dto.clientId,
        lines: {
          create: preparedLines,
        },
        statusHistory: {
          create: {
            previousStatus: null,
            newStatus: QuoteStatus.DRAFT,
            changedById: providerId,
          },
        },
      },
      include: {
        client: {
          select: { id: true, fullName: true, email: true, companyName: true },
        },
        lines: true,
        statusHistory: true,
      },
    });
  }

  async findAllForUser(user: { userId: string; role: Role }) {
    const whereClause =
      user.role === Role.PROVIDER
        ? { providerId: user.userId }
        : user.role === Role.CLIENT
          ? { clientId: user.userId, status: { not: QuoteStatus.DRAFT } }
          : {};

    return this.prisma.quote.findMany({
      where: whereClause,
      include: {
        provider: {
          select: { id: true, fullName: true, email: true, companyName: true },
        },
        client: {
          select: { id: true, fullName: true, email: true, companyName: true },
        },
        lines: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(quoteId: string, user: { userId: string; role: Role }) {
    const quote = await this.prisma.quote.findUnique({
      where: { id: quoteId },
      include: {
        provider: {
          select: { id: true, fullName: true, email: true, companyName: true },
        },
        client: {
          select: { id: true, fullName: true, email: true, companyName: true },
        },
        lines: true,
        statusHistory: {
          orderBy: { changedAt: 'asc' },
          include: {
            changedBy: {
              select: { id: true, fullName: true, role: true },
            },
          },
        },
      },
    });

    if (!quote) {
      throw new NotFoundException('Devis introuvable');
    }

    const isAuthorized =
      user.role === Role.ADMIN ||
      quote.providerId === user.userId ||
      (quote.clientId === user.userId && quote.status !== QuoteStatus.DRAFT);

    if (!isAuthorized) {
      throw new ForbiddenException("Vous n'avez pas accès à ce devis");
    }

    return quote;
  }

  async updateStatus(
    quoteId: string,
    newStatus: QuoteStatus,
    user: { userId: string; role: Role },
  ) {
    const quote = await this.prisma.quote.findUnique({
      where: { id: quoteId },
    });

    if (!quote) {
      throw new NotFoundException('Devis introuvable');
    }

    if (quote.status === newStatus) {
      throw new BadRequestException(
        `Le devis est déjà au statut ${newStatus}`,
      );
    }

    this.validateStatusTransition(quote, newStatus, user);

    return this.prisma.$transaction(async (tx) => {
      await tx.statusHistory.create({
        data: {
          previousStatus: quote.status,
          newStatus,
          quoteId,
          changedById: user.userId,
        },
      });

      return tx.quote.update({
        where: { id: quoteId },
        data: { status: newStatus },
        include: {
          provider: {
            select: { id: true, fullName: true, email: true, companyName: true },
          },
          client: {
            select: { id: true, fullName: true, email: true, companyName: true },
          },
          lines: true,
          statusHistory: {
            orderBy: { changedAt: 'asc' },
            include: {
              changedBy: {
                select: { id: true, fullName: true, role: true },
              },
            },
          },
        },
      });
    });
  }

  async removeDraft(quoteId: string, providerId: string) {
    const quote = await this.prisma.quote.findUnique({
      where: { id: quoteId },
    });

    if (!quote) {
      throw new NotFoundException('Devis introuvable');
    }

    if (quote.providerId !== providerId) {
      throw new ForbiddenException(
        'Vous ne pouvez supprimer que vos propres devis',
      );
    }

    if (quote.status !== QuoteStatus.DRAFT) {
      throw new BadRequestException(
        'Seul un devis au statut DRAFT peut être supprimé',
      );
    }

    await this.prisma.quote.delete({ where: { id: quoteId } });
    return { message: 'Brouillon supprimé avec succès' };
  }

  private validateStatusTransition(
    quote: { status: QuoteStatus; providerId: string; clientId: string },
    newStatus: QuoteStatus,
    user: { userId: string; role: Role },
  ) {
    const isProviderOwner =
      user.role === Role.PROVIDER && quote.providerId === user.userId;
    const isClientOwner =
      user.role === Role.CLIENT && quote.clientId === user.userId;
    const isAdmin = user.role === Role.ADMIN;

    if (!isProviderOwner && !isClientOwner && !isAdmin) {
      throw new ForbiddenException(
        "Vous n'êtes pas autorisé à modifier ce devis",
      );
    }

    if (isAdmin) {
      return;
    }

    const providerTransitions: Partial<Record<QuoteStatus, QuoteStatus[]>> = {
      [QuoteStatus.DRAFT]: [QuoteStatus.SENT],
      [QuoteStatus.ACCEPTED]: [QuoteStatus.IN_PROGRESS],
      [QuoteStatus.IN_PROGRESS]: [QuoteStatus.COMPLETED],
    };

    const clientTransitions: Partial<Record<QuoteStatus, QuoteStatus[]>> = {
      [QuoteStatus.SENT]: [QuoteStatus.ACCEPTED, QuoteStatus.REJECTED],
    };

    if (isProviderOwner) {
      const allowed = providerTransitions[quote.status] ?? [];
      if (!allowed.includes(newStatus)) {
        throw new BadRequestException(
          `Transition interdite pour un prestataire : ${quote.status} -> ${newStatus}`,
        );
      }
      return;
    }

    if (isClientOwner) {
      const allowed = clientTransitions[quote.status] ?? [];
      if (!allowed.includes(newStatus)) {
        throw new BadRequestException(
          `Transition interdite pour un client : ${quote.status} -> ${newStatus}`,
        );
      }
    }
  }

  private generateReference(): string {
    const year = new Date().getFullYear();
    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    return `DEV-${year}-${randomSuffix}`;
  }
}