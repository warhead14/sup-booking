import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { apiClient } from '../../api/apiClient';
import { normalizePhone } from '../../utils/phone';
import { PhoneInput } from '../../components/PhoneInput';
import { Plus, Trash2, ChevronDown, ChevronUp, X, Check, ShoppingBag, TrendingUp, BarChart2, User, UserPlus } from 'lucide-react';

type Product = { id: string; name: string; default_price: number; default_cost_price: number };
type Client = { id: string; name: string; phone: string };

type SaleItem = {
  product_name_snapshot: string;
  sell_price_snapshot: number;
  cost_price_snapshot: number;
  quantity: number;
};

type Sale = {
  id: string;
  client_id: string | null;
  client_name: string | null;
  client_phone: string | null;
  total_revenue: number;
  total_profit: number;
  payment_method: string;
  note: string;
  created_at: string;
  items: SaleItem[];
};

type Props = { password: string };

const fmt = (n: number) => n.toLocaleString('ru', { maximumFractionDigits: 0 }) + ' ₽';
const PAYMENT_LABELS: Record<string, string> = { cash: 'Наличные', card: 'Карта', transfer: 'Перевод' };

// ── New Sale Line Item ────────────────────────────────────────────────────────
type LineItem = {
  key: number;
  productId: string;
  productName: string;
  sellPrice: string;
  costPrice: string;
  quantity: string;
};

let lineKey = 0;
const makeLine = (p?: Product): LineItem => ({
  key: ++lineKey,
  productId: p?.id || '',
  productName: p?.name || '',
  sellPrice: p ? String(p.default_price) : '',
  costPrice: p ? String(p.default_cost_price) : '',
  quantity: '1',
});

// ── Sale Card ─────────────────────────────────────────────────────────────────
const SaleCard: React.FC<{ sale: Sale; onDelete: (id: string) => void }> = ({ sale, onDelete }) => {
  const [expanded, setExpanded] = useState(false);
  const date = new Date(sale.created_at).toLocaleDateString('ru', { day: 'numeric', month: 'short' });
  const time = new Date(sale.created_at).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
      <button onClick={() => setExpanded(v => !v)} className="w-full p-4 flex items-start gap-3 text-left active:bg-gray-50 transition-colors">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="font-semibold text-sm text-gray-800">{sale.client_name || 'Клиент не указан'}</span>
            {sale.client_phone && <span className="text-[10px] text-gray-400">{sale.client_phone}</span>}
          </div>
          <div className="text-xs text-gray-400">
            {date} · {time} · {PAYMENT_LABELS[sale.payment_method] || sale.payment_method}
          </div>
          <div className="text-[10px] text-gray-400 mt-0.5">
            {sale.items.length} {sale.items.length === 1 ? 'позиция' : sale.items.length < 5 ? 'позиции' : 'позиций'}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="font-bold text-sm text-gray-800">{fmt(sale.total_revenue)}</div>
          <div className="text-[10px] text-green-500 font-medium">+{fmt(sale.total_profit)}</div>
        </div>
        {expanded ? <ChevronUp size={16} className="text-gray-300 self-center" /> : <ChevronDown size={16} className="text-gray-300 self-center" />}
      </button>

      {expanded && (
        <div className="border-t px-4 pb-4 pt-3 flex flex-col gap-2 bg-gray-50/30">
          {sale.items.map((item, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <div className="flex-1 text-gray-700">{item.product_name_snapshot}</div>
              <div className="text-xs text-gray-400">×{item.quantity}</div>
              <div className="text-sm font-medium">{fmt(item.sell_price_snapshot * item.quantity)}</div>
            </div>
          ))}
          {sale.note && <div className="text-xs text-gray-400 italic pt-1">{sale.note}</div>}
          <div className="flex justify-end pt-1">
            <button
              onClick={(e) => { e.stopPropagation(); if (window.confirm('Удалить продажу?')) onDelete(sale.id); }}
              className="text-red-400 hover:text-red-600 p-1.5 border border-red-100 rounded-lg bg-white"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Stats Block ───────────────────────────────────────────────────────────────
const StatsBlock: React.FC<{ password: string }> = ({ password }) => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.getSalesStats(password).then(s => { setStats(s); setLoading(false); }).catch(() => setLoading(false));
  }, [password]);

  if (loading) return <div className="text-center text-gray-400 py-4 text-sm">Загрузка статистики...</div>;
  if (!stats) return null;

  const { totals, topProducts } = stats;

  return (
    <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-top-1 duration-300">
      <div className="flex items-center gap-2 text-gray-500 font-semibold text-sm px-1">
        <BarChart2 size={15} /> Статистика продаж
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-white rounded-xl border shadow-sm p-3 text-center">
          <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5 font-bold">Продаж</div>
          <div className="text-xl font-bold text-gray-800">{totals.sale_count}</div>
        </div>
        <div className="bg-white rounded-xl border shadow-sm p-3 text-center">
          <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5 font-bold">Выручка</div>
          <div className="text-base font-bold text-teal-600">{fmt(totals.total_revenue)}</div>
        </div>
        <div className="bg-white rounded-xl border shadow-sm p-3 text-center">
          <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5 font-bold">Прибыль</div>
          <div className="text-base font-bold text-green-500">{fmt(totals.total_profit)}</div>
        </div>
      </div>

      {topProducts && topProducts.length > 0 && (
        <div className="bg-white rounded-xl border shadow-sm p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 mb-3">
            <TrendingUp size={13} /> Топ товаров
          </div>
          <div className="flex flex-col gap-2">
            {topProducts.map((p: any, i: number) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <span className="text-gray-300 font-bold w-4 text-center">{i + 1}</span>
                <span className="flex-1 text-gray-700 truncate">{p.name}</span>
                <span className="text-xs text-gray-400">×{p.total_qty}</span>
                <span className="font-medium text-gray-800">{fmt(p.revenue)}</span>
                <span className="text-[10px] text-green-500">+{fmt(p.profit)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ── New Sale Modal ────────────────────────────────────────────────────────────
const NewSaleModal: React.FC<{
  password: string;
  products: Product[];
  clients: Client[];
  onClose: () => void;
  onSaved: () => void;
}> = ({ password, products, clients, onClose, onSaved }) => {
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [lines, setLines] = useState<LineItem[]>([makeLine()]);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Auto-lookup client by phone
  const existingClient = useMemo(() => {
    const norm = normalizePhone(clientPhone);
    if (!norm || norm.length < 7) return null;
    return clients.find(c => normalizePhone(c.phone) === norm) || null;
  }, [clientPhone, clients]);

  // If client found, auto-fill name if name is empty
  useEffect(() => {
    if (existingClient && !clientName) {
      setClientName(existingClient.name);
    }
  }, [existingClient]);

  const addLine = () => setLines(ls => [...ls, makeLine()]);

  const removeLine = (key: number) => setLines(ls => ls.filter(l => l.key !== key));

  const updateLine = (key: number, field: keyof LineItem, value: string) => {
    setLines(ls => ls.map(l => {
      if (l.key !== key) return l;
      if (field === 'productId') {
        const p = products.find(p => p.id === value);
        return p
          ? { ...l, productId: p.id, productName: p.name, sellPrice: String(p.default_price), costPrice: String(p.default_cost_price) }
          : { ...l, productId: '', productName: value };
      }
      return { ...l, [field]: value };
    }));
  };

  const totalRevenue = lines.reduce((s, l) => s + (parseFloat(l.sellPrice) || 0) * (parseInt(l.quantity) || 1), 0);
  const totalProfit  = lines.reduce((s, l) => s + ((parseFloat(l.sellPrice) || 0) - (parseFloat(l.costPrice) || 0)) * (parseInt(l.quantity) || 1), 0);

  const handleSave = async () => {
    const validLines = lines.filter(l => l.productName.trim() && parseFloat(l.sellPrice) >= 0);
    if (!validLines.length) { setError('Добавьте хотя бы один товар'); return; }
    
    setSaving(true);
    setError('');
    try {
      await apiClient.createSale(password, {
        clientId: existingClient?.id,
        clientName: clientName.trim() || undefined,
        clientPhone: clientPhone.trim() || undefined,
        paymentMethod,
        note,
        items: validLines.map(l => ({
          productId: l.productId || undefined,
          productName: l.productName.trim(),
          sellPrice: parseFloat(l.sellPrice) || 0,
          costPrice: parseFloat(l.costPrice) || 0,
          quantity: parseInt(l.quantity) || 1,
        })),
      });
      onSaved();
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[92vh] flex flex-col animate-in slide-in-from-bottom-4 duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b shrink-0">
          <div className="font-bold text-base flex items-center gap-2">
            <ShoppingBag size={18} className="text-teal-600" /> Новая продажа
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 active:bg-gray-100 rounded-lg transition-colors"><X size={20} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
          {error && <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm border border-red-100">{error}</div>}

          {/* Client fields */}
          <div className="bg-gray-50/50 p-4 rounded-2xl border border-gray-100 flex flex-col gap-3">
            <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
              {existingClient ? <User size={14} className="text-teal-500" /> : <UserPlus size={14} />}
              Клиент {existingClient && <span className="text-teal-600 ml-1">назван в базе</span>}
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Имя Фамилия"
                  value={clientName}
                  onChange={e => setClientName(e.target.value)}
                  className="w-full h-11 pl-10 pr-3 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:border-teal-500 transition-colors"
                />
              </div>
              <div className="relative">
                <PhoneInput 
                  label="Телефон" 
                  value={clientPhone} 
                  onChange={setClientPhone} 
                  className={existingClient ? 'border-teal-200' : ''}
                />
              </div>
            </div>
            
            {existingClient && (
              <div className="flex items-center gap-2 text-[10px] text-teal-600 font-medium px-1">
                <Check size={10} /> Клиент найден! История будет объединена.
              </div>
            )}
          </div>

          {/* Line items */}
          <div className="flex flex-col gap-2">
            <div className="text-xs font-bold text-gray-400 uppercase tracking-wider px-1">Товары</div>
            <div className="flex flex-col gap-2">
              {lines.map(line => (
                <div key={line.key} className="bg-white border border-gray-100 rounded-2xl p-3 shadow-sm flex flex-col gap-2">
                  <div className="flex gap-2">
                    <select
                      value={line.productId}
                      onChange={e => updateLine(line.key, 'productId', e.target.value)}
                      className="flex-1 h-10 px-2 border border-gray-200 rounded-xl text-sm bg-gray-50/50 outline-none focus:border-teal-500 transition-colors cursor-pointer"
                    >
                      <option value="">— выбрать товар —</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                    {lines.length > 1 && (
                      <button onClick={() => removeLine(line.key)} className="p-2 text-gray-300 hover:text-red-400 transition-colors">
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                  {!line.productId && (
                    <input
                      type="text"
                      placeholder="Или введите название товара..."
                      value={line.productName}
                      onChange={e => setLines(ls => ls.map(l => l.key === line.key ? { ...l, productName: e.target.value } : l))}
                      className="w-full h-10 px-3 border border-gray-200 rounded-xl text-sm bg-white outline-none focus:border-teal-500 transition-colors"
                    />
                  )}
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <div className="text-[9px] font-bold text-gray-400 mb-0.5 uppercase ml-1">Цена ₽</div>
                      <input
                        type="number" step="100" inputMode="decimal"
                        value={line.sellPrice}
                        onChange={e => updateLine(line.key, 'sellPrice', e.target.value)}
                        className="w-full h-9 px-2 border border-gray-200 rounded-lg text-sm bg-white outline-none focus:border-teal-500"
                      />
                    </div>
                    <div>
                      <div className="text-[9px] font-bold text-gray-400 mb-0.5 uppercase ml-1">Закуп ₽</div>
                      <input
                        type="number" step="100" inputMode="decimal"
                        value={line.costPrice}
                        onChange={e => updateLine(line.key, 'costPrice', e.target.value)}
                        className="w-full h-9 px-2 border border-gray-200 rounded-lg text-sm bg-white outline-none focus:border-teal-500"
                      />
                    </div>
                    <div>
                      <div className="text-[9px] font-bold text-gray-400 mb-0.5 uppercase ml-1">Кол-во</div>
                      <input
                        type="number" inputMode="numeric" min="1"
                        value={line.quantity}
                        onChange={e => updateLine(line.key, 'quantity', e.target.value)}
                        className="w-full h-9 px-2 border border-gray-200 rounded-lg text-sm bg-white outline-none focus:border-teal-500"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={addLine}
              className="mt-1 w-full py-3 border-2 border-dashed border-gray-100 rounded-2xl text-sm text-gray-400 hover:border-teal-200 hover:text-teal-600 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
            >
              <Plus size={16} /> Добавить позицию
            </button>
          </div>

          {/* Payment method */}
          <div>
            <div className="text-xs font-bold text-gray-400 uppercase tracking-wider px-1 mb-2">Оплата</div>
            <div className="flex gap-2">
              {Object.entries(PAYMENT_LABELS).map(([k, v]) => (
                <button
                  key={k}
                  onClick={() => setPaymentMethod(k)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-bold border transition-all ${paymentMethod === k ? 'bg-teal-600 text-white border-teal-600 shadow-md shadow-teal-100' : 'bg-white text-gray-600 border-gray-200 hover:border-teal-200'}`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          {/* Note */}
          <div className="mb-2">
            <div className="text-xs font-bold text-gray-400 uppercase tracking-wider px-1 mb-1">Заметка</div>
            <textarea
              rows={2}
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Комментарий..."
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-teal-500 resize-none bg-gray-50/30 transition-colors"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="border-t p-4 shrink-0 bg-gray-50/50 flex items-center gap-4">
          <div className="flex-1">
            <div className="text-sm font-black text-gray-900 leading-tight">{fmt(totalRevenue)}</div>
            <div className="text-[10px] text-green-600 font-bold flex items-center gap-1">
              <TrendingUp size={10} /> Прибыль {fmt(totalProfit)}
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-8 py-3.5 bg-teal-600 text-white font-black text-sm rounded-2xl disabled:opacity-50 flex items-center gap-2 active:scale-95 transition-all shadow-lg shadow-teal-100"
          >
            <Check size={20} /> {saving ? 'Оформление...' : 'Оформить'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── SalesTab ──────────────────────────────────────────────────────────────────
export const SalesTab: React.FC<Props> = ({ password }) => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [activeView, setActiveView] = useState<'history' | 'stats'>('history');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, p, c] = await Promise.all([
        apiClient.getSales(password),
        apiClient.getProducts(password),
        apiClient.getClients(password),
      ]);
      setSales(s);
      setProducts(p);
      setClients(c);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [password]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id: string) => {
    try {
      await apiClient.deleteSale(password, id);
      setSales(s => s.filter(sale => sale.id !== id));
    } catch (e: any) {
      alert('Ошибка: ' + e.message);
    }
  };

  return (
    <div className="flex flex-col gap-3 animate-in fade-in duration-500">
      {/* Sub-navigation */}
      <div className="flex items-center gap-2 justify-between">
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 shadow-inner">
          <button
            onClick={() => setActiveView('history')}
            className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${activeView === 'history' ? 'bg-white shadow-sm text-teal-600' : 'text-gray-400 hover:text-gray-600'}`}
          >
            История
          </button>
          <button
            onClick={() => setActiveView('stats')}
            className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${activeView === 'stats' ? 'bg-white shadow-sm text-teal-600' : 'text-gray-400 hover:text-gray-600'}`}
          >
            Статистика
          </button>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-teal-600 text-white text-sm font-black rounded-xl active:scale-95 transition-all shadow-lg shadow-teal-100"
        >
          <Plus size={18} /> Продажа
        </button>
      </div>

      {error && <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm border border-red-100">{error}</div>}

      {/* Stats view */}
      {activeView === 'stats' && <StatsBlock password={password} />}

      {/* History view */}
      {activeView === 'history' && (
        <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-top-1 duration-300">
          {loading && <div className="text-center text-gray-400 py-10 font-medium">Загрузка...</div>}
          {!loading && sales.length === 0 && (
            <div className="text-center text-gray-400 py-16 bg-white rounded-3xl border border-dashed">
              <ShoppingBag size={48} className="mx-auto mb-3 text-gray-100" />
              <div className="font-bold text-gray-500">Продаж пока нет</div>
              <div className="text-xs mt-1 text-gray-300">Оформите первую продажу прямо сейчас</div>
            </div>
          )}
          <div className="flex flex-col gap-2.5">
            {sales.map(s => (
              <SaleCard key={s.id} sale={s} onDelete={handleDelete} />
            ))}
          </div>
        </div>
      )}

      {/* New Sale Modal */}
      {showModal && (
        <NewSaleModal
          password={password}
          products={products}
          clients={clients}
          onClose={() => setShowModal(false)}
          onSaved={load}
        />
      )}
    </div>
  );
};
