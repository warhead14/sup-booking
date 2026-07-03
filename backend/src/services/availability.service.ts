import { getDb } from '../database/db';
import { getDatesInRange } from '../utils/date';

const TOTAL_SUP = 50;

export class AvailabilityService {
  /**
   * Calculates minimum available SUPs for a given date range.
   */
  static async checkAvailability(startDate: string, endDate: string, excludeBookingId?: string): Promise<number> {
    const db = await getDb();
    const datesToCheck = getDatesInRange(startDate, endDate);
    
    // We only care about approved bookings
    let query = `SELECT start_date, end_date, quantity FROM bookings WHERE status = 'approved' AND (start_date <= ? AND end_date >= ?)`;
    const params: any[] = [endDate, startDate];
    
    if (excludeBookingId) {
      query += ` AND id != ?`;
      params.push(excludeBookingId);
    }
    
    const approvedBookings = await db.all(query, params);

    const onWaterRentals = await db.all(
      `SELECT rental_date as start_date, IFNULL(end_date, rental_date) as end_date, quantity 
       FROM rentals 
       WHERE status = 'on_water' 
       AND (rental_date <= ? AND IFNULL(end_date, rental_date) >= ?)`,
      [endDate, startDate]
    );

    let minAvailable = TOTAL_SUP;

    for (const date of datesToCheck) {
      let usedThatDay = 0;
      for (const b of approvedBookings) {
        if (b.start_date <= date && b.end_date >= date) {
          usedThatDay += b.quantity;
        }
      }
      for (const r of onWaterRentals) {
        if (r.start_date <= date && r.end_date >= date) {
          usedThatDay += r.quantity;
        }
      }
      const availableThatDay = TOTAL_SUP - usedThatDay;
      if (availableThatDay < minAvailable) {
        minAvailable = availableThatDay;
      }
    }

    return Math.max(0, minAvailable); // Prevent negative just in case
  }
}
