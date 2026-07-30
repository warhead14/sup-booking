// import fetch from 'node-fetch';
import { getDb } from '../database/db';
import { NotificationService } from './notification.service';
export class PaymentService {
  private static get baseUrl() {
    return process.env.ALFABANK_API_URL || 'https://pay.alfabank.ru/payment/rest/';
  }

  private static get credentials() {
    return {
      userName: process.env.ALFABANK_USERNAME || 'test_username',
      password: process.env.ALFABANK_PASSWORD || 'test_password',
    };
  }

  /**
   * Initializes a payment session in Alfa-Bank.
   * @param orderNumber Unique order number (e.g. booking id)
   * @param amount Amount in KOPECKS (1 ruble = 100 kopecks)
   * @param returnUrl URL to redirect user after payment
   * @param description Order description
   * @returns Object with orderId and formUrl
   */
  static async initPayment(orderNumber: string, amount: number, returnUrl: string, description: string): Promise<{ orderId: string, formUrl: string }> {
    const url = new URL('register.do', this.baseUrl);
    const params = new URLSearchParams({
      userName: this.credentials.userName,
      password: this.credentials.password,
      orderNumber,
      amount: amount.toString(),
      returnUrl,
      description
    });

    console.log(`[PaymentService] Initiating payment for order ${orderNumber}, amount: ${amount}`);

    const res = await fetch(`${url}?${params.toString()}`, { method: 'POST' });
    if (!res.ok) {
      throw new Error(`Alfa-Bank API error: ${res.statusText}`);
    }

    const data = await res.json() as any;

    if (data.errorCode) {
      throw new Error(`Alfa-Bank error ${data.errorCode}: ${data.errorMessage}`);
    }

    return {
      orderId: data.orderId,
      formUrl: data.formUrl
    };
  }

  /**
   * Checks the status of a payment.
   * @param orderId The orderId returned by initPayment
   * @returns The status of the order (0 - registered, 1 - pre-authorized, 2 - authorized, 3 - canceled, 4 - refunded, 5 - internal auth by ACS, 6 - rejected)
   */
  static async getOrderStatus(orderId: string): Promise<number> {
    const url = new URL('getOrderStatusExtended.do', this.baseUrl);
    const params = new URLSearchParams({
      userName: this.credentials.userName,
      password: this.credentials.password,
      orderId
    });

    const res = await fetch(`${url}?${params.toString()}`, { method: 'POST' });
    if (!res.ok) {
      throw new Error(`Alfa-Bank API error: ${res.statusText}`);
    }

    const data = await res.json() as any;
    
    if (data.errorCode && data.errorCode !== '0') {
      throw new Error(`Alfa-Bank error ${data.errorCode}: ${data.errorMessage}`);
    }

    return parseInt(data.actionCode || data.orderStatus, 10);
  }

  /**
   * Periodically checks all pending payments with Alfa-Bank
   * and approves bookings if paid.
   */
  static async syncPaymentStatuses(): Promise<void> {
    try {
      const db = await getDb();
      const pendingBookings = await db.all(`
        SELECT * FROM bookings 
        WHERE payment_status = 'pending' AND payment_order_id IS NOT NULL
      `);

      for (const booking of pendingBookings) {
        try {
          const status = await this.getOrderStatus(booking.payment_order_id);
          
          if (status === 2) {
            // Paid
            await db.run(
              `UPDATE bookings SET payment_status = 'paid', status = 'approved' WHERE id = ?`,
              [booking.id]
            );

            const cleanPhone = booking.customer_phone.replace(/\D/g, '');
            const messengerLinks = [];
            if (booking.customer_messenger === 'max') {
              messengerLinks.push(`<a href="https://wa.me/${cleanPhone}">Написать в Макс</a>`);
            }
            if (booking.customer_tg_username) {
              messengerLinks.push(`<a href="https://t.me/${booking.customer_tg_username.replace('@', '')}">Telegram: @${booking.customer_tg_username.replace('@', '')}</a>`);
            }
            const messengerInfo = messengerLinks.length > 0 ? `\n💬 ${messengerLinks.join(' | ')}` : ` (${booking.customer_messenger})`;

            const message = `✅ <b>Бронь оплачена!</b>\n\n👤 ${booking.customer_name}\n📞 ${booking.customer_phone}${messengerInfo}\n\n📅 Даты: ${booking.start_date} - ${booking.end_date}\n⏰ Время: ${booking.pickup_time}\n🏄‍♂️ Количество: ${booking.quantity} шт.\n💳 Предоплата: ${booking.prepayment} ₽\n🆔 ${booking.id}`;

            await NotificationService.enqueueNotification(booking.id, 'payment_received', message);
            console.log(`[PaymentService] Booking ${booking.id} auto-approved via background sync.`);
          } else if (status === 3 || status === 6) {
            // Cancelled or rejected
            await db.run(
              `UPDATE bookings SET payment_status = 'failed', status = 'cancelled' WHERE id = ?`,
              [booking.id]
            );
            console.log(`[PaymentService] Booking ${booking.id} auto-cancelled via background sync.`);
          }
        } catch (err: any) {
          console.error(`[PaymentService] Failed to sync status for booking ${booking.id}:`, err.message);
        }
      }
    } catch (err: any) {
      console.error(`[PaymentService] Error in syncPaymentStatuses:`, err.message);
    }
  }
}
