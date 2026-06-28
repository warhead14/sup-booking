import { Request, Response, NextFunction } from 'express';
import { getDb } from '../database/db';
import { normalizePhone } from '../utils/phone';
import crypto from 'crypto';
import { ClientService } from '../services/client.service';

export class SalesController {

  // ── Products ──────────────────────────────────────────────────────────────

  static async getProducts(req: Request, res: Response, next: NextFunction) {
    try {
      const db = await getDb();
      const products = await db.all(
        'SELECT * FROM products WHERE is_active = 1 ORDER BY sort_order ASC, name ASC'
      );
      res.json(products);
    } catch (err) { next(err); }
  }

  static async createProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, default_price, default_cost_price } = req.body as {
        name: string;
        default_price: number;
        default_cost_price: number;
      };
      if (!name?.trim()) {
        return res.status(400).json({ error: 'Название обязательно' });
      }
      const db = await getDb();
      const id = crypto.randomUUID();
      const maxOrder = await db.get('SELECT COALESCE(MAX(sort_order), 0) as m FROM products');
      await db.run(
        `INSERT INTO products (id, name, default_price, default_cost_price, sort_order)
         VALUES (?, ?, ?, ?, ?)`,
        [id, name.trim(), Number(default_price) || 0, Number(default_cost_price) || 0, (maxOrder?.m ?? 0) + 1]
      );
      const product = await db.get('SELECT * FROM products WHERE id = ?', [id]);
      res.status(201).json(product);
    } catch (err) { next(err); }
  }

  static async updateProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { name, default_price, default_cost_price, is_active } = req.body as {
        name?: string;
        default_price?: number;
        default_cost_price?: number;
        is_active?: number;
      };
      const db = await getDb();
      await db.run(
        `UPDATE products
         SET name = COALESCE(?, name),
             default_price = COALESCE(?, default_price),
             default_cost_price = COALESCE(?, default_cost_price),
             is_active = COALESCE(?, is_active),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [name?.trim() ?? null, default_price ?? null, default_cost_price ?? null, is_active ?? null, id]
      );
      const product = await db.get('SELECT * FROM products WHERE id = ?', [id]);
      if (!product) return res.status(404).json({ error: 'Product not found' });
      res.json(product);
    } catch (err) { next(err); }
  }

  // ── Sales ─────────────────────────────────────────────────────────────────

  static async getSales(req: Request, res: Response, next: NextFunction) {
    try {
      const db = await getDb();
      const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };

      let dateFilter = '';
      const params: any[] = [];
      if (startDate) { dateFilter += ' AND date(s.created_at) >= ?'; params.push(startDate); }
      if (endDate)   { dateFilter += ' AND date(s.created_at) <= ?'; params.push(endDate); }

      const sales = await db.all(
        `SELECT s.*, c.name as client_name, c.phone as client_phone
         FROM sales s
         LEFT JOIN clients c ON c.id = s.client_id
         WHERE 1=1 ${dateFilter}
         ORDER BY s.created_at DESC`,
        params
      );

      // Attach items to each sale
      const saleIds = sales.map((s: any) => s.id);
      let items: any[] = [];
      if (saleIds.length > 0) {
        items = await db.all(
          `SELECT * FROM sale_items WHERE sale_id IN (${saleIds.map(() => '?').join(',')})`,
          saleIds
        );
      }

      const itemsBySaleId = new Map<string, any[]>();
      for (const item of items) {
        if (!itemsBySaleId.has(item.sale_id)) itemsBySaleId.set(item.sale_id, []);
        itemsBySaleId.get(item.sale_id)!.push(item);
      }

      const result = sales.map((s: any) => ({
        ...s,
        items: itemsBySaleId.get(s.id) || [],
      }));

      res.json(result);
    } catch (err) { next(err); }
  }

  static async createSale(req: Request, res: Response, next: NextFunction) {
    try {
      const { clientId, clientName, clientPhone, paymentMethod, note, items } = req.body as {
        clientId?: string;
        clientName?: string;
        clientPhone?: string;
        paymentMethod: string;
        note?: string;
        items: Array<{
          productId?: string;
          productName: string;
          sellPrice: number;
          costPrice: number;
          quantity: number;
        }>;
      };

      if (!items || items.length === 0) {
        return res.status(400).json({ error: 'Необходимо добавить хотя бы один товар' });
      }

      const db = await getDb();

      // Resolve or create client
      let resolvedClientId: string | null = clientId || null;

      if (!resolvedClientId && clientPhone) {
        resolvedClientId = await ClientService.resolveClient(db, {
          name: clientName,
          phone: clientPhone
        });
      }

      // Calculate totals
      let totalRevenue = 0;
      let totalProfit = 0;
      for (const item of items) {
        const qty = Number(item.quantity) || 1;
        const sell = Number(item.sellPrice) || 0;
        const cost = Number(item.costPrice) || 0;
        totalRevenue += sell * qty;
        totalProfit  += (sell - cost) * qty;
      }

      const saleId = crypto.randomUUID();
      await db.run(
        `INSERT INTO sales (id, client_id, total_revenue, total_profit, payment_method, note)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [saleId, resolvedClientId, totalRevenue, totalProfit, paymentMethod || 'cash', note || '']
      );

      // Insert items with snapshots
      for (const item of items) {
        const qty = Number(item.quantity) || 1;
        const sell = Number(item.sellPrice) || 0;
        const cost = Number(item.costPrice) || 0;
        await db.run(
          `INSERT INTO sale_items (id, sale_id, product_id, product_name_snapshot, sell_price_snapshot, cost_price_snapshot, quantity)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [crypto.randomUUID(), saleId, item.productId || null, item.productName, sell, cost, qty]
        );
      }

      const sale = await db.get(
        `SELECT s.*, c.name as client_name, c.phone as client_phone
         FROM sales s LEFT JOIN clients c ON c.id = s.client_id
         WHERE s.id = ?`, [saleId]
      );
      const saleItems = await db.all('SELECT * FROM sale_items WHERE sale_id = ?', [saleId]);

      res.status(201).json({ ...sale, items: saleItems });
    } catch (err) { next(err); }
  }

  static async deleteSale(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const db = await getDb();
      await db.run('DELETE FROM sale_items WHERE sale_id = ?', [id]);
      await db.run('DELETE FROM sales WHERE id = ?', [id]);
      res.json({ success: true });
    } catch (err) { next(err); }
  }

  static async getSalesStats(req: Request, res: Response, next: NextFunction) {
    try {
      const db = await getDb();
      const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };

      let dateFilter = '';
      const params: any[] = [];
      if (startDate) { dateFilter += ' AND date(s.created_at) >= ?'; params.push(startDate); }
      if (endDate)   { dateFilter += ' AND date(s.created_at) <= ?'; params.push(endDate); }

      // Totals
      const totals = await db.get(
        `SELECT
           COUNT(*) as sale_count,
           COALESCE(SUM(total_revenue), 0) as total_revenue,
           COALESCE(SUM(total_profit), 0) as total_profit
         FROM sales s WHERE 1=1 ${dateFilter}`,
        params
      );

      // Top products (by revenue)
      const topProducts = await db.all(
        `SELECT
           si.product_name_snapshot as name,
           SUM(si.quantity) as total_qty,
           SUM(si.sell_price_snapshot * si.quantity) as revenue,
           SUM((si.sell_price_snapshot - si.cost_price_snapshot) * si.quantity) as profit
         FROM sale_items si
         JOIN sales s ON s.id = si.sale_id
         WHERE 1=1 ${dateFilter}
         GROUP BY si.product_name_snapshot
         ORDER BY revenue DESC
         LIMIT 10`,
        params
      );

      // By payment method
      const byPayment = await db.all(
        `SELECT payment_method, COUNT(*) as count, SUM(total_revenue) as revenue
         FROM sales s WHERE 1=1 ${dateFilter}
         GROUP BY payment_method`,
        params
      );

      res.json({ totals, topProducts, byPayment });
    } catch (err) { next(err); }
  }
}
