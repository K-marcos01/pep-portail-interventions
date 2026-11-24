import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { QuoteStatus, Role } from '@prisma/client';
import PDFDocument from 'pdfkit';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateQuoteDto } from './dto/create-quote.dto';

export interface AuthenticatedUser {
  id?: string;
  userId?: string;
  email?: string;
  role: Role;
}

@Injectable()
export class QuotesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  private getUserId(user: AuthenticatedUser): string {
    const id = user.userId ?? user.id;
    if (!id) {
      throw new ForbiddenException('Utilisateur non identifié');
    }
    return id;
  }

  async findAllClients() {
    return this.prisma.user.findMany({
      where: { role: Role.CLIENT },
      select: {
        id: true,
        email: true,
        fullName: true,
        companyName: true,
        role: true,
      },
      orderBy: { fullName: 'asc' },
    });
  }

  async create(providerId: string, dto: CreateQuoteDto) {
    const client = await this.prisma.user.findUnique({
      where: { id: dto.clientId },
    });

    if (!client || client.role !== Role.CLIENT) {
      throw new BadRequestException('Client destinataire invalide');
    }

    const totalHT = dto.lines.reduce(
      (sum, line) => sum + line.quantity * line.unitPriceHT,
      0,
    );
    const totalTTC = dto.lines.reduce(
      (sum, line) =>
        sum + line.quantity * line.unitPriceHT * (1 + (line.vatRate ?? 20) / 100),
      0,
    );

    const reference = `DEV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    return this.prisma.quote.create({
      data: {
        reference,
        status: QuoteStatus.DRAFT,
        totalHT: Number(totalHT.toFixed(2)),
        totalTTC: Number(totalTTC.toFixed(2)),
        providerId,
        clientId: dto.clientId,
        lines: {
          create: dto.lines.map((line) => ({
            label: line.label,
            quantity: line.quantity,
            unitPriceHT: line.unitPriceHT,
            vatRate: line.vatRate ?? 20,
            serviceItemId: line.serviceItemId ?? null,
          })),
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
        provider: {
          select: { id: true, fullName: true, email: true, companyName: true },
        },
        client: {
          select: { id: true, fullName: true, email: true, companyName: true },
        },
        lines: true,
      },
    });
  }

  async findAll(user: AuthenticatedUser) {
    const userId = this.getUserId(user);

    const where =
      user.role === Role.ADMIN
        ? {}
        : user.role === Role.PROVIDER
          ? { providerId: userId }
          : { clientId: userId, status: { not: QuoteStatus.DRAFT } };

    return this.prisma.quote.findMany({
      where,
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

  async findOne(id: string, user: AuthenticatedUser) {
    const userId = this.getUserId(user);

    const quote = await this.prisma.quote.findUnique({
      where: { id },
      include: {
        provider: {
          select: { id: true, fullName: true, email: true, companyName: true },
        },
        client: {
          select: { id: true, fullName: true, email: true, companyName: true },
        },
        lines: true,
        statusHistory: {
          include: {
            changedBy: {
              select: { id: true, fullName: true, role: true },
            },
          },
          orderBy: { changedAt: 'asc' },
        },
      },
    });

    if (!quote) {
      throw new NotFoundException('Devis introuvable');
    }

    const isOwner =
      user.role === Role.ADMIN ||
      quote.providerId === userId ||
      (quote.clientId === userId && quote.status !== QuoteStatus.DRAFT);

    if (!isOwner) {
      throw new ForbiddenException('Accès refusé à ce devis');
    }

    return quote;
  }

  async updateStatus(
    id: string,
    newStatus: QuoteStatus,
    user: AuthenticatedUser,
  ) {
    const userId = this.getUserId(user);
    const quote = await this.findOne(id, user);

    const allowedTransitions: Record<
      QuoteStatus,
      { next: QuoteStatus[]; role: Role }
    > = {
      [QuoteStatus.DRAFT]: { next: [QuoteStatus.SENT], role: Role.PROVIDER },
      [QuoteStatus.SENT]: {
        next: [QuoteStatus.ACCEPTED, QuoteStatus.REJECTED],
        role: Role.CLIENT,
      },
      [QuoteStatus.ACCEPTED]: {
        next: [QuoteStatus.IN_PROGRESS],
        role: Role.PROVIDER,
      },
      [QuoteStatus.IN_PROGRESS]: {
        next: [QuoteStatus.COMPLETED],
        role: Role.PROVIDER,
      },
      [QuoteStatus.REJECTED]: { next: [], role: Role.CLIENT },
      [QuoteStatus.COMPLETED]: { next: [], role: Role.PROVIDER },
    };

    const rule = allowedTransitions[quote.status];

    if (!rule.next.includes(newStatus)) {
      throw new BadRequestException(
        `Transition interdite de ${quote.status} vers ${newStatus}`,
      );
    }

    if (user.role !== Role.ADMIN && user.role !== rule.role) {
      throw new ForbiddenException(
        'Votre rôle ne permet pas cette action sur ce devis',
      );
    }

    const updatedQuote = await this.prisma.quote.update({
      where: { id },
      data: {
        status: newStatus,
        statusHistory: {
          create: {
            previousStatus: quote.status,
            newStatus,
            changedById: userId,
          },
        },
      },
      include: {
        provider: {
          select: { id: true, fullName: true, email: true, companyName: true },
        },
        client: {
          select: { id: true, fullName: true, email: true, companyName: true },
        },
        lines: true,
        statusHistory: {
          include: {
            changedBy: {
              select: { id: true, fullName: true, role: true },
            },
          },
          orderBy: { changedAt: 'asc' },
        },
      },
    });

    const notifyClient = (
      [
        QuoteStatus.SENT,
        QuoteStatus.IN_PROGRESS,
        QuoteStatus.COMPLETED,
      ] as QuoteStatus[]
    ).includes(updatedQuote.status);

    const recipient = notifyClient
      ? updatedQuote.client
      : updatedQuote.provider;

    if (recipient?.email) {
      await this.mailService.sendStatusNotification({
        to: recipient.email,
        recipientName: recipient.fullName,
        quoteReference: updatedQuote.reference,
        newStatus: updatedQuote.status,
        totalTTC: updatedQuote.totalTTC,
      });
    }

    return updatedQuote;
  }

  async remove(id: string, user: AuthenticatedUser) {
    const userId = this.getUserId(user);
    const quote = await this.findOne(id, user);

    if (quote.status !== QuoteStatus.DRAFT) {
      throw new BadRequestException(
        'Seul un devis au statut brouillon peut être supprimé',
      );
    }

    if (user.role !== Role.ADMIN && quote.providerId !== userId) {
      throw new ForbiddenException(
        'Seul le prestataire créateur peut supprimer ce brouillon',
      );
    }

    await this.prisma.quote.delete({ where: { id } });
    return { deleted: true };
  }

  listClients() {
    return this.findAllClients();
  }

  findAllForUser(user: AuthenticatedUser) {
    return this.findAll(user);
  }

  removeDraft(id: string, userOrId: AuthenticatedUser | string) {
    const user: AuthenticatedUser =
      typeof userOrId === 'string'
        ? { userId: userOrId, role: Role.PROVIDER }
        : userOrId;
    return this.remove(id, user);
  }

  async generatePdf(
    id: string,
    user: AuthenticatedUser,
  ): Promise<{ buffer: Buffer; reference: string }> {
    const quote = await this.findOne(id, user);

    const buffer = await new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err: Error) => reject(err));

      doc
        .fontSize(20)
        .fillColor('#4F46E5')
        .text('PORTAIL INTERVENTIONS', { align: 'left' });
      doc
        .fontSize(14)
        .fillColor('#0F172A')
        .text(`Devis ${quote.reference}`, { align: 'right' });
      doc
        .fontSize(10)
        .fillColor('#64748B')
        .text(
          `Date : ${new Date(quote.createdAt).toLocaleDateString('fr-FR')}  |  Statut : ${quote.status}`,
          { align: 'right' },
        );

      doc.moveDown(2);

      doc
        .fontSize(11)
        .fillColor('#0F172A')
        .text('Prestataire :', { underline: true });
      doc
        .fontSize(10)
        .fillColor('#334155')
        .text(quote.provider?.fullName ?? '')
        .text(quote.provider?.companyName ?? quote.provider?.email ?? '');

      doc.moveDown(1);

      doc
        .fontSize(11)
        .fillColor('#0F172A')
        .text('Client :', { underline: true });
      doc
        .fontSize(10)
        .fillColor('#334155')
        .text(quote.client?.fullName ?? '')
        .text(quote.client?.companyName ?? quote.client?.email ?? '');

      doc.moveDown(2);

      const tableTop = doc.y;
      doc.fontSize(10).fillColor('#0F172A');
      doc.text('Prestation', 50, tableTop, { width: 250 });
      doc.text('Qté', 310, tableTop, { width: 50, align: 'right' });
      doc.text('PU HT', 370, tableTop, { width: 80, align: 'right' });
      doc.text('Total HT', 460, tableTop, { width: 85, align: 'right' });

      doc
        .moveTo(50, tableTop + 16)
        .lineTo(545, tableTop + 16)
        .strokeColor('#CBD5E1')
        .stroke();

      let y = tableTop + 26;
      for (const line of quote.lines) {
        const lineTotal = line.quantity * line.unitPriceHT;
        doc.fontSize(10).fillColor('#1E293B');
        doc.text(line.label, 50, y, { width: 250 });
        doc.text(String(line.quantity), 310, y, { width: 50, align: 'right' });
        doc.text(`${line.unitPriceHT.toFixed(2)} €`, 370, y, {
          width: 80,
          align: 'right',
        });
        doc.text(`${lineTotal.toFixed(2)} €`, 460, y, {
          width: 85,
          align: 'right',
        });
        y += 24;
      }

      doc
        .moveTo(50, y + 4)
        .lineTo(545, y + 4)
        .strokeColor('#CBD5E1')
        .stroke();

      const vatAmount = quote.totalTTC - quote.totalHT;
      y += 18;
      doc.fontSize(10).fillColor('#334155');
      doc.text(`Total HT : ${quote.totalHT.toFixed(2)} €`, 350, y, {
        width: 195,
        align: 'right',
      });
      y += 18;
      doc.text(`TVA : ${vatAmount.toFixed(2)} €`, 350, y, {
        width: 195,
        align: 'right',
      });
      y += 20;
      doc.fontSize(12).fillColor('#4F46E5');
      doc.text(`Total TTC : ${quote.totalTTC.toFixed(2)} €`, 350, y, {
        width: 195,
        align: 'right',
      });

      doc.end();
    });

    return { buffer, reference: quote.reference };
  }
}