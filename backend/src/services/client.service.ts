import { getDb } from '../database/db';
import { normalizePhone } from '../utils/phone';
import crypto from 'crypto';

export class ClientService {
  /**
   * Resolves an existing client by phone or creates a new one.
   * Ensures that empty/invalid phones do NOT glue clients together.
   * Does NOT overwrite the name of an existing client (per requirements).
   *
   * @param db - SQLite db instance
   * @param params - { name, phone, tgUsername }
   * @returns clientId or null
   */
  static async resolveClient(db: any, params: { name?: string, phone?: string, tgUsername?: string }): Promise<string | null> {
    const rawPhone = (params.phone || '').toString().trim();
    const rawName = (params.name || '').toString().trim();
    const rawTg = (params.tgUsername || '').toString().trim();

    const norm = normalizePhone(rawPhone);

    // 1. If valid phone, try to find existing client
    if (norm) {
      const existing = await db.get('SELECT id, name FROM clients WHERE phone_normalized = ?', [norm]);
      if (existing) {
        // Found existing client by phone!
        // Do NOT overwrite their name automatically. Update TG username if missing.
        if (rawTg) {
          await db.run(
            'UPDATE clients SET telegram_username = COALESCE(NULLIF(telegram_username, \'\'), ?) WHERE id = ?',
            [rawTg, existing.id]
          );
        }
        return existing.id;
      }
    }

    // 2. If no existing client found, but we have some info (name or phone), create new client
    if (rawName || rawPhone) {
      const clientId = crypto.randomUUID();
      // If norm is empty, give it a unique placeholder so it doesn't violate UNIQUE constraint on phone_normalized
      // and doesn't glue empty phones together.
      const finalNorm = norm || `empty-${clientId}`;

      await db.run(
        `INSERT INTO clients (id, name, phone, phone_normalized, telegram_username, note)
         VALUES (?, ?, ?, ?, ?, '')`,
        [clientId, rawName, rawPhone, finalNorm, rawTg]
      );
      return clientId;
    }

    return null;
  }
}
