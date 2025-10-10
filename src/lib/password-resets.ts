import crypto from 'crypto';

/**
 * Generate a secure password reset token
 */
export function generatePasswordResetToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Check if password reset is valid (not expired and not used)
 */
export function isPasswordResetValid(passwordReset: {
  expiresAt: Date;
  usedAt: Date | null;
}): boolean {
  const now = new Date();
  const isNotExpired = passwordReset.expiresAt > now;
  const isNotUsed = passwordReset.usedAt === null;
  
  return isNotExpired && isNotUsed;
}

/**
 * Get the full password reset link for a given token
 */
export function getPasswordResetLink(token: string): string {
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  return `${baseUrl}/reset-password/${token}`;
}

/**
 * Get default password reset expiry (24 hours from now)
 */
export function getDefaultPasswordResetExpiry(): Date {
  const expiryDate = new Date();
  expiryDate.setHours(expiryDate.getHours() + 24);
  return expiryDate;
}

