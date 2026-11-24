import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'localhost',
    port: Number(process.env.SMTP_PORT || 1025),
    secure: false,
  });

  async sendStatusNotification(params: {
    to: string;
    recipientName: string;
    quoteReference: string;
    newStatus: string;
    totalTTC: number;
  }): Promise<void> {
    const statusLabels: Record<string, string> = {
      SENT: 'envoyé pour validation',
      ACCEPTED: 'accepté par le client',
      REJECTED: 'refusé par le client',
      IN_PROGRESS: 'passé en cours d’intervention',
      COMPLETED: 'clôturé (intervention terminée)',
    };

    const label = statusLabels[params.newStatus] ?? params.newStatus;

    try {
      await this.transporter.sendMail({
        from:
          process.env.SMTP_FROM || '"Portail Interventions" <no-reply@pep.fr>',
        to: params.to,
        subject: `[Devis ${params.quoteReference}] Statut mis à jour : ${label}`,
        text: `Bonjour ${params.recipientName},\n\nLe devis ${params.quoteReference} (${params.totalTTC.toFixed(2)} € TTC) est désormais ${label}.\n\nCordialement,\nPortail Interventions`,
      });
    } catch (error) {
      this.logger.warn(
        `Envoi e-mail ignoré (serveur SMTP indisponible) : ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}