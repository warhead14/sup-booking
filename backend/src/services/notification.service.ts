import crypto from 'crypto';
import { getDb } from '../database/db';
import { sendTelegramNotification } from './telegram.service';

export class NotificationService {
  /**
   * Enqueues a notification to be sent. Uses INSERT OR IGNORE to prevent duplicates.
   */
  static async enqueueNotification(bookingId: string, eventType: string, message: string): Promise<void> {
    try {
      const db = await getDb();
      const id = crypto.randomUUID();
      
      await db.run(
        `INSERT OR IGNORE INTO notification_outbox (id, booking_id, event_type, message, status)
         VALUES (?, ?, ?, ?, 'pending')`,
        [id, bookingId, eventType, message]
      );
      
      console.log(`[NotificationService] Enqueued ${eventType} notification for booking ${bookingId}`);
    } catch (err) {
      console.error(`[NotificationService] Failed to enqueue ${eventType} notification:`, err);
    }
  }

  /**
   * Processes the outbox by finding pending or failed notifications and sending them.
   */
  static async processOutbox(): Promise<void> {
    const db = await getDb();
    
    // Select up to 10 pending or failed notifications
    const notifications = await db.all(
      `SELECT * FROM notification_outbox 
       WHERE status IN ('pending', 'failed') 
       ORDER BY created_at ASC 
       LIMIT 10`
    );

    for (const notification of notifications) {
      try {
        await sendTelegramNotification(notification.message);
        
        await db.run(
          `UPDATE notification_outbox SET status = 'sent', error_msg = '', updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
          [notification.id]
        );
        console.log(`[NotificationService] Sent notification ${notification.id} for booking ${notification.booking_id}`);
      } catch (err: any) {
        const errorMsg = err.message || 'Unknown error';
        await db.run(
          `UPDATE notification_outbox SET status = 'failed', error_msg = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
          [errorMsg.substring(0, 500), notification.id]
        );
      }
    }
  }
}
