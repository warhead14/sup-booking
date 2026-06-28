import { Router } from 'express';
import { BookingController } from '../controllers/booking.controller';

const router = Router();

router.post('/bookings', BookingController.createBooking);
router.get('/bookings/:id/verify-payment', BookingController.verifyPayment);
router.get('/availability', BookingController.checkAvailability);
router.get('/check-phone', BookingController.checkPhone);

export default router;
