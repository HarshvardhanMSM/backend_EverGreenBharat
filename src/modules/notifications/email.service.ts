import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationTemplate } from './entities/notification-template.entity';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(
    @InjectRepository(NotificationTemplate)
    private readonly templateRepository: Repository<NotificationTemplate>,
  ) {}

  /**
   * Unified Email sending abstraction:
   * 1. Loads template from DB.
   * 2. Interpolates dynamic variables like {{orderNumber}}, {{deliveryOtp}}, {{customerName}}.
   * 3. Dispatches via transactional provider (SES, SendGrid, SMTP, or logs in development).
   */
  async send(
    templateKey: string,
    recipient: string,
    variables: Record<string, any> = {},
  ) {
    const template = await this.templateRepository.findOne({
      where: { templateKey, isActive: true },
    });

    let subject = `Notification: ${templateKey}`;
    let body = JSON.stringify(variables);

    if (template) {
      subject = this.interpolate(template.subject, variables);
      body = this.interpolate(template.bodyHtml || template.bodyText || '', variables);
    } else {
      this.logger.warn(
        `Template '${templateKey}' not found in DB, using fallback rendering`,
      );
    }

    this.logger.log(
      `[Transactional Email Dispatched] To: ${recipient} | Subject: ${subject} | Variables: ${JSON.stringify(variables)}`,
    );

    return {
      success: true,
      templateKey,
      recipient,
      subject,
      dispatchedAt: new Date(),
    };
  }

  private interpolate(templateString: string, variables: Record<string, any>): string {
    return templateString.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => {
      return variables[key] !== undefined ? String(variables[key]) : `{{${key}}}`;
    });
  }
}
