import { Request, Response, NextFunction } from 'express';
import { getDb } from '../database/db';
import { AvailabilityService } from '../services/availability.service';
import { createBookingSchema } from '../validators/booking.validator';
import { sendTelegramNotification } from '../services/telegram.service';
import { normalizePhone } from '../utils/phone';
import crypto from 'crypto';

export class BookingController {
  
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

      await db.run(
        `INSERT INTO bookings (id, customer_name, customer_phone, customer_messenger, customer_tg_username, start_date, end_date, pickup_time, quantity, total_price, prepayment, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
        [id, data.fullName, data.phone, data.messenger, data.tgUsername, data.startDate, data.endDate, data.pickupTime, data.quantity, data.totalPrice, data.prepayment]
      );

      res.status(201).json({ success: true, id });

      const cleanPhone = data.phone.replace(/\D/g, '');
      const messengerLinks = [];
      if (data.messenger === 'max') {
        messengerLinks.push(`<a href="https://wa.me/${cleanPhone}">Написать в Макс</a>`);
      }
      if (data.tgUsername) {
        messengerLinks.push(`<a href="https://t.me/${data.tgUsername.replace('@', '')}">Telegram: @${data.tgUsername.replace('@', '')}</a>`);
      }
      
      const messengerInfo = messengerLinks.length > 0 ? `\n💬 ${messengerLinks.join(' | ')}` : ` (${data.messenger})`;

      // Async telegram notification
      sendTelegramNotification(
        `🚨 <b>Новая заявка!</b>\n\n👤 ${data.fullName}\n📞 ${data.phone}${messengerInfo}\n\n📅 Даты: ${data.startDate} - ${data.endDate}\n⏰ Время: ${data.pickupTime}\n🏄‍♂️ Количество: ${data.quantity} шт.\n\nДействие: Зайдите в админ-панель для подтверждения.`
      ).catch(err => console.error(err));

    } catch (err) {
      next(err);
    }
  }
}
