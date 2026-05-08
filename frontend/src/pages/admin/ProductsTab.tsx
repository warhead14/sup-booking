import React, { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../../api/apiClient';
import { Plus, Pencil, Check, X, Package, ToggleLeft, ToggleRight } from 'lucide-react';

type Product = {
  id: string;
  name: string;
  default_price: number;
  default_cost_price: number;
  is_active: number;
};

type Props = { password: string };

const fmt = (n: number) => n.toLocaleString('ru') + ' ₽';

const EMPTY_FORM = { name: '', default_price: '', default_cost_price: '' };

export const ProductsTab: React.FC<Props> = ({ password }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Inline create form
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState(EMPTY_FORM);
  const [creating, setCreating] = useState(false);

  // Inline edit
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiClient.getProducts(password);
      setProducts(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [password]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!createForm.name.trim()) return;
    setCreating(true);
    try {
      await apiClient.createProduct(password, {
        name: createForm.name.trim(),
        default_price: parseFloat(createForm.default_price) || 0,
        default_cost_price: parseFloat(createForm.default_cost_price) || 0,
      });
      setCreateForm(EMPTY_FORM);
      setShowCreate(false);
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setCreating(false);
    }
  };

  const startEdit = (p: Product) => {
    setEditingId(p.id);
    setEditForm({
      name: p.name,
      default_price: String(p.default_price),
      default_cost_price: String(p.default_cost_price),
    });
  };

  const handleSave = async () => {
    if (!editingId) return;
    setSaving(true);
    try {
      await apiClient.updateProduct(password, editingId, {
        name: editForm.name.trim(),
        default_price: parseFloat(editForm.default_price) || 0,
        default_cost_price: parseFloat(editForm.default_cost_price) || 0,
      });
      setEditingId(null);
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (p: Product) => {
    try {
      await apiClient.updateProduct(password, p.id, { is_active: p.is_active ? 0 : 1 });
      await load();
    } catch (e: any) {
      setError(e.message);
    }
  };

  if (loading) return <div className="text-center text-gray-400 py-10">Загрузка...</div>;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-gray-700 font-semibold text-sm">
          <Package size={16} />
          <span>{products.length} {products.length === 1 ? 'товар' : products.length < 5 ? 'товара' : 'товаров'}</span>
        </div>
        {!showCreate && (
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-teal-600 text-white text-sm font-semibold rounded-xl active:bg-teal-700 transition-colors"
          >
            <Plus size={16} /> Добавить
          </button>
        )}
      </div>

      {error && <div className="text-red-500 text-sm text-center">{error}</div>}

      {/* Create form */}
      {showCreate && (
        <div className="bg-white rounded-xl border shadow-sm p-4 flex flex-col gap-3">
          <div className="font-semibold text-sm text-gray-700">Новый товар</div>
          <input
            autoFocus
            type="text"
            placeholder="Название (Весло, Насос...)"
            value={createForm.name}
            onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))}
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm outline-none focus:border-teal-500"
          />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="text-[10px] text-gray-400 mb-1">Цена продажи ₽</div>
              <input
                type="number" inputMode="decimal" placeholder="0"
                value={createForm.default_price}
                onChange={e => setCreateForm(f => ({ ...f, default_price: e.target.value }))}
                className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm outline-none focus:border-teal-500"
              />
            </div>
            <div>
              <div className="text-[10px] text-gray-400 mb-1">Себестоимость ₽</div>
              <input
                type="number" inputMode="decimal" placeholder="0"
                value={createForm.default_cost_price}
                onChange={e => setCreateForm(f => ({ ...f, default_cost_price: e.target.value }))}
                className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm outline-none focus:border-teal-500"
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => { setShowCreate(false); setCreateForm(EMPTY_FORM); }}
              className="p-2 text-gray-400 border rounded-lg"
            >
              <X size={16} />
            </button>
            <button
              onClick={handleCreate}
              disabled={creating || !createForm.name.trim()}
              className="px-4 py-2 bg-teal-600 text-white text-sm font-semibold rounded-lg disabled:opacity-50 flex items-center gap-1"
            >
              <Check size={14} /> {creating ? 'Сохраняю...' : 'Сохранить'}
            </button>
          </div>
        </div>
      )}

      {/* Product list */}
      {products.length === 0 && !showCreate && (
        <div className="text-center text-gray-400 py-10">
          Добавьте первый товар
        </div>
      )}

      <div className="flex flex-col gap-2">
        {products.map(p => {
          const isEditing = editingId === p.id;
          const profit = p.default_price - p.default_cost_price;

          if (isEditing) {
            return (
              <div key={p.id} className="bg-white rounded-xl border border-teal-300 shadow-sm p-4 flex flex-col gap-3">
                <input
                  autoFocus
                  type="text"
                  value={editForm.name}
                  onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm outline-none focus:border-teal-500 font-semibold"
                />
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="text-[10px] text-gray-400 mb-1">Цена продажи ₽</div>
                    <input
                      type="number" inputMode="decimal"
                      value={editForm.default_price}
                      onChange={e => setEditForm(f => ({ ...f, default_price: e.target.value }))}
                      className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm outline-none focus:border-teal-500"
                    />
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-400 mb-1">Себестоимость ₽</div>
                    <input
                      type="number" inputMode="decimal"
                      value={editForm.default_cost_price}
                      onChange={e => setEditForm(f => ({ ...f, default_cost_price: e.target.value }))}
                      className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm outline-none focus:border-teal-500"
                    />
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setEditingId(null)} className="p-2 text-gray-400 border rounded-lg"><X size={16} /></button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-4 py-2 bg-teal-600 text-white text-sm font-semibold rounded-lg disabled:opacity-50 flex items-center gap-1"
                  >
                    <Check size={14} /> {saving ? 'Сохраняю...' : 'Сохранить'}
                  </button>
                </div>
              </div>
            );
          }

          return (
            <div key={p.id} className={`bg-white rounded-xl border shadow-sm p-4 flex items-center gap-3 ${!p.is_active ? 'opacity-50' : ''}`}>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm text-gray-800">{p.name}</div>
                <div className="text-xs text-gray-400 mt-0.5">
                  <span className="text-teal-600 font-medium">{fmt(p.default_price)}</span>
                  {' · '}
                  <span>себест. {fmt(p.default_cost_price)}</span>
                  {profit > 0 && <span className="text-green-500"> · +{fmt(profit)}</span>}
                </div>
              </div>
              <button onClick={() => handleToggle(p)} className="p-1.5 text-gray-300 hover:text-teal-500 transition-colors" title={p.is_active ? 'Деактивировать' : 'Активировать'}>
                {p.is_active ? <ToggleRight size={22} className="text-teal-500" /> : <ToggleLeft size={22} />}
              </button>
              <button onClick={() => startEdit(p)} className="p-1.5 text-gray-300 hover:text-gray-600 transition-colors">
                <Pencil size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
