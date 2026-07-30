import express from 'express';
import cors from 'cors';
import { config } from './config/env';
import { getDb } from './database/db';
import { errorMiddleware } from './middlewares/error.middleware';
import apiRoutes from './routes/api.routes';
import adminRoutes from './routes/admin.routes';
import { NotificationService } from './services/notification.service';
import { PaymentService } from './services/payment.service';

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Routes
app.use('/api', apiRoutes);
app.use('/api/admin', adminRoutes);

// Error handling
app.use(errorMiddleware);

// Initialize DB and start server
const startServer = async () => {
  try {
    await getDb(); // touch DB to run migrations
    console.log('✅ SQLite Database initialized');
    
    app.listen(config.port, '0.0.0.0', () => {
      console.log(`✅ Server running on all interfaces`);
      console.log(`✅ Local API: http://localhost:${config.port}/api`);
      console.log(`✅ Network API: http://172.29.209.177:${config.port}/api`);
      
      // Start background jobs
      setInterval(() => {
        NotificationService.processOutbox().catch(err => console.error('[Background] processOutbox error:', err));
      }, 30 * 1000); // Every 30 seconds

      setInterval(() => {
        PaymentService.syncPaymentStatuses().catch(err => console.error('[Background] syncPaymentStatuses error:', err));
      }, 2 * 60 * 1000); // Every 2 minutes
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
};

startServer();
