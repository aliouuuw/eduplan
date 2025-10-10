import crypto from 'crypto';

/**
 * Generate a secure invitation token
 */
export function generateInvitationToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Generate a unique school code from school name
 * Format: FIRSTWORD-HS-YEAR (e.g., "DAKAR-HS-2025")
 */
export function generateSchoolCode(schoolName: string): string {
  const year = new Date().getFullYear();
  const firstWord = schoolName.split(' ')[0].toUpperCase();
  const randomSuffix = crypto.randomBytes(2).toString('hex').toUpperCase();
  
  return `${firstWord}-${randomSuffix}-${year}`;
}

/**
 * Check if invitation is valid (not expired and not used)
 */
export function isInvitationValid(invitation: {
  expiresAt: Date;
  usedAt: Date | null;
}): boolean {
  const now = new Date();
  const isNotExpired = invitation.expiresAt > now;
  const isNotUsed = invitation.usedAt === null;
  
  return isNotExpired && isNotUsed;
}

/**
 * Get the full invitation link for a given token
 */
export function getInvitationLink(token: string): string {
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  return `${baseUrl}/invite/${token}`;
}

/**
 * Get default invitation expiry (7 days from now)
 */
export function getDefaultInvitationExpiry(): Date {
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + 7);
  return expiryDate;
}

