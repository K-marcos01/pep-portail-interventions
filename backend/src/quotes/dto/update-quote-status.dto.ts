import { IsEnum } from 'class-validator';
import { QuoteStatus } from '@prisma/client';

export class UpdateQuoteStatusDto {
  @IsEnum(QuoteStatus, {
    message:
      'Statut invalide (DRAFT, SENT, ACCEPTED, REJECTED, IN_PROGRESS, COMPLETED)',
  })
  status: QuoteStatus;
}