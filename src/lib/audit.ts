import { query } from '@/db';
import { headers } from 'next/headers';

export async function logSecurityEvent(
  eventType: string,
  userId: number | null,
  description: string,
  metadata?: any
): Promise<boolean> {
  try {
    // Attempt to get client IP address from request headers
    let ipAddress = 'unknown';
    try {
      const headersList = await headers();
      const xForwardedFor = headersList.get('x-forwarded-for');
      if (xForwardedFor) {
        ipAddress = xForwardedFor.split(',')[0].trim();
      } else {
        const clientIp = headersList.get('x-real-ip');
        if (clientIp) ipAddress = clientIp;
      }
    } catch (e) {
      // Headers might not be available in all execution contexts (e.g. background operations)
    }

    await query(
      `INSERT INTO security_audit_logs (event_type, user_id, description, ip_address, event_metadata)
       VALUES ($1, $2, $3, $4, $5)`,
      [eventType, userId, description, ipAddress, metadata ? JSON.stringify(metadata) : null]
    );
    return true;
  } catch (error) {
    console.error('[Audit Log Error] Failed to log security event:', error);
    return false;
  }
}
