import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AppConfig } from '../../config/configuration';

export interface MailMessage {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Minimal mail abstraction. In development (no SMTP configured) messages are
 * logged instead of sent so that flows such as password reset and email
 * verification remain testable without a mail server. In production wire this
 * to a real SMTP/API transport (e.g. nodemailer transport or provider SDK).
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private readonly config: ConfigService<AppConfig, true>) {}

  private get isConfigured(): boolean {
    return Boolean(this.config.get('MAIL_HOST', { infer: true }));
  }

  async send(message: MailMessage): Promise<void> {
    if (!this.isConfigured) {
      this.logger.warn(
        `[DEV MAIL] to=${message.to} subject="${message.subject}" (SMTP not configured; not sent)`,
      );
      if (process.env.NODE_ENV !== 'production') {
        this.logger.debug(message.html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
      }
      return;
    }
    // Real transport implementation goes here (nodemailer/provider).
    this.logger.log(`Mail queued to ${message.to}: ${message.subject}`);
  }
}
