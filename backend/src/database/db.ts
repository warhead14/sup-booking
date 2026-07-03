import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';
import crypto from 'crypto';
import { normalizePhone } from '../utils/phone';

let dbInstance: Database | null = null;

/**
 * Resolves the database path.
 * Priority:
 *   1. DB_PATH environment variable (absolute path)
 *   2. <backend_root>/data/database.sqlite
 *      Works regardless of whether code runs from src/ or dist/,
 *      because we walk up TWO levels from __dirname:
 *        src/database/ → src/ → backend/
 *        dist/database/ → dist/ → backend/
 */
function resolveDbPath(): string {
  if (process.env.DB_PATH) {
    return path.resolve(process.env.DB_PATH);
  }
  // __dirname is either backend/src/database or backend/dist/database
  // Two levels up always lands at backend/
  const backendRoot = path.resolve(__dirname, '..', '..');
  return path.join(backendRoot, 'data', 'database.sqlite');
}

export const getDb = async (): Promise<Database> => {
  if (dbInstance) return dbInstance;

  const dbPath = resolveDbPath();
  console.log(`[DB] Connecting to: ${dbPath}`);

  dbInstance = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  // ─── Core Tables ─────────────────────────────────────────────────────────
  await dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS bookings (
      id TEXT PRIMARY KEY,
      customer_name TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      customer_messenger TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      pickup_time TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      total_price REAL DEFAULT 0,
      prepayment REAL DEFAULT 0,
      customer_tg_username TEXT DEFAULT '',
      payment_order_id TEXT,
      payment_status TEXT DEFAULT 'pending',
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS rentals (
      id TEXT PRIMARY KEY,
      booking_id TEXT,
      customer_name TEXT DEFAULT '',
      customer_phone TEXT DEFAULT '',
      customer_tg_username TEXT DEFAULT '',
      quantity INTEGER NOT NULL DEFAULT 1,
      pickup_time TEXT DEFAULT '',
      rental_date TEXT NOT NULL,
      expected_return_time TEXT DEFAULT '',
      prepayment REAL DEFAULT 0,
      payment_on_site REAL DEFAULT 0,
      total_price REAL DEFAULT 0,
      penalty REAL DEFAULT 0,
      payment_method TEXT DEFAULT '',
      deposit_types TEXT DEFAULT '[]',
      deposit_note TEXT DEFAULT '',
      extra_gear TEXT DEFAULT '[]',
      status TEXT DEFAULT 'on_water',
      returned_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (booking_id) REFERENCES bookings(id)
    );

    CREATE TABLE IF NOT EXISTS clients (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL DEFAULT '',
      phone TEXT NOT NULL DEFAULT '',
      phone_normalized TEXT NOT NULL UNIQUE,
      telegram_username TEXT DEFAULT '',
      note TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      default_price REAL NOT NULL DEFAULT 0,
      default_cost_price REAL NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sales (
      id TEXT PRIMARY KEY,
      client_id TEXT REFERENCES clients(id),
      total_revenue REAL NOT NULL DEFAULT 0,
      total_profit REAL NOT NULL DEFAULT 0,
      payment_method TEXT NOT NULL DEFAULT 'cash',
      note TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sale_items (
      id TEXT PRIMARY KEY,
      sale_id TEXT NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
      product_id TEXT REFERENCES products(id),
      product_name_snapshot TEXT NOT NULL,
      sell_price_snapshot REAL NOT NULL,
      cost_price_snapshot REAL NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS drafts (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      title TEXT DEFAULT '',
      payload TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // ─── Migrations: bookings ─────────────────────────────────────────────────
  const pragmaBookings = await dbInstance.all("PRAGMA table_info(bookings)");
  const bookingCols = pragmaBookings.map((r: any) => r.name);

  if (!bookingCols.includes('total_price')) {
    await dbInstance.run("ALTER TABLE bookings ADD COLUMN total_price REAL DEFAULT 0");
  }
  if (!bookingCols.includes('prepayment')) {
    await dbInstance.run("ALTER TABLE bookings ADD COLUMN prepayment REAL DEFAULT 0");
  }
  if (!bookingCols.includes('customer_tg_username')) {
    await dbInstance.run("ALTER TABLE bookings ADD COLUMN customer_tg_username TEXT DEFAULT ''");
  }
  if (!bookingCols.includes('client_id')) {
    await dbInstance.run("ALTER TABLE bookings ADD COLUMN client_id TEXT REFERENCES clients(id)");
  }
  if (!bookingCols.includes('payment_order_id')) {
    await dbInstance.run("ALTER TABLE bookings ADD COLUMN payment_order_id TEXT");
  }
  if (!bookingCols.includes('payment_status')) {
    await dbInstance.run("ALTER TABLE bookings ADD COLUMN payment_status TEXT DEFAULT 'pending'");
  }
  if (!bookingCols.includes('note')) {
    await dbInstance.run("ALTER TABLE bookings ADD COLUMN note TEXT DEFAULT ''");
  }

  // ─── Migrations: rentals ──────────────────────────────────────────────────
  const pragmaRentals = await dbInstance.all("PRAGMA table_info(rentals)");
  const rentalCols = pragmaRentals.map((r: any) => r.name);

  if (!rentalCols.includes('total_price')) {
    await dbInstance.run("ALTER TABLE rentals ADD COLUMN total_price REAL DEFAULT 0");
  }
  if (!rentalCols.includes('penalty')) {
    await dbInstance.run("ALTER TABLE rentals ADD COLUMN penalty REAL DEFAULT 0");
  }
  if (!rentalCols.includes('end_date')) {
    await dbInstance.run("ALTER TABLE rentals ADD COLUMN end_date TEXT");
    await dbInstance.run("UPDATE rentals SET end_date = rental_date WHERE end_date IS NULL");
  }
  if (!rentalCols.includes('prepayment')) {
    await dbInstance.run("ALTER TABLE rentals ADD COLUMN prepayment REAL DEFAULT 0");
  }
  if (!rentalCols.includes('payment_on_site')) {
    await dbInstance.run("ALTER TABLE rentals ADD COLUMN payment_on_site REAL DEFAULT 0");
  }
  if (!rentalCols.includes('payment_method')) {
    await dbInstance.run("ALTER TABLE rentals ADD COLUMN payment_method TEXT DEFAULT ''");
  }
  if (!rentalCols.includes('deposit_types')) {
    await dbInstance.run("ALTER TABLE rentals ADD COLUMN deposit_types TEXT DEFAULT '[]'");
  }
  if (!rentalCols.includes('deposit_note')) {
    await dbInstance.run("ALTER TABLE rentals ADD COLUMN deposit_note TEXT DEFAULT ''");
  }
  if (!rentalCols.includes('extra_gear')) {
    await dbInstance.run("ALTER TABLE rentals ADD COLUMN extra_gear TEXT DEFAULT '[]'");
  }
  if (!rentalCols.includes('customer_tg_username')) {
    await dbInstance.run("ALTER TABLE rentals ADD COLUMN customer_tg_username TEXT DEFAULT ''");
  }
  if (!rentalCols.includes('client_id')) {
    await dbInstance.run("ALTER TABLE rentals ADD COLUMN client_id TEXT REFERENCES clients(id)");
  }
  // Stage 1: per-rental note (distinct from client.note)
  if (!rentalCols.includes('note')) {
    await dbInstance.run("ALTER TABLE rentals ADD COLUMN note TEXT DEFAULT ''");
  }

  // ─── Data Migration: populate clients from rentals ───────────────────────
  await migrateClientsFromRentals(dbInstance);

  return dbInstance;
};

/**
 * Idempotent migration: reads all rentals, builds unique clients by
 * phone_normalized, inserts missing ones into the clients table,
 * and backfills client_id on rentals and bookings.
 *
 * Safe to run multiple times — uses INSERT OR IGNORE + UPDATE WHERE client_id IS NULL.
 */
async function migrateClientsFromRentals(db: Database): Promise<void> {
  // Fetch all rentals that haven't been linked to a client yet
  const rentals = await db.all(`
    SELECT id, customer_name, customer_phone, customer_tg_username, rental_date, created_at
    FROM rentals
    WHERE customer_phone != ''
    ORDER BY created_at ASC
  `);

  if (rentals.length === 0) return;

  // Build a map: phone_normalized → best client data (latest name/tg wins)
  const clientMap = new Map<string, {
    phone: string;
    name: string;
    tgUsername: string;
  }>();

  for (const r of rentals) {
    const norm = normalizePhone(r.customer_phone);
    if (!norm) continue;

    const existing = clientMap.get(norm);
    if (!existing) {
      clientMap.set(norm, {
        phone: r.customer_phone,
        name: r.customer_name || '',
        tgUsername: r.customer_tg_username || '',
      });
    } else {
      // Always use the latest (most recent) name and tg if present
      if (r.customer_name) existing.name = r.customer_name;
      if (r.customer_tg_username) existing.tgUsername = r.customer_tg_username;
    }
  }

  // Insert clients — INSERT OR IGNORE ensures no duplicates
  for (const [norm, data] of clientMap.entries()) {
    await db.run(
      `INSERT OR IGNORE INTO clients (id, name, phone, phone_normalized, telegram_username, note, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, '', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [crypto.randomUUID(), data.name, data.phone, norm, data.tgUsername]
    );
  }

  // Backfill client_id on rentals WHERE client_id IS NULL
  await db.run(`
    UPDATE rentals
    SET client_id = (
      SELECT c.id FROM clients c
      WHERE c.phone_normalized = (
        CASE
          WHEN length(replace(customer_phone, '+', '')) >= 11
            AND substr(replace(replace(replace(replace(customer_phone,'(',''),')',''),' ',''),'-',''), 1, 1) IN ('7','8')
          THEN '7' || substr(replace(replace(replace(replace(replace(customer_phone,'+',''),'(',''),')',''),' ',''),'-',''), 2)
          WHEN length(replace(replace(replace(replace(replace(customer_phone,'+',''),'(',''),')',''),' ',''),'-','')) = 10
          THEN '7' || replace(replace(replace(replace(replace(customer_phone,'+',''),'(',''),')',''),' ',''),'-','')
          ELSE replace(replace(replace(replace(replace(customer_phone,'+',''),'(',''),')',''),' ',''),'-','')
        END
      )
      LIMIT 1
    )
    WHERE client_id IS NULL AND customer_phone != ''
  `);

  // Backfill client_id on bookings WHERE client_id IS NULL
  await db.run(`
    UPDATE bookings
    SET client_id = (
      SELECT c.id FROM clients c
      WHERE c.phone_normalized = (
        CASE
          WHEN length(replace(customer_phone, '+', '')) >= 11
            AND substr(replace(replace(replace(replace(customer_phone,'(',''),')',''),' ',''),'-',''), 1, 1) IN ('7','8')
          THEN '7' || substr(replace(replace(replace(replace(replace(customer_phone,'+',''),'(',''),')',''),' ',''),'-',''), 2)
          WHEN length(replace(replace(replace(replace(replace(customer_phone,'+',''),'(',''),')',''),' ',''),'-','')) = 10
          THEN '7' || replace(replace(replace(replace(replace(customer_phone,'+',''),'(',''),')',''),' ',''),'-','')
          ELSE replace(replace(replace(replace(replace(customer_phone,'+',''),'(',''),')',''),' ',''),'-','')
        END
      )
      LIMIT 1
    )
    WHERE client_id IS NULL AND customer_phone != ''
  `);
}
