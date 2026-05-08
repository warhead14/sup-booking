import { Router } from 'express';
import { BookingController } from '../controllers/booking.controller';

const router = Router();

router.post('/bookings', BookingController.createBooking);
router.get('/availability', BookingController.checkAvailability);

export default router;
