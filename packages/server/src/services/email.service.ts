import { Resend } from "resend";

import { env } from "../config/env.js";

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

function getBaseUrl(): string {
  // For mobile deep links, use the API domain
  return env.CORS_ORIGIN || "https://emovo.app";
}

export async function sendVerificationEmail(email: string, token: string): Promise<void> {
  if (!resend) {
    console.warn("[email] Resend not configured — skipping verification email");
    return;
  }

  const verifyUrl = `${getBaseUrl()}/verify-email?token=${token}`;

  await resend.emails.send({
    from: env.EMAIL_FROM,
    to: email,
    subject: "Verify your Emovo account",
    html: `
      <div style="font-family: 'Georgia', serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #FEFAE0; border-radius: 12px;">
        <h1 style="color: #75863C; font-size: 28px; margin-bottom: 8px;">Welcome to Emovo</h1>
        <p style="color: #4A4A4A; font-size: 16px; line-height: 1.6;">
          Thanks for creating an account. Please verify your email to get started.
        </p>
        <a href="${verifyUrl}" style="display: inline-block; background: #75863C; color: #FFFFFF; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 24px 0;">
          Verify Email
        </a>
        <p style="color: #7A7A7A; font-size: 13px; line-height: 1.5;">
          If you didn't create this account, you can safely ignore this email.
          This link expires in 24 hours.
        </p>
      </div>
    `,
  });
}

export async function sendPasswordResetEmail(email: string, token: string): Promise<void> {
  if (!resend) {
    console.warn("[email] Resend not configured — skipping password reset email");
    return;
  }

  const resetUrl = `${getBaseUrl()}/reset-password?token=${token}`;

  await resend.emails.send({
    from: env.EMAIL_FROM,
    to: email,
    subject: "Reset your Emovo password",
    html: `
      <div style="font-family: 'Georgia', serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #FEFAE0; border-radius: 12px;">
        <h1 style="color: #75863C; font-size: 28px; margin-bottom: 8px;">Password Reset</h1>
        <p style="color: #4A4A4A; font-size: 16px; line-height: 1.6;">
          We received a request to reset your password. Click the button below to choose a new one.
        </p>
        <a href="${resetUrl}" style="display: inline-block; background: #75863C; color: #FFFFFF; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 24px 0;">
          Reset Password
        </a>
        <p style="color: #7A7A7A; font-size: 13px; line-height: 1.5;">
          If you didn't request this, you can safely ignore this email.
          This link expires in 1 hour.
        </p>
      </div>
    `,
  });
}
