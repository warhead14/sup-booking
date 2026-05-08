import { z } from 'zod';

export const createBookingSchema = z.object({
  fullName: z.string().min(2, 'Name is required'),
  phone: z.string().min(10, 'Valid phone is required'),
  messenger: z.enum(['telegram', 'max', 'other']),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid start date format (YYYY-MM-DD)'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid end date format (YYYY-MM-DD)'),
  pickupTime: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format (HH:mm)'),
  quantity: z.number().int().min(1).max(50),
  totalPrice: z.number().optional().default(0),
  prepayment: z.number().optional().default(0),
  tgUsername: z.string().optional().default('')
}).refine(data => data.startDate <= data.endDate, {
  message: "End date cannot be earlier than start date",
  path: ["endDate"]
});

export const checkAvailabilitySchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
});

export const updateStatusSchema = z.object({
  action: z.enum(['approve', 'reject', 'cancel'])
});

export const adminCreateBookingSchema = z.object({
  fullName: z.string().optional().default(''),
  phone: z.string().optional().default(''),
  messenger: z.string().optional().default(''),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  pickupTime: z.string().regex(/^\d{2}:\d{2}$/),
  quantity: z.number().int().min(1).max(50),
  totalPrice: z.number().optional().default(0),
  prepayment: z.number().optional().default(0),
  tgUsername: z.string().optional().default('')
});

export const issueRentalSchema = z.object({
  bookingId: z.string().optional(),
  customerName: z.string().optional().default(''),
  customerPhone: z.string().optional().default(''),
  quantity: z.number().optional().default(1),
  pickupTime: z.string().optional().default(''),
  rentalDate: z.string().optional().default(''),
  expectedReturnTime: z.string().optional().default(''),
  prepayment: z.number().optional().default(0),
  paymentOnSite: z.number().optional().default(0),
  totalPrice: z.number().optional().default(0),
  penalty: z.number().optional().default(0),
  paymentMethod: z.string().optional().default(''),
  depositTypes: z.array(z.string()).optional().default([]),
  depositNote: z.string().optional().default(''),
  extraGear: z.array(z.any()).optional().default([])
}).catchall(z.any());
