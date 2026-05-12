import { Router } from 'express';
import { AdminController } from '../controllers/admin.controller';
import { SalesController } from '../controllers/sales.controller';
import { adminAuthMiddleware } from '../middlewares/auth.middleware';

const router = Router();

// Protect all admin routes
router.use(adminAuthMiddleware);

router.get('/bookings', AdminController.getBookings);
router.post('/bookings', AdminController.createBooking);
router.patch('/bookings/:id/status', AdminController.updateStatus);
router.delete('/bookings/:id', AdminController.deleteBooking);

router.get('/rentals', AdminController.getRentals);
router.post('/rentals', AdminController.issueRental);
router.patch('/rentals/:id/return', AdminController.returnRental);
router.delete('/rentals/:id', AdminController.deleteRental);

router.get('/stats', AdminController.getStats);
router.get('/stats/export', AdminController.exportStats);

router.get('/clients', AdminController.getClients);
router.get('/clients/:id', AdminController.getClientProfile);
router.patch('/clients/:id/note', AdminController.updateClientNote);
router.delete('/clients/:id', AdminController.deleteClient);


// Products
router.get('/products', SalesController.getProducts);
router.post('/products', SalesController.createProduct);
router.put('/products/:id', SalesController.updateProduct);

// Sales — static routes MUST come before :id wildcards
router.get('/sales', SalesController.getSales);
router.get('/sales/stats', SalesController.getSalesStats);
router.post('/sales', SalesController.createSale);
router.delete('/sales/:id', SalesController.deleteSale);

export default router;
