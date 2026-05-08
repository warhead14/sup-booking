/**
 * One-shot migration script — run with: npx tsx src/database/migrate.ts
 * Uses the same DB_PATH resolution as db.ts:
 *   1. DB_PATH env variable (absolute path)
 *   2. <backend_root>/data/database.sqlite
 */
import 'dotenv/config';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import crypto from 'crypto';
import { normalizePhone } from '../utils/phone';

function resolveDbPath(): string {
  if (process.env.DB_PATH) return path.resolve(process.env.DB_PATH);
  const backendRoot = path.resolve(__dirname, '..', '..');
  return path.join(backendRoot, 'data', 'database.sqlite');
}

const DB_PATH = resolveDbPath();

async function main() {
  console.log('Opening database:', DB_PATH);

  const db = await open({
    filename: DB_PATH,
    driver: sqlite3.Database,
  });

  // ── 1. Create clients table if not exists ────────────────────────────────
  await db.exec(`
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
  `);
  console.log('✅  clients table ready');

  // ── 2. Add client_id to rentals if missing ───────────────────────────────
  const rentalCols = (await db.all("PRAGMA table_info(rentals)")).map((r: any) => r.name);
  if (!rentalCols.includes('client_id')) {
    await db.run("ALTER TABLE rentals ADD COLUMN client_id TEXT REFERENCES clients(id)");
    console.log('✅  rentals.client_id added');
  } else {
    console.log('ℹ️   rentals.client_id already exists');
  }
  if (!rentalCols.includes('note')) {
    await db.run("ALTER TABLE rentals ADD COLUMN note TEXT DEFAULT ''");
    console.log('✅  rentals.note added');
  } else {
    console.log('ℹ️   rentals.note already exists');
  }

  // ── 3. Add client_id to bookings if missing ──────────────────────────────
  const bookingCols = (await db.all("PRAGMA table_info(bookings)")).map((r: any) => r.name);
  if (!bookingCols.includes('client_id')) {
    await db.run("ALTER TABLE bookings ADD COLUMN client_id TEXT REFERENCES clients(id)");
    console.log('✅  bookings.client_id added');
  } else {
    console.log('ℹ️   bookings.client_id already exists');
  }

  // ── 4. Gather unique clients from rentals ────────────────────────────────
  const rentals = await db.all(`
    SELECT customer_name, customer_phone, customer_tg_username, rental_date
    FROM rentals
    WHERE customer_phone != ''
    ORDER BY created_at ASC
  `);
  console.log(`\nFound ${rentals.length} rental(s) to process`);

  const clientMap = new Map<string, { phone: string; name: string; tg: string }>();
  for (const r of rentals) {
    const norm = normalizePhone(r.customer_phone);
    if (!norm) continue;
    if (!clientMap.has(norm)) {
      clientMap.set(norm, { phone: r.customer_phone, name: r.customer_name || '', tg: r.customer_tg_username || '' });
    } else {
      const ex = clientMap.get(norm)!;
      if (r.customer_name) ex.name = r.customer_name;
      if (r.customer_tg_username) ex.tg = r.customer_tg_username;
    }
  }
  console.log(`Unique clients by phone: ${clientMap.size}`);

  // ── 5. Insert clients (INSERT OR IGNORE = idempotent) ────────────────────
  let inserted = 0;
  for (const [norm, data] of clientMap.entries()) {
    const result = await db.run(
      `INSERT OR IGNORE INTO clients (id, name, phone, phone_normalized, telegram_username, note)
       VALUES (?, ?, ?, ?, ?, '')`,
      [crypto.randomUUID(), data.name, data.phone, norm, data.tg]
    );
    if (result.changes) inserted++;
  }
  console.log(`✅  Inserted ${inserted} new client(s) (skipped existing)`);

  // ── 6. Backfill client_id on rentals ────────────────────────────────────
  const rentalRows = await db.all(
    "SELECT id, customer_phone FROM rentals WHERE client_id IS NULL AND customer_phone != ''"
  );
  let rentalLinked = 0;
  for (const r of rentalRows) {
    const norm = normalizePhone(r.customer_phone);
    const client = await db.get("SELECT id FROM clients WHERE phone_normalized = ?", [norm]);
    if (client) {
      await db.run("UPDATE rentals SET client_id = ? WHERE id = ?", [client.id, r.id]);
      rentalLinked++;
    }
  }
  console.log(`✅  Linked ${rentalLinked} rental(s) to clients`);

  // ── 7. Backfill client_id on bookings ────────────────────────────────────
  const bookingRows = await db.all(
    "SELECT id, customer_phone FROM bookings WHERE client_id IS NULL AND customer_phone != ''"
  );
  let bookingLinked = 0;
  for (const r of bookingRows) {
    const norm = normalizePhone(r.customer_phone);
    const client = await db.get("SELECT id FROM clients WHERE phone_normalized = ?", [norm]);
    if (client) {
      await db.run("UPDATE bookings SET client_id = ? WHERE id = ?", [client.id, r.id]);
      bookingLinked++;
    }
  }
  console.log(`✅  Linked ${bookingLinked} booking(s) to clients`);

  // ── 8. Verification report ───────────────────────────────────────────────
  const totalClients = await db.get("SELECT COUNT(*) as cnt FROM clients");
  const linkedRentals = await db.get("SELECT COUNT(*) as cnt FROM rentals WHERE client_id IS NOT NULL");
  const totalRentals = await db.get("SELECT COUNT(*) as cnt FROM rentals");
  const linkedBookings = await db.get("SELECT COUNT(*) as cnt FROM bookings WHERE client_id IS NOT NULL");
  const totalBookings = await db.get("SELECT COUNT(*) as cnt FROM bookings");
  const dupes = await db.get(
    "SELECT COUNT(*) as cnt FROM (SELECT phone_normalized, COUNT(*) c FROM clients GROUP BY phone_normalized HAVING c > 1)"
  );
  const samples = await db.all(
    "SELECT name, phone, phone_normalized, telegram_username FROM clients LIMIT 5"
  );

  console.log('\n══ РЕЗУЛЬТАТ МИГРАЦИИ ══════════════════════════════');
  console.log(`Клиентов создано:    ${totalClients.cnt}`);
  console.log(`Аренд привязано:     ${linkedRentals.cnt} / ${totalRentals.cnt}`);
  console.log(`Броней привязано:    ${linkedBookings.cnt} / ${totalBookings.cnt}`);
  console.log(`Дублей (phone_norm): ${dupes.cnt}`);
  console.log('\nПримеры клиентов:');
  for (const c of samples) {
    console.log(`  ${c.name || '(без имени)'} | ${c.phone} → ${c.phone_normalized} ${c.telegram_username ? '| @' + c.telegram_username : ''}`);
  }
  console.log('════════════════════════════════════════════════════');

  await db.close();
}

main().catch((e) => {
  console.error('MIGRATION ERROR:', e.message);
  process.exit(1);
});
