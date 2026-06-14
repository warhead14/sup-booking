import { Request, Response, NextFunction } from 'express';
import { getDb } from '../database/db';
import { AvailabilityService } from '../services/availability.service';
import { updateStatusSchema, adminCreateBookingSchema, issueRentalSchema } from '../validators/booking.validator';
import { normalizePhone } from '../utils/phone';
import crypto from 'crypto';

export class AdminController {
  
  static async getBookings(req: Request, res: Response, next: NextFunction) {
    try {
      const db = await getDb();
      // Sort priority: pending first, then by closest start_date
      const bookings = await db.all(
        `SELECT * FROM bookings 
         ORDER BY 
           CASE WHEN status = 'pending' THEN 1 ELSE 2 END,
           start_date ASC,
           created_at DESC`
      );
      res.json(bookings);
    } catch (err) {
      next(err);
    }
  }

  static async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { action } = updateStatusSchema.parse(req.body);
      
      const db = await getDb();
      const booking = await db.get('SELECT * FROM bookings WHERE id = ?', [id]);
      
      if (!booking) {
        return res.status(404).json({ error: 'Booking not found' });
      }

      if (action === 'approve') {
        if (booking.status === 'approved') return res.json({ success: true, message: 'Already approved' });
        
        // Double check availability!
        const available = await AvailabilityService.checkAvailability(booking.start_date, booking.end_date);
        
        if (available < booking.quantity) {
          return res.status(409).json({ 
            error: 'Overbooking', 
            message: `Одобрение невозможно. На выбранные даты свободно только ${available} сапбордов.` 
          });
        }
        
        await db.run('UPDATE bookings SET status = ? WHERE id = ?', ['approved', id]);
      } else if (action === 'reject') {
        await db.run('UPDATE bookings SET status = ? WHERE id = ?', ['rejected', id]);
      } else if (action === 'cancel') {
        await db.run('UPDATE bookings SET status = ? WHERE id = ?', ['cancelled', id]);
      }

      const updatedBooking = await db.get('SELECT * FROM bookings WHERE id = ?', [id]);
      res.json({ success: true, booking: updatedBooking });
    } catch (err) {
      next(err);
    }
  }

  static async createBooking(req: Request, res: Response, next: NextFunction) {
    try {
      const data = adminCreateBookingSchema.parse(req.body);
      const db = await getDb();
      const id = crypto.randomUUID();

      await db.run(
        `INSERT INTO bookings (id, customer_name, customer_phone, customer_messenger, customer_tg_username, start_date, end_date, pickup_time, quantity, total_price, prepayment, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'approved')`,
        [id, data.fullName, data.phone, data.messenger, data.tgUsername, data.startDate, data.endDate, data.pickupTime, data.quantity, data.totalPrice, data.prepayment]
      );

      const booking = await db.get('SELECT * FROM bookings WHERE id = ?', [id]);
      res.status(201).json({ success: true, booking });
    } catch (err) {
      next(err);
    }
  }

  static async getRentals(req: Request, res: Response, next: NextFunction) {
    try {
      const db = await getDb();
      const rentals = await db.all(
        `SELECT * FROM rentals ORDER BY created_at DESC`
      );
      res.json(rentals);
    } catch (err) {
      next(err);
    }
  }

  static async issueRental(req: Request, res: Response, next: NextFunction) {
    try {
      const data = req.body || {};
      const db = await getDb();
      const id = crypto.randomUUID();

      // ── Resolve or create client ────────────────────────────────────────
      let clientId: string | null = null;
      const phone = (data.customerPhone || '').toString().trim();
      if (phone) {
        const norm = normalizePhone(phone);
        if (norm) {
          const existing = await db.get(
            'SELECT id FROM clients WHERE phone_normalized = ?', [norm]
          );
          if (existing) {
            clientId = existing.id;
            // Keep client name up-to-date with the most recent one
            if (data.customerName) {
              await db.run(
                'UPDATE clients SET name = ?, telegram_username = COALESCE(NULLIF(?, \'\'), telegram_username), updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [data.customerName, data.customerTgUsername || '', clientId]
              );
            }
          } else if (data.customerName) {
            clientId = crypto.randomUUID();
            await db.run(
              `INSERT INTO clients (id, name, phone, phone_normalized, telegram_username, note)
               VALUES (?, ?, ?, ?, ?, '')`,
              [clientId, data.customerName.trim(), phone, norm, data.customerTgUsername || '']
            );
          }
        }
      }

      await db.run(
        `INSERT INTO rentals (id, booking_id, client_id, customer_name, customer_phone, customer_tg_username, quantity, pickup_time, rental_date, end_date, expected_return_time, prepayment, payment_on_site, total_price, penalty, payment_method, deposit_types, deposit_note, extra_gear, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'on_water')`,
        [
          id,
          data.bookingId || null,
          clientId,
          data.customerName || '',
          phone,
          data.customerTgUsername || '',
          data.quantity || 1,
          data.pickupTime || '',
          data.rentalDate || '',
          data.endDate || data.rentalDate || '',
          data.expectedReturnTime || '',
          data.prepayment || 0,
          data.paymentOnSite || 0,
          data.totalPrice || 0,
          data.penalty || 0,
          data.paymentMethod || '',
          JSON.stringify(data.depositTypes || []),
          data.depositNote || '',
          JSON.stringify(data.extraGear || [])
        ]
      );

      // If issued from a booking, mark the booking as 'issued' and backfill its client_id
      if (data.bookingId) {
        await db.run(
          'UPDATE bookings SET status = ?, client_id = COALESCE(client_id, ?) WHERE id = ?',
          ['issued', clientId, data.bookingId]
        );
      }

      const rental = await db.get('SELECT * FROM rentals WHERE id = ?', [id]);
      res.status(201).json({ success: true, rental });
    } catch (err) {
      next(err);
    }
  }

  static async updateRental(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const data = req.body || {};
      const db = await getDb();

      const existingRental = await db.get('SELECT * FROM rentals WHERE id = ?', [id]);
      if (!existingRental) {
        return res.status(404).json({ error: 'Rental not found' });
      }

      let clientId: string | null = existingRental.client_id;
      const phone = (data.customerPhone || '').toString().trim();
      if (phone) {
        const norm = normalizePhone(phone);
        if (norm) {
          const existingClient = await db.get(
            'SELECT id FROM clients WHERE phone_normalized = ?', [norm]
          );
          if (existingClient) {
            clientId = existingClient.id;
            if (data.customerName) {
              await db.run(
                'UPDATE clients SET name = ?, telegram_username = COALESCE(NULLIF(?, \'\'), telegram_username), updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [data.customerName, data.customerTgUsername || '', clientId]
              );
            }
          } else if (data.customerName) {
            clientId = crypto.randomUUID();
            await db.run(
              `INSERT INTO clients (id, name, phone, phone_normalized, telegram_username, note)
               VALUES (?, ?, ?, ?, ?, '')`,
              [clientId, data.customerName.trim(), phone, norm, data.customerTgUsername || '']
            );
          }
        }
      }

      await db.run(
        `UPDATE rentals SET
          client_id = ?,
          customer_name = ?,
          customer_phone = ?,
          customer_tg_username = ?,
          quantity = ?,
          pickup_time = ?,
          rental_date = ?,
          end_date = ?,
          expected_return_time = ?,
          prepayment = ?,
          payment_on_site = ?,
          total_price = ?,
          penalty = ?,
          payment_method = ?,
          deposit_types = ?,
          deposit_note = ?,
          extra_gear = ?
         WHERE id = ?`,
        [
          clientId,
          data.customerName || '',
          phone,
          data.customerTgUsername || '',
          data.quantity || 1,
          data.pickupTime || '',
          data.rentalDate || '',
          data.endDate || data.rentalDate || '',
          data.expectedReturnTime || '',
          data.prepayment || 0,
          data.paymentOnSite || 0,
          data.totalPrice || 0,
          data.penalty || 0,
          data.paymentMethod || '',
          JSON.stringify(data.depositTypes || []),
          data.depositNote || '',
          JSON.stringify(data.extraGear || []),
          id
        ]
      );

      const rental = await db.get('SELECT * FROM rentals WHERE id = ?', [id]);
      res.json({ success: true, rental });
    } catch (err) {
      next(err);
    }
  }

  static async returnRental(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const db = await getDb();
      
      const rental = await db.get('SELECT * FROM rentals WHERE id = ?', [id]);
      if (!rental) {
        return res.status(404).json({ error: 'Rental not found' });
      }

      await db.run(
        `UPDATE rentals SET status = 'returned', returned_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [id]
      );

      const updated = await db.get('SELECT * FROM rentals WHERE id = ?', [id]);
      res.json({ success: true, rental: updated });
    } catch (err) {
      next(err);
    }
  }

  private static async calculateStats(startDate: string, endDate: string) {
    const db = await getDb();
    const rentals = await db.all(
      `SELECT * FROM rentals WHERE rental_date >= ? AND rental_date <= ?`,
      [startDate, endDate]
    );

    let totalIncome = 0;
    let totalPrepayment = 0;
    let totalOnSite = 0;
    let totalPenalty = 0;
    let totalSups = 0;
    const gearTotals: Record<string, number> = {};

    const incomeList: any[] = [];
    const rentalList: any[] = [];
    const prepaymentList: any[] = [];
    const onSiteList: any[] = [];
    const onSiteBreakdown: Record<string, number> = {
      'Наличные': 0,
      'Карта': 0,
      'Перевод': 0,
      'QR': 0
    };

    for (const r of rentals) {
      let splits: any[] = [];
      let baseOnSite = Number(r.payment_on_site) || 0;
      
      try {
        if (r.payment_method && r.payment_method.startsWith('[')) {
          splits = JSON.parse(r.payment_method);
          // Redefine onSite to match the exact sum of splits to prevent UI discrepancies
          baseOnSite = splits.reduce((sum, split) => sum + (Number(split.amount) || 0), 0);
        } else {
          splits = [{ method: r.payment_method || 'Не указан', amount: baseOnSite }];
        }
      } catch {
        splits = [{ method: r.payment_method || 'Не указан', amount: baseOnSite }];
      }

      const prep = Number(r.prepayment) || 0;
      const onSite = baseOnSite;
      const pen = Number(r.penalty) || 0;
      const total = prep + onSite + pen;
      const sups = Number(r.quantity) || 0;

      const start = new Date(r.rental_date).getTime();
      const end = new Date(r.end_date || r.rental_date).getTime();
      const days = Math.round((end - start) / 86400000) + 1;

      totalIncome += total;
      totalPrepayment += prep;
      totalOnSite += onSite;
      totalPenalty += pen;
      totalSups += sups;

      if (total > 0) incomeList.push({ id: r.id, name: r.customer_name, sum: total, sups, days });
      if (sups > 0) rentalList.push({ id: r.id, name: r.customer_name, sups, days });
      if (prep > 0) prepaymentList.push({ id: r.id, name: r.customer_name, sum: prep, time: r.created_at });
      
      if (onSite > 0) {
        splits.forEach(split => {
          const amt = Number(split.amount) || 0;
          if (amt > 0) {
            onSiteList.push({ id: r.id, name: r.customer_name, sum: amt, time: r.returned_at, method: split.method });
            if (onSiteBreakdown.hasOwnProperty(split.method)) {
              onSiteBreakdown[split.method] += amt;
            } else {
              onSiteBreakdown[split.method] = amt;
            }
          }
        });
      }

      const gear = JSON.parse(r.extra_gear || '[]');
      for (const item of gear) {
        gearTotals[item.name] = (gearTotals[item.name] || 0) + Number(item.qty);
      }
    }

    // Sort lists by time
    prepaymentList.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
    onSiteList.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

    return {
      totalIncome,
      totalPrepayment,
      totalOnSite,
      totalPenalty,
      totalSups,
      rentalCount: rentals.length,
      gearTotals,
      incomeList,
      rentalList,
      prepaymentList,
      onSiteList,
      onSiteBreakdown
    };
  }

  static async getStats(req: Request, res: Response, next: NextFunction) {
    try {
      const { startDate, endDate } = req.query as { startDate: string; endDate: string };
      if (!startDate || !endDate) {
        return res.status(400).json({ error: 'startDate and endDate are required' });
      }
      const stats = await AdminController.calculateStats(startDate, endDate);
      res.json(stats);
    } catch (err) {
      next(err);
    }
  }

  static async exportStats(req: Request, res: Response, next: NextFunction) {
    try {
      const { startDate, endDate } = req.query as { startDate: string; endDate: string };
      if (!startDate || !endDate) {
        return res.status(400).json({ error: 'startDate and endDate are required' });
      }
      
      const stats = await AdminController.calculateStats(startDate, endDate);
      
      const header = [
        'Период',
        'Общий доход',
        'Предоплата',
        'Доплата на месте',
        'Наличные',
        'Карта',
        'Перевод',
        'QR',
        'Кол-во выдач (сапов)'
      ].join(';');

      const row = [
        `${startDate} - ${endDate}`,
        stats.totalIncome,
        stats.totalPrepayment,
        stats.totalOnSite,
        stats.onSiteBreakdown['Наличные'],
        stats.onSiteBreakdown['Карта'],
        stats.onSiteBreakdown['Перевод'],
        stats.onSiteBreakdown['QR'],
        `${stats.rentalCount} (${stats.totalSups})`
      ].join(';');

      const csv = '\uFEFF' + [header, row].join('\n'); // Add BOM for Excel UTF-8 support

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="stats_${startDate}_${endDate}.csv"`);
      res.send(csv);
    } catch (err) {
      next(err);
    }
  }

  static async deleteBooking(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      console.log(`🗑️ Deleting booking with ID: ${id}`);
      const db = await getDb();
      const result = await db.run('DELETE FROM bookings WHERE id = ?', [id]);
      console.log(`✅ Booking deleted. Changes: ${result.changes}`);
      res.json({ success: true, changes: result.changes });
    } catch (err) {
      console.error('❌ Error in deleteBooking:', err);
      res.status(500).json({ error: 'Internal Server Error', message: err instanceof Error ? err.message : String(err) });
    }
  }

  static async deleteRental(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      console.log(`🗑️ Deleting rental with ID: ${id}`);
      const db = await getDb();
      const result = await db.run('DELETE FROM rentals WHERE id = ?', [id]);
      console.log(`✅ Rental deleted. Changes: ${result.changes}`);
      res.json({ success: true, changes: result.changes });
    } catch (err) {
      console.error('❌ Error in deleteRental:', err);
      res.status(500).json({ error: 'Internal Server Error', message: err instanceof Error ? err.message : String(err) });
    }
  }


  static async getClients(req: Request, res: Response, next: NextFunction) {
    try {
      const db = await getDb();
      const { q } = req.query as { q?: string };

      // Pull from clients table
      // Live stats for both rentals and sales
      const rows = await db.all(`
        SELECT
          c.id,
          c.name,
          c.phone,
          c.phone_normalized,
          c.telegram_username as tg_username,
          c.note,
          (SELECT COUNT(*) FROM rentals r WHERE r.client_id = c.id) as rental_count,
          (SELECT COUNT(*) FROM sales s WHERE s.client_id = c.id) as sale_count,
          COALESCE((SELECT SUM(prepayment + payment_on_site + penalty) FROM rentals r WHERE r.client_id = c.id), 0) as rental_spent,
          COALESCE((SELECT SUM(total_revenue) FROM sales s WHERE s.client_id = c.id), 0) as sale_spent,
          (SELECT MAX(rental_date) FROM rentals r WHERE r.client_id = c.id) as last_rental,
          (SELECT MAX(created_at) FROM sales s WHERE s.client_id = c.id) as last_sale
        FROM clients c
        GROUP BY c.id
      `);

      let clients = rows.map((r: any) => {
        const totalSpent = Number(r.rental_spent) + Number(r.sale_spent);
        const lastActivity = [r.last_rental, r.last_sale].filter(Boolean).sort().reverse()[0] || null;
        
        return {
          id: r.id,
          phone: r.phone,
          phoneNormalized: r.phone_normalized as string,
          name: r.name,
          tgUsername: r.tg_username || '',
          note: r.note || '',
          rentalCount: Number(r.rental_count),
          saleCount: Number(r.sale_count),
          totalSpent: Math.round(totalSpent * 100) / 100,
          lastVisit: lastActivity, // Use unified last activity date
          lastRental: r.last_rental || null,
        };
      });


      // Filter by search query — name, phone, tgUsername
      if (q && q.trim()) {
        const query = q.trim().toLowerCase();
        const normQuery = normalizePhone(query);
        clients = clients.filter(c =>
          c.name.toLowerCase().includes(query) ||
          c.phone.toLowerCase().includes(query) ||
          (normQuery && c.phoneNormalized?.includes(normQuery)) ||
          (c.tgUsername && c.tgUsername.toLowerCase().replace('@', '').includes(query.replace('@', '')))
        );
      }

      res.json(clients);
    } catch (err) {
      next(err);
    }
  }

  static async getClientProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const db = await getDb();

      const client = await db.get('SELECT * FROM clients WHERE id = ?', [id]);
      if (!client) {
        return res.status(404).json({ error: 'Client not found' });
      }

      // Get all rentals for this client
      const rentals = await db.all(
        `SELECT * FROM rentals WHERE client_id = ? ORDER BY rental_date DESC, created_at DESC`,
        [id]
      );

      // Get all bookings for this client
      const bookings = await db.all(
        `SELECT * FROM bookings WHERE client_id = ? ORDER BY start_date DESC, created_at DESC`,
        [id]
      );

      // Get all sales for this client
      const sales = await db.all(
        `SELECT * FROM sales WHERE client_id = ? ORDER BY created_at DESC`,
        [id]
      );

      // Get items for these sales
      for (const sale of sales) {
        sale.items = await db.all('SELECT * FROM sale_items WHERE sale_id = ?', [sale.id]);
      }

      let rentalSpent = 0;
      let totalSups = 0;
      for (const r of rentals) {
        rentalSpent += (Number(r.prepayment) || 0) + (Number(r.payment_on_site) || 0) + (Number(r.penalty) || 0);
        totalSups += Number(r.quantity) || 0;
      }

      const saleSpent = sales.reduce((sum, s) => sum + (Number(s.total_revenue) || 0), 0);
      const totalSpent = rentalSpent + saleSpent;

      res.json({
        id: client.id,
        phone: client.phone,
        name: client.name,
        tgUsername: client.telegram_username || '',
        note: client.note || '',
        rentalCount: rentals.length,
        saleCount: sales.length,
        bookingCount: bookings.length,
        totalSpent: Math.round(totalSpent * 100) / 100,
        totalSups,
        firstVisit: rentals.length > 0 ? rentals[rentals.length - 1].rental_date : (sales.length > 0 ? sales[sales.length-1].created_at : null),
        lastVisit: rentals.length > 0 ? rentals[0].rental_date : (sales.length > 0 ? sales[0].created_at : null),
        rentals,
        sales,
        bookings,
      });
    } catch (err) {
      next(err);
    }
  }

  static async updateClientNote(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { note } = req.body as { note: string };
      const db = await getDb();

      const result = await db.run(
        'UPDATE clients SET note = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [note ?? '', id]
      );
      if (!result.changes) {
        return res.status(404).json({ error: 'Client not found' });
      }
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  }

  static async splitRecord(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params; // current client id
      const { recordType, recordId, action, targetClientId, newName, newPhone } = req.body;
      const db = await getDb();

      // Ensure valid action
      if (!['new_client', 'existing_client'].includes(action)) {
        return res.status(400).json({ error: 'Invalid action' });
      }

      // Ensure valid recordType
      if (!['booking', 'rental', 'sale'].includes(recordType)) {
        return res.status(400).json({ error: 'Invalid recordType' });
      }

      let newClientId = targetClientId;

      // Handle new client creation
      if (action === 'new_client') {
        newClientId = crypto.randomUUID();
        let norm = newPhone ? normalizePhone(newPhone) : '';
        if (!norm) {
          norm = `empty-${crypto.randomUUID()}`;
        }
        await db.run(
          `INSERT INTO clients (id, name, phone, phone_normalized, telegram_username, note)
           VALUES (?, ?, ?, ?, '', '')`,
          [newClientId, newName || 'Без имени', newPhone || '', norm]
        );
      }

      if (!newClientId) {
        return res.status(400).json({ error: 'targetClientId is required for existing_client action' });
      }

      // Reassign record to the new/existing client
      if (recordType === 'rental') {
        await db.run('UPDATE rentals SET client_id = ?, customer_name = ?, customer_phone = ? WHERE id = ? AND client_id = ?', 
          [newClientId, newName || '', newPhone || '', recordId, id]);
      } else if (recordType === 'sale') {
        await db.run('UPDATE sales SET client_id = ? WHERE id = ? AND client_id = ?', 
          [newClientId, recordId, id]);
      } else if (recordType === 'booking') {
        await db.run('UPDATE bookings SET client_id = ?, customer_name = ?, customer_phone = ? WHERE id = ? AND client_id = ?', 
          [newClientId, newName || '', newPhone || '', recordId, id]);
      }

      res.json({ success: true, newClientId });
    } catch (err) {
      next(err);
    }
  }

  static async deleteClient(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const db = await getDb();

      // Start transaction to ensure atomicity
      await db.run('BEGIN TRANSACTION');

      try {
        // 1. Delete from sale_items for sales belonging to this client
        await db.run(
          'DELETE FROM sale_items WHERE sale_id IN (SELECT id FROM sales WHERE client_id = ?)',
          [id]
        );

        // 2. Delete from sales
        await db.run('DELETE FROM sales WHERE client_id = ?', [id]);

        // 3. Delete from rentals
        await db.run('DELETE FROM rentals WHERE client_id = ?', [id]);

        // 4. Delete from bookings
        await db.run('DELETE FROM bookings WHERE client_id = ?', [id]);

        // 5. Delete from clients
        const result = await db.run('DELETE FROM clients WHERE id = ?', [id]);

        if (!result.changes) {
          await db.run('ROLLBACK');
          return res.status(404).json({ error: 'Client not found' });
        }

        await db.run('COMMIT');
        res.json({ success: true });
      } catch (err) {
        await db.run('ROLLBACK');
        throw err;
      }
    } catch (err) {
      next(err);
    }
  }
}

