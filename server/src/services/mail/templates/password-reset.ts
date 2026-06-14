import type { MailTemplate } from '@/services/mail/types.ts';

/** Password-reset email. `resetUrl` is a one-time link valid for 10 minutes. */
export function passwordResetTemplate(resetUrl: string): MailTemplate {
  const subject = 'Reset your ExamPrep password';

  const text = [
    'You requested a password reset.',
    '',
    'Reset your password using this link (valid for 10 minutes):',
    resetUrl,
    '',
    "If you didn't request this, you can safely ignore this email.",
  ].join('\n');

  const html = `
  <div style="margin:0;padding:24px;background:#f4f5f7;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1a1a1a;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr><td align="center">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
          <tr><td style="padding:32px 32px 16px;">
            <h1 style="margin:0 0 8px;font-size:20px;">Reset your password</h1>
            <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#4b5563;">
              We received a request to reset your ExamPrep password. Click the button below to choose a new one. This link is valid for <strong>10 minutes</strong>.
            </p>
            <a href="${resetUrl}" style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 24px;border-radius:8px;">Reset password</a>
            <p style="margin:24px 0 0;font-size:12px;line-height:1.6;color:#6b7280;">
              Or paste this link into your browser:<br>
              <a href="${resetUrl}" style="color:#4f46e5;word-break:break-all;">${resetUrl}</a>
            </p>
          </td></tr>
          <tr><td style="padding:16px 32px 32px;border-top:1px solid #f0f1f3;">
            <p style="margin:0;font-size:12px;line-height:1.6;color:#9ca3af;">
              If you didn't request a password reset, you can safely ignore this email — your password will not change.
            </p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </div>`;

  return { subject, html, text };
}
