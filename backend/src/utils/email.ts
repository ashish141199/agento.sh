import nodemailer from 'nodemailer'

/**
 * SMTP transporter instance
 */
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

/**
 * Send OTP email to user
 * @param email - Recipient email address
 * @param code - 6-digit OTP code
 */
export async function sendOtpEmail(email: string, code: string): Promise<void> {
  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: email,
    subject: 'Your Agentoo verification code',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 400px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333; margin-bottom: 20px;">Welcome to Agentoo</h2>
        <p style="color: #666; font-size: 16px;">Your verification code is:</p>
        <div style="background: #f5f5f5; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #333;">${code}</span>
        </div>
        <p style="color: #999; font-size: 14px;">This code expires in 10 minutes.</p>
        <p style="color: #999; font-size: 14px;">If you didn't request this code, you can safely ignore this email.</p>
      </div>
    `,
  })
}

/**
 * Generate 6-digit OTP code
 * @returns 6-digit string code
 */
export function generateOtpCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}
