import { Request, Response, NextFunction } from 'express';
import { getDb } from '../database/db';
import crypto from 'crypto';

export class DraftController {
  static async getDrafts(req: Request, res: Response, next: NextFunction) {
    try {
      const db = await getDb();
      const drafts = await db.all('SELECT * FROM drafts ORDER BY updated_at DESC');
      res.json(drafts);
    } catch (err) {
      next(err);
    }
  }

  static async saveDraft(req: Request, res: Response, next: NextFunction) {
    try {
      const { id, type, title, payload } = req.body;
      if (!type || !payload) {
        return res.status(400).json({ error: 'Type and payload are required' });
      }

      const db = await getDb();
      const draftId = id || crypto.randomUUID();
      const safeTitle = title || '';
      const payloadStr = typeof payload === 'string' ? payload : JSON.stringify(payload);

      await db.run(
        `INSERT INTO drafts (id, type, title, payload, created_at, updated_at)
         VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         ON CONFLICT(id) DO UPDATE SET
           type=excluded.type,
           title=excluded.title,
           payload=excluded.payload,
           updated_at=CURRENT_TIMESTAMP`,
        [draftId, type, safeTitle, payloadStr]
      );

      const savedDraft = await db.get('SELECT * FROM drafts WHERE id = ?', [draftId]);
      res.status(201).json({ success: true, draft: savedDraft });
    } catch (err) {
      next(err);
    }
  }

  static async deleteDraft(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const db = await getDb();
      const result = await db.run('DELETE FROM drafts WHERE id = ?', [id]);
      res.json({ success: true, changes: result.changes });
    } catch (err) {
      next(err);
    }
  }
}
