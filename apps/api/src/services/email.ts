import { Resend } from 'resend';
import { env } from '../config/env';
import { logger } from '../config/logger';

const resend = new Resend(env.RESEND_API_KEY);

export async function sendReminderEmail(to: string, title: string, priority: string, message: string) {
  try {
    if (!env.RESEND_API_KEY || env.RESEND_API_KEY === 'mock_resend_key' || env.RESEND_API_KEY.trim() === '') {
      logger.info(`[Email Mock] Skipping send to ${to} (no active Resend API key)`);
      return;
    }

    const { data, error } = await resend.emails.send({
      from: 'FocusForge Alarms <onboarding@resend.dev>',
      to,
      subject: `🚨 Target Alarm: ${title}`,
      html: `
        <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; border: 2.5px solid #000; padding: 20px; border-radius: 12px; background-color: #FAF7F2; box-shadow: 4px 4px 0px #000;">
          <h2 style="margin-top: 0; color: #FF4B55; font-size: 20px; text-transform: uppercase; font-family: monospace;">⚠️ FOCUSFORGE TARGET ALARM</h2>
          <p style="font-size: 14px; font-weight: bold; color: #000; line-height: 1.5;">
            Your task needs your immediate focus:
          </p>
          <div style="background-color: #fff; border: 2.5px solid #000; padding: 15px; border-radius: 8px; margin-bottom: 20px; box-shadow: 2px 2px 0px #000;">
            <strong style="font-size: 16px; display: block; margin-bottom: 5px; color: #000;">${title}</strong>
            <span style="font-size: 10px; text-transform: uppercase; background-color: #000; color: #fff; padding: 3px 6px; border-radius: 4px; font-weight: bold; font-family: monospace;">
              Priority: ${priority}
            </span>
            <p style="font-size: 13px; color: #333; margin-top: 12px; margin-bottom: 0; line-height: 1.5;">
              ${message}
            </p>
          </div>
          <p style="font-size: 10px; color: #888; margin-bottom: 0; font-family: monospace;">
            Do not want these emails? Disable notifications in FocusForge Settings.
          </p>
        </div>
      `,
    });

    if (error) {
      logger.error('Failed to send email via Resend', error);
      if (env.RESEND_API_KEY && env.RESEND_API_KEY !== 'mock_resend_key') {
        console.warn(
          `⚠️ [Resend Sandbox Restriction] If using onboarding@resend.dev, emails can ONLY be sent to the owner of the Resend account. Delivery to ${to} was rejected.`
        );
      }
    } else {
      logger.info(`Reminder email sent successfully to ${to}, id: ${data?.id}`);
    }
  } catch (err) {
    logger.error('Resend email dispatch error', err);
  }
}
