import React, { useState, useEffect, useCallback, useRef } from 'react';
import { apiClient } from '../../api/apiClient';
import { formatDateUI } from '../../utils/dateFormatter';
import { Search, ArrowLeft, Phone, User, Waves, ChevronRight, ArrowUpDown, StickyNote, Check, ShoppingBag, Trash2 } from 'lucide-react';

type Client = {
  id: string;
  phone: string;
  name: string;
  tgUsername?: string;
  note?: string;
  rentalCount: number;
  saleCount: number;
  totalSpent: number;
  lastVisit: string | null;
  lastRental: string | null;
};

type ClientProfile = {
  id: string;
  phone: string;
  name: string;
  tgUsername?: string;
  note?: string;
  rentalCount: number;
  saleCount: number;
  totalSpent: number;
  totalSups: number;
  firstVisit: string | null;
  lastVisit: string | null;
  rentals: any[];
  sales: any[];
};

type SortKey = 'totalSpent_desc' | 'lastRental_desc';

type Props = { password: string; initialClientId?: string | null; onClearInitialClient?: () => void };

function getPlural(n: number, one: string, two: string, five: string) {
  const x = Math.abs(n) % 100;
  const y = x % 10;
  if (x > 10 && x < 20) return five;
  if (y > 1 && y < 5) return two;
  if (y === 1) return one;
  return five;
}

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'totalSpent_desc',  label: 'По доходу' },
  { value: 'lastRental_desc',  label: 'По последней аренде' },
];

function sortClients(clients: Client[], sortKey: SortKey): Client[] {
  return [...clients].sort((a, b) => {
    switch (sortKey) {
      case 'totalSpent_desc':  return b.totalSpent - a.totalSpent;
      case 'lastRental_desc':
        if (!a.lastRental && !b.lastRental) return 0;
        if (!a.lastRental) return 1;
        if (!b.lastRental) return -1;
        return b.lastRental.localeCompare(a.lastRental);
      default: return 0;
    }
  });
}

// ─── Note editor component ────────────────────────────────────────────────────
const NoteEditor: React.FC<{
  clientId: string;
  initialNote: string;
  password: string;
  onSaved: (note: string) => void;
}> = ({ clientId, initialNote, password, onSaved }) => {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(initialNote);
  const [saving, setSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleEdit = () => {
    setEditing(true);
    setTimeout(() => textareaRef.current?.focus(), 50);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiClient.updateClientNote(password, clientId, value.trim());
      onSaved(value.trim());
      setEditing(false);
    } catch {
      // keep editing open on error
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setValue(initialNote);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="bg-white rounded-2xl border shadow-sm p-4 flex flex-col gap-2">
        <div className="text-xs text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
          <StickyNote size={12} /> Заметка
        </div>
        <textarea
          ref={textareaRef}
          value={value}
          onChange={e => setValue(e.target.value)}
          rows={3}
          placeholder="Постоянный клиент, скидка 10%..."
          className="w-full text-sm border border-gray-200 rounded-xl p-3 outline-none focus:border-teal-500 resize-none bg-gray-50/30 transition-colors"
        />
        <div className="flex gap-2 justify-end mt-1">
          <button onClick={handleCancel} className="px-3 py-2 text-gray-400 hover:text-gray-600 rounded-xl active:bg-gray-100">
            Отмена
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 bg-teal-600 text-white text-sm font-bold rounded-xl disabled:opacity-50 flex items-center gap-1.5 shadow-md shadow-teal-50"
          >
            <Check size={16} /> {saving ? 'Сохраняю...' : 'Сохранить'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={handleEdit}
      className="w-full text-left bg-white rounded-2xl border shadow-sm p-4 hover:bg-gray-50 active:scale-[0.99] transition-all"
    >
      <div className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5">
        <StickyNote size={12} /> Заметка о клиенте
      </div>
      {value ? (
        <div className="text-sm text-gray-700 leading-relaxed">{value}</div>
      ) : (
        <div className="text-sm text-gray-300 italic">Нажмите, чтобы добавить важную информацию...</div>
      )}
    </button>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
export const ClientsTab: React.FC<Props> = ({ password, initialClientId, onClearInitialClient }) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('totalSpent_desc');
  const [showSort, setShowSort] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Profile view
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [profile, setProfile] = useState<ClientProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileNote, setProfileNote] = useState('');

  const loadClients = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiClient.getClients(password, search || undefined);
      setClients(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [password, search]);

  useEffect(() => {
    const timeout = setTimeout(loadClients, 300);
    return () => clearTimeout(timeout);
  }, [loadClients]);

  // Handle external navigation
  useEffect(() => {
    if (initialClientId && !selectedId) {
      openProfile(initialClientId);
      onClearInitialClient?.();
    }
  }, [initialClientId]);

  const openProfile = async (id: string) => {
    setSelectedId(id);
    setProfileLoading(true);
    setProfile(null);
    try {
      const data = await apiClient.getClientProfile(password, id);
      setProfile(data);
      setProfileNote(data.note || '');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setProfileLoading(false);
    }
  };

  const closeProfile = () => {
    setSelectedId(null);
    setProfile(null);
  };

  const handleDeleteClient = async (id: string) => {
    if (!window.confirm('Вы уверены, что хотите удалить клиента? Все его заказы, аренды и статистика будут безвозвратно удалены.')) {
      return;
    }
    try {
      await apiClient.deleteClient(password, id);
      setClients(prev => prev.filter(c => c.id !== id));
    } catch (e: any) {
      alert(e.message || 'Не удалось удалить клиента');
    }
  };


  // ─── Profile View ───────────────────────────────────────────────────────────
  if (selectedId) {
    if (profileLoading) {
      return <div className="text-center text-gray-400 py-20 font-medium animate-pulse">Загрузка профиля...</div>;
    }
    if (!profile) {
      return (
        <div className="flex flex-col gap-4">
          <button onClick={closeProfile} className="flex items-center gap-2 text-gray-500 text-sm font-bold">
            <ArrowLeft size={18} /> Назад
          </button>
          <div className="text-center text-red-400 py-20 bg-red-50 rounded-2xl border border-red-100">Не удалось загрузить профиль</div>
        </div>
      );
    }

    const isRegular = profile.rentalCount >= 3;

    return (
      <div className="flex flex-col gap-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={closeProfile} className="p-2.5 border rounded-2xl text-gray-500 active:bg-gray-100 transition-colors">
            <ArrowLeft size={22} />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-gray-900 truncate">{profile.name}</h2>
              {isRegular && <span title="Постоянный клиент" className="shrink-0 text-lg">⭐</span>}
            </div>
            <div className="text-sm text-gray-400 font-medium">
              {profile.phone}{profile.tgUsername ? ` • @${profile.tgUsername.replace('@', '')}` : ''}
            </div>
          </div>
          {profile.tgUsername ? (
            <a
              href={`https://t.me/${profile.tgUsername.replace('@', '')}`}
              target="_blank" rel="noreferrer"
              className="p-3 bg-teal-50 text-teal-600 rounded-2xl active:scale-95 transition-all font-black text-xs shadow-sm shadow-teal-100"
            >
              TG
            </a>
          ) : (
            <a href={`tel:${profile.phone}`} className="p-3 bg-teal-50 text-teal-600 rounded-2xl active:scale-95 transition-all shadow-sm shadow-teal-100">
              <Phone size={20} />
            </a>
          )}
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl border shadow-sm p-4">
            <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Всего доход</div>
            <div className="text-2xl font-black text-teal-600 leading-none">
              {profile.totalSpent.toLocaleString('ru')} ₽
            </div>
            <div className="mt-2 flex flex-col gap-0.5">
               {profile.rentalCount > 0 && <span className="text-[10px] text-gray-400 font-bold">🏠 {profile.rentalCount} {getPlural(profile.rentalCount, 'аренда', 'аренды', 'аренд')}</span>}
               {profile.saleCount > 0 && <span className="text-[10px] text-gray-400 font-bold">🛍️ {profile.saleCount} {getPlural(profile.saleCount, 'продажа', 'продажи', 'продаж')}</span>}
            </div>
          </div>
          <div className="bg-white rounded-2xl border shadow-sm p-4 flex flex-col justify-between">
            <div>
              <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Всего сапов</div>
              <div className="text-2xl font-black text-orange-500 leading-none">{profile.totalSups}</div>
            </div>
            <div className="text-[10px] text-gray-400 font-bold mt-1 uppercase">За всё время</div>
          </div>
        </div>

        {/* Client note */}
        <NoteEditor
          clientId={profile.id}
          initialNote={profileNote}
          password={password}
          onSaved={note => setProfileNote(note)}
        />

        {/* Tabs for History */}
        <div className="flex flex-col gap-4">
          {/* Rentals History */}
          {profile.rentals.length > 0 && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-gray-500 font-black text-xs uppercase tracking-wider px-1">
                <Waves size={16} className="text-orange-500" /> История аренд
              </div>
              <div className="flex flex-col gap-2">
                {profile.rentals.map((r: any) => {
                  const days = r.end_date
                    ? Math.round((new Date(r.end_date).getTime() - new Date(r.rental_date).getTime()) / 86400000) + 1
                    : 1;
                  const total = (Number(r.prepayment) || 0) + (Number(r.payment_on_site) || 0) + (Number(r.penalty) || 0);
                  const isReturned = r.status === 'returned';

                  return (
                    <div key={r.id} className="bg-white rounded-2xl border p-4 flex justify-between items-center gap-3 shadow-sm">
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-sm text-gray-800">{formatDateUI(r.rental_date)}</div>
                        <div className="text-xs text-gray-400 font-medium">
                          {r.quantity} {getPlural(r.quantity, 'сап', 'сапа', 'сапов')} · {days} {getPlural(days, 'день', 'дня', 'дней')}
                        </div>
                        {r.note && <div className="text-[10px] text-gray-400 italic mt-1 line-clamp-1">"{r.note}"</div>}
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-black text-sm text-gray-900">{total.toLocaleString('ru')} ₽</div>
                        <div className={`text-[9px] font-black uppercase mt-0.5 ${isReturned ? 'text-green-500' : 'text-orange-500'}`}>
                          {isReturned ? 'Завершена' : 'На воде'}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Sales History */}
          {profile.sales.length > 0 && (
            <div className="flex flex-col gap-2 mt-2">
              <div className="flex items-center gap-2 text-gray-500 font-black text-xs uppercase tracking-wider px-1">
                <ShoppingBag size={16} className="text-teal-500" /> История покупок
              </div>
              <div className="flex flex-col gap-2">
                {profile.sales.map((s: any) => (
                  <div key={s.id} className="bg-white rounded-2xl border p-4 flex justify-between items-center gap-3 shadow-sm">
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm text-gray-800">{new Date(s.created_at).toLocaleDateString('ru')}</div>
                      <div className="text-[10px] text-gray-400 font-medium truncate mt-0.5">
                        {s.items.map((i:any) => i.product_name_snapshot).join(', ')}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-black text-sm text-teal-600">{s.total_revenue.toLocaleString('ru')} ₽</div>
                      <div className="text-[9px] text-gray-300 font-black uppercase mt-0.5">
                        {s.payment_method === 'cash' ? 'Наличные' : s.payment_method === 'card' ? 'Карта' : 'Перевод'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── Client List View ─────────────────────────────────────────────────────
  const sortedClients = sortClients(clients, sortKey);

  return (
    <div className="flex flex-col gap-4 animate-in fade-in duration-500">
      {/* Search */}
      <div className="relative">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" />
        <input
          type="text"
          inputMode="search"
          placeholder="Поиск по имени или телефону..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full h-13 pl-11 pr-4 rounded-2xl border border-gray-100 bg-white text-sm outline-none focus:border-teal-500 transition-all shadow-sm"
        />
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between px-1">
        <div className="relative">
          <button
            onClick={() => setShowSort(v => !v)}
            className="flex items-center gap-2 text-xs font-bold text-gray-500 bg-white border border-gray-100 rounded-xl px-4 py-2.5 active:bg-gray-50 transition-colors shadow-sm"
          >
            <ArrowUpDown size={14} />
            {SORT_OPTIONS.find(o => o.value === sortKey)?.label}
          </button>
          {showSort && (
            <div className="absolute top-full left-0 mt-2 bg-white border rounded-2xl shadow-xl z-20 overflow-hidden w-48 animate-in zoom-in-95 duration-100">
              {SORT_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => { setSortKey(opt.value); setShowSort(false); }}
                  className={`w-full text-left px-4 py-3.5 text-sm hover:bg-gray-50 border-b last:border-b-0 transition-colors ${sortKey === opt.value ? 'font-black text-teal-600 bg-teal-50/30' : 'text-gray-600'}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
        
        {!loading && (
          <div className="text-[10px] font-black text-gray-300 uppercase tracking-widest">
            {sortedClients.length} {getPlural(sortedClients.length, 'клиент', 'клиента', 'клиентов')}
          </div>
        )}
      </div>

      {loading && <div className="text-center text-gray-400 py-20 font-medium">Поиск...</div>}
      {error && <div className="text-red-500 text-sm text-center bg-red-50 p-4 rounded-2xl">{error}</div>}

      {!loading && sortedClients.length === 0 && (
        <div className="text-center text-gray-400 py-20 bg-white rounded-3xl border border-dashed">
          <User size={48} className="mx-auto mb-3 text-gray-100" />
          <div className="font-bold text-gray-500">Клиенты не найдены</div>
          <div className="text-xs mt-1 text-gray-300">Попробуйте изменить запрос</div>
        </div>
      )}

      {/* Client list */}
      <div className="flex flex-col gap-2.5">
        {sortedClients.map(c => {
          const isRegular = c.rentalCount >= 3;
          return (
            <button
              key={c.id}
              onClick={() => openProfile(c.id)}
              className="w-full bg-white rounded-2xl border p-4 flex items-center gap-4 active:scale-[0.98] transition-all text-left shadow-sm hover:border-teal-100"
            >
              {/* Avatar */}
              <div className="w-11 h-11 rounded-2xl bg-teal-50/50 flex items-center justify-center shrink-0 border border-teal-50">
                {isRegular
                  ? <span className="text-xl">⭐</span>
                  : <User size={22} className="text-teal-600" />}
              </div>

              {/* Name + phone */}
              <div className="flex-1 min-w-0">
                <div className="font-black text-[15px] text-gray-900 truncate leading-tight">{c.name}</div>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                  <span className="text-xs text-gray-400 font-medium">{c.phone}</span>
                  {c.rentalCount > 0 && <span className="text-[10px] text-orange-400 font-bold">🏠 {c.rentalCount}</span>}
                  {c.saleCount > 0 && <span className="text-[10px] text-teal-400 font-bold">🛍️ {c.saleCount}</span>}
                </div>
              </div>

              {/* Stats */}
              <div className="text-right shrink-0">
                <div className="text-sm font-black text-teal-600 leading-tight">
                  {c.totalSpent.toLocaleString('ru')} ₽
                </div>
                <div className="text-[9px] text-gray-300 font-black uppercase tracking-tighter mt-1">
                   {c.lastVisit ? formatDateUI(c.lastVisit) : '—'}
                </div>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteClient(c.id);
                }}
                className="p-2 text-gray-300 hover:text-red-500 rounded-xl active:bg-gray-100 transition-colors"
              >
                <Trash2 size={16} />
              </button>

              <ChevronRight size={18} className="text-gray-200 shrink-0" />

            </button>
          );
        })}
      </div>
    </div>
  );
};
