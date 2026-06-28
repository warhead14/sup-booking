import { Request, Response, NextFunction } from 'express';
import { getDb } from '../database/db';
import { AvailabilityService } from '../services/availability.service';
import { createBookingSchema } from '../validators/booking.validator';
import { sendTelegramNotification } from '../services/telegram.service';
import { PaymentService } from '../services/payment.service';
import { normalizePhone } from '../utils/phone';
import crypto from 'crypto';
import { ClientService } from '../services/client.service';

export class BookingController {
  
  static async checkPhone(req: Request, res: Response) {
    try {
      const { phone } = req.query;
      if (!phone || typeof phone !== 'string') {
        return res.status(400).json({ error: 'Phone is required' });
      }
      
      const norm = normalizePhone(phone);
      if (!norm || norm.length < 10) {
        return res.json({ exists: false });
      }

      const db = await getDb();
      const existing = await db.get('SELECT id FROM clients WHERE phone_normalized = ?', [norm]);
      
      res.json({ exists: !!existing });
    } catch (err: any) {
      console.error('[API] Check Phone error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async checkAvailability(req: Request, res: Response, next: NextFunction) {
    try {
      const { startDate, endDate } = req.query as { startDate: string, endDate: string };
      if (!startDate || !endDate) {
        return res.status(400).json({ error: 'startDate and endDate are required' });
      }
      
      const available = await AvailabilityService.checkAvailability(startDate, endDate);
      res.json({ availableQuantity: available });
    } catch (err) {
      next(err);
    }
  }

  static async createBooking(req: Request, res: Response, next: NextFunction) {
    try {
      const data = createBookingSchema.parse(req.body);
      const db = await getDb();
      const id = crypto.randomUUID();

      const clientId = await ClientService.resolveClient(db, {
        name: data.fullName,
        phone: data.phone,
        tgUsername: data.tgUsername
      });

      // We'll set the initial status to payment_pending
      await db.run(
        `INSERT INTO bookings (id, client_id, customer_name, customer_phone, customer_messenger, customer_tg_username, start_date, end_date, pickup_time, quantity, total_price, prepayment, payment_status, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'payment_pending')`,
        [id, clientId, data.fullName, data.phone, data.messenger, data.tgUsername, data.startDate, data.endDate, data.pickupTime, data.quantity, data.totalPrice, data.prepayment]
      );

      // Initialize payment with Alfa-Bank
      const frontendUrl = process.env.FRONTEND_URL || 'https://supbooking.ru';
      const returnUrl = `${frontendUrl}/payment-result?bookingId=${id}`;
      
      try {
        const payment = await PaymentService.initPayment(id, data.prepayment * 100, returnUrl, 'Предоплата за аренду SUP');
        
        await db.run(
          `UPDATE bookings SET payment_order_id = ? WHERE id = ?`,
          [payment.orderId, id]
        );

        res.status(201).json({ success: true, id, paymentUrl: payment.formUrl });
      } catch (paymentErr: any) {
        console.error('Payment initialization failed:', paymentErr);
        // If payment fails to initialize, we can still return success but without paymentUrl,
        // or we can throw an error. Usually it's better to tell the frontend.
        res.status(500).json({ error: 'Не удалось инициализировать оплату: ' + paymentErr.message });
      }
    } catch (err) {
      next(err);
    }
  }

  static async verifyPayment(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const db = await getDb();
      
      const booking = await db.get(`SELECT * FROM bookings WHERE id = ?`, [id]);
      if (!booking) {
        return res.status(404).json({ error: 'Бронь не найдена' });
      }

      if (booking.payment_status === 'paid' || booking.status === 'approved') {
        return res.json({ success: true, status: 'paid' });
      }

      if (!booking.payment_order_id) {
        return res.status(400).json({ error: 'Для данной брони не была создана ссылка на оплату' });
      }

      const status = await PaymentService.getOrderStatus(booking.payment_order_id);
      
      // 2 - authorized / paid
      if (status === 2) {
        await db.run(
          `UPDATE bookings SET payment_status = 'paid', status = 'approved' WHERE id = ?`,
          [id]
        );

        // Send telegram notification now that it's paid
        const cleanPhone = booking.customer_phone.replace(/\D/g, '');
        const messengerLinks = [];
        if (booking.customer_messenger === 'max') {
          messengerLinks.push(`<a href="https://wa.me/${cleanPhone}">Написать в Макс</a>`);
        }
        if (booking.customer_tg_username) {
          messengerLinks.push(`<a href="https://t.me/${booking.customer_tg_username.replace('@', '')}">Telegram: @${booking.customer_tg_username.replace('@', '')}</a>`);
        }
        
        const messengerInfo = messengerLinks.length > 0 ? `\n💬 ${messengerLinks.join(' | ')}` : ` (${booking.customer_messenger})`;

        sendTelegramNotification(
          `✅ <b>Бронь оплачена!</b>\n\n👤 ${booking.customer_name}\n📞 ${booking.customer_phone}${messengerInfo}\n\n📅 Даты: ${booking.start_date} - ${booking.end_date}\n⏰ Время: ${booking.pickup_time}\n🏄‍♂️ Количество: ${booking.quantity} шт.\n💳 Предоплата: ${booking.prepayment} ₽`
        ).catch(err => console.error(err));

        return res.json({ success: true, status: 'paid' });
      } else if (status === 3 || status === 6) {
        // Canceled or rejected
        await db.run(
          `UPDATE bookings SET payment_status = 'failed', status = 'cancelled' WHERE id = ?`,
          [id]
        );
        return res.json({ success: true, status: 'failed' });
      } else {
        // 0 - registered, 1 - pre-authorized, etc
        return res.json({ success: true, status: 'pending' });
      }
    } catch (err) {
      next(err);
    }
  }
}
