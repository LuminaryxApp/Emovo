import { Resend } from "resend";

import { env } from "../config/env.js";

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

console.log(`[email] Resend configured: ${!!resend}`);

function getApiBaseUrl(): string {
  return env.NODE_ENV === "production" ? "https://api.emovo.app" : `http://localhost:${env.PORT}`;
}

function emailWrapper(content: string): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
    <body style="margin: 0; padding: 0; background-color: #F5F1DC; font-family: Georgia, 'Times New Roman', serif;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F5F1DC;">
        <tr>
          <td align="center" style="padding: 40px 16px;">
            <table role="presentation" width="480" cellspacing="0" cellpadding="0" style="max-width: 480px; width: 100%;">

              <!-- Logo -->
              <tr>
                <td align="center" style="padding-bottom: 32px;">
                  <span style="font-size: 36px; font-weight: 700; color: #75863C; letter-spacing: -1px;">Emovo</span>
                </td>
              </tr>

              <!-- Card -->
              <tr>
                <td style="background: #FFFFFF; border-radius: 16px; padding: 40px 32px; box-shadow: 0 2px 12px rgba(0,0,0,0.06);">
                  ${content}
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td align="center" style="padding-top: 24px;">
                  <p style="margin: 0; font-size: 12px; color: #9A9A9A; line-height: 1.6;">
                    Emovo &mdash; Track your emotional well-being
                  </p>
                  <p style="margin: 4px 0 0; font-size: 12px; color: #B0B0B0;">
                    You received this email because you signed up for Emovo.
                  </p>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

export async function sendVerificationEmail(email: string, token: string): Promise<void> {
  if (!resend) {
    console.warn("[email] Resend not configured — skipping verification email");
    return;
  }

  const verifyUrl = `${getApiBaseUrl()}/api/v1/auth/verify-email?token=${token}`;

  const html = emailWrapper(`
    <h1 style="margin: 0 0 8px; font-size: 24px; font-weight: 700; color: #2D2D2D;">Welcome to Emovo</h1>
    <p style="margin: 0 0 24px; font-size: 15px; color: #6B6B6B; line-height: 1.6;">
      You're one step away from tracking your emotional well-being. Verify your email to get started.
    </p>

    <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 auto 24px;">
      <tr>
        <td align="center" style="background: #75863C; border-radius: 10px;">
          <a href="${verifyUrl}" target="_blank" style="display: inline-block; padding: 14px 36px; font-size: 16px; font-weight: 600; color: #FFFFFF; text-decoration: none; font-family: Georgia, serif;">
            Verify My Email
          </a>
        </td>
      </tr>
    </table>

    <div style="border-top: 1px solid #EFEFEF; padding-top: 20px; margin-top: 8px;">
      <p style="margin: 0 0 8px; font-size: 13px; color: #9A9A9A; line-height: 1.5;">
        If the button doesn't work, copy and paste this link into your browser:
      </p>
      <p style="margin: 0; font-size: 12px; color: #6F98B8; word-break: break-all; line-height: 1.5;">
        ${verifyUrl}
      </p>
    </div>

    <p style="margin: 20px 0 0; font-size: 12px; color: #B0B0B0; line-height: 1.5;">
      This link expires in 24 hours. If you didn't create an Emovo account, you can safely ignore this email.
    </p>
  `);

  try {
    const result = await resend.emails.send({
      from: env.EMAIL_FROM,
      to: email,
      subject: "Verify your Emovo account",
      html,
    });
    console.log("[email] Verification email sent:", JSON.stringify(result));
  } catch (err) {
    console.error("[email] Failed to send verification email:", err);
  }
}

export async function sendPasswordResetEmail(email: string, token: string): Promise<void> {
  if (!resend) {
    console.warn("[email] Resend not configured — skipping password reset email");
    return;
  }

  const resetUrl = `${getApiBaseUrl()}/api/v1/auth/reset-password?token=${token}`;

  const html = emailWrapper(`
    <h1 style="margin: 0 0 8px; font-size: 24px; font-weight: 700; color: #2D2D2D;">Reset Your Password</h1>
    <p style="margin: 0 0 24px; font-size: 15px; color: #6B6B6B; line-height: 1.6;">
      We received a request to reset your password. Click the button below to choose a new one.
    </p>

    <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 auto 24px;">
      <tr>
        <td align="center" style="background: #75863C; border-radius: 10px;">
          <a href="${resetUrl}" target="_blank" style="display: inline-block; padding: 14px 36px; font-size: 16px; font-weight: 600; color: #FFFFFF; text-decoration: none; font-family: Georgia, serif;">
            Reset Password
          </a>
        </td>
      </tr>
    </table>

    <div style="border-top: 1px solid #EFEFEF; padding-top: 20px; margin-top: 8px;">
      <p style="margin: 0 0 8px; font-size: 13px; color: #9A9A9A; line-height: 1.5;">
        If the button doesn't work, copy and paste this link into your browser:
      </p>
      <p style="margin: 0; font-size: 12px; color: #6F98B8; word-break: break-all; line-height: 1.5;">
        ${resetUrl}
      </p>
    </div>

    <p style="margin: 20px 0 0; font-size: 12px; color: #B0B0B0; line-height: 1.5;">
      This link expires in 1 hour. If you didn't request a password reset, you can safely ignore this email.
    </p>
  `);

  try {
    const result = await resend.emails.send({
      from: env.EMAIL_FROM,
      to: email,
      subject: "Reset your Emovo password",
      html,
    });
    console.log("[email] Password reset email sent:", JSON.stringify(result));
  } catch (err) {
    console.error("[email] Failed to send password reset email:", err);
  }
}
