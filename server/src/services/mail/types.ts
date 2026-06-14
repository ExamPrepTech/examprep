export interface MailMessage {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/** A rendered template — everything a message needs except the recipient. */
export type MailTemplate = Omit<MailMessage, 'to'>;
