/**
 * Mail service — the single provider swap point.
 *
 * Currently backed by SMTP (Nodemailer). To move to AWS SES (or any other
 * provider), rewrite ONLY the internals of this file: replace the transport and
 * the body of `send()`. The exported `send` / `verify` signatures and every
 * caller stay unchanged.
 */
import nodemailer, { type Transporter } from 'nodemailer';
import { ENV, isEmailConfigured } from '@/config/env.ts';
import type { MailMessage } from '@/services/mail/types.ts';

let transporter: Transporter | null = null;

/** Lazily build a single shared SMTP transporter (null when not configured). */
function getTransporter(): Transporter | null {
  if (!isEmailConfigured) return null;
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    host: ENV.SMTP_HOST,
    port: ENV.SMTP_PORT,
    secure: ENV.SMTP_SECURE, // true => implicit TLS (465), false => STARTTLS
    auth: { user: ENV.SMTP_USER, pass: ENV.SMTP_PASS },
  });

  return transporter;
}

export const mailService = {
  /**
   * Send a message. Returns true on success, false when email is unconfigured
   * or the send fails. Never throws — mail problems must not break callers.
   */
  async send({ to, subject, html, text }: MailMessage): Promise<boolean> {
    const tx = getTransporter();
    if (!tx) return false;
    try {
      await tx.sendMail({ from: ENV.EMAIL_FROM, to, subject, html, text });
      return true;
    } catch (err) {
      console.error(`[mailer] Failed to send "${subject}" to ${to}:`, err);
      return false;
    }
  },

  /** Verify provider connectivity at startup. Logs the result; never throws. */
  async verify(): Promise<void> {
    const tx = getTransporter();
    if (!tx) {
      console.warn('[mailer] SMTP not configured — emails will not be sent.');
      return;
    }
    try {
      await tx.verify();
      console.log('[mailer] SMTP connection verified.');
    } catch (err) {
      console.error('[mailer] SMTP verification failed:', err);
    }
  },
};
