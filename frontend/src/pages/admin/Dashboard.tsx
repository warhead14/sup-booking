import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../api/apiClient';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { PhoneInput } from '../../components/PhoneInput';
import { IssueModal } from './IssueModal';
import { StatsTab } from './StatsTab';
import { ClientsTab } from './ClientsTab';
import { ProductsTab } from './ProductsTab';
import { SalesTab } from './SalesTab';
import { DraftsTab } from './DraftsTab';
import { formatDateUI, formatRangeUI } from '../../utils/dateFormatter';
import { calculatePricing } from '../../utils/pricing';
import { Phone, Check, X, LogOut, Ban, ChevronLeft, ChevronRight, ArrowLeft, Plus, Waves, CheckCircle, Ship, Clock, Trash2, Sun, Moon } from 'lucide-react';

type Booking = {
  id: string;
  client_id?: string | null;
  customer_name: string;
  customer_phone: string;
  customer_messenger: string;
  customer_tg_username?: string;
  start_date: string;
  end_date: string;
  pickup_time: string;
  quantity: number;
  total_price: number;
  prepayment: number;
  status: string;
  created_at: string;
};

type Rental = {
  id: string;
  booking_id: string | null;
  client_id?: string | null;
  customer_name: string;
  customer_phone: string;
  customer_tg_username?: string;
  quantity: number;
  pickup_time: string;
  rental_date: string;
  end_date: string;
  expected_return_time: string;
  prepayment: number;
  payment_on_site: number;
  total_price: number;
  penalty: number;
  payment_method: string;
  deposit_types: string;
  deposit_note: string;
  extra_gear: string;
  status: 'on_water' | 'returned';
  returned_at: string | null;
  created_at: string;
};

type TabProps = { label: string, active: boolean, onClick: () => void };
const Tab = ({ label, active, onClick }: TabProps) => (
  <button 
    onClick={onClick}
    className={`px-4 pb-2 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${active ? 'border-teal-base text-teal-active' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
  >
    {label}
  </button>
);

const SectionHeader = ({ icon, title, count, color }: { icon: React.ReactNode; title: string; count: number; color: string }) => (
  <div className={`flex items-center gap-2 py-2 px-1 ${color}`}>
    {icon}
    <span className="font-bold text-sm">{title}</span>
    <span className="ml-auto bg-white/80 rounded-full px-2 py-0.5 text-xs font-bold">{count}</span>
  </div>
);

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [password] = useState(localStorage.getItem('admin_pwd') || '');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [filter, setFilter] = useState<'pending'|'approved'|'calendar'|'stats'|'clients'|'products'|'sales'|'drafts'>('pending');
  const [search, setSearch] = useState('');
  const [quickClientId, setQuickClientId] = useState<string | null>(null);
  
  const [calendarWeekStart, setCalendarWeekStart] = useState<Date>(() => {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(now.setDate(diff));
  });
  const [selectedCalendarDayStr, setSelectedCalendarDayStr] = useState<string | null>(null);

  const [isDark, setIsDark] = useState(() => localStorage.getItem('theme') === 'dark');

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  const formatLocalYYYYMMDD = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createFormData, setCreateFormData] = useState({
    startDate: '', fullName: '', phone: '', quantity: 1, pickupTime: '10:00', durationDays: 1,
    messenger: 'telegram' as 'telegram' | 'max' | 'other'
  });
  const [createError, setCreateError] = useState('');
  
  const [createTotalPrice, setCreateTotalPrice] = useState('');
  const [createPrepayment, setCreatePrepayment] = useState('');

  useEffect(() => {
    if (!isCreateModalOpen || !createFormData.startDate) return;
    const [y, m, d] = createFormData.startDate.split('-').map(Number);
    const startLocal = new Date(y, m - 1, d);
    startLocal.setDate(startLocal.getDate() + createFormData.durationDays - 1);
    const endDate = formatLocalYYYYMMDD(startLocal);
    
    const p = calculatePricing(createFormData.startDate, endDate, createFormData.quantity, true);
    setCreateTotalPrice(String(p.totalPrice));
    setCreatePrepayment(String(p.prepayment));
  }, [createFormData.startDate, createFormData.durationDays, createFormData.quantity, isCreateModalOpen]);

  // Issue modal state
  const [issueModalOpen, setIssueModalOpen] = useState(false);
  const [issueModalDate, setIssueModalDate] = useState<string>('');
  const [issueModalPrefill, setIssueModalPrefill] = useState<any>(undefined);
  const [issueModalIsEditing, setIssueModalIsEditing] = useState(false);
  const [issueModalDraftId, setIssueModalDraftId] = useState<string | null>(null);

  const [currentBookingDraftId, setCurrentBookingDraftId] = useState<string | null>(null);

  const handleOpenDraft = (draft: any) => {
    try {
      const payload = typeof draft.payload === 'string' ? JSON.parse(draft.payload) : draft.payload;
      if (draft.type === 'booking') {
        setCreateFormData(payload.formData || { fullName: '', phone: '', messenger: 'telegram', startDate: formatLocalYYYYMMDD(new Date()), durationDays: 1, pickupTime: '10:00', quantity: 1 });
        setCreateTotalPrice(payload.totalPrice || '');
        setCreatePrepayment(payload.prepayment || '');
        setCurrentBookingDraftId(draft.id);
        setIsCreateModalOpen(true);
      } else if (draft.type === 'rental') {
        setIssueModalPrefill(payload);
        setIssueModalIsEditing(false);
        setIssueModalDate(payload.rentalDate || '');
        setIssueModalDraftId(draft.id);
        setIssueModalOpen(true);
      }
    } catch (e) {
      console.error('Failed to parse draft payload', e);
    }
  };

  useEffect(() => {
    if (!password) { navigate('/admin'); return; }
    loadAll();
  }, [password]);

  const loadAll = async () => {
    try {
      const [bData, rData] = await Promise.all([
        apiClient.getAdminBookings(password),
        apiClient.getAdminRentals(password)
      ]);
      setBookings(bData);
      setRentals(rData);
    } catch (err: any) {
      if (err.message === 'Неверный пароль') { localStorage.removeItem('admin_pwd'); navigate('/admin'); }
      else setError('Не удалось загрузить данные');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (id: string, action: 'approve' | 'reject' | 'cancel') => {
    setActionLoadingId(id);
    try { await apiClient.updateBookingStatus(password, id, action); await loadAll(); }
    catch (err: any) { alert(`❌ ${err.message}`); }
    finally { setActionLoadingId(null); }
  };

  const handleLogout = () => { localStorage.removeItem('admin_pwd'); navigate('/admin'); };

  const handleCreateSubmit = async () => {
    setCreateLoading(true); setCreateError('');
    try {
      const [y, m, d] = createFormData.startDate.split('-').map(Number);
      const startLocal = new Date(y, m - 1, d);
      startLocal.setDate(startLocal.getDate() + createFormData.durationDays - 1);
      const endDate = formatLocalYYYYMMDD(startLocal);
      await apiClient.adminCreateBooking(password, {
        fullName: createFormData.fullName, phone: createFormData.phone, messenger: createFormData.messenger,
        startDate: createFormData.startDate, endDate, pickupTime: createFormData.pickupTime, quantity: createFormData.quantity,
        totalPrice: parseFloat(createTotalPrice) || 0, prepayment: parseFloat(createPrepayment) || 0
      });
      if (currentBookingDraftId) {
        try { await apiClient.deleteDraft(password, currentBookingDraftId); } catch(e) {}
      }
      setIsCreateModalOpen(false); setCreateError('');
      setCreateFormData(prev => ({ ...prev, fullName: '', phone: '', quantity: 1, durationDays: 1 }));
      setCreateTotalPrice('');
      setCreatePrepayment('');
      setCurrentBookingDraftId(null);
      await loadAll();
    } catch (err: any) { setCreateError(err.message || 'Ошибка'); }
    finally { setCreateLoading(false); }
  };

  const handleSaveBookingDraft = async () => {
    setCreateLoading(true); setCreateError('');
    try {
      await apiClient.saveDraft(password, {
        id: currentBookingDraftId || undefined,
        type: 'booking',
        title: createFormData.fullName || 'Без имени',
        payload: {
          formData: createFormData,
          totalPrice: createTotalPrice,
          prepayment: createPrepayment
        }
      });
      setIsCreateModalOpen(false);
      setCurrentBookingDraftId(null);
      setCreateFormData(prev => ({ ...prev, fullName: '', phone: '', quantity: 1, durationDays: 1 }));
      setCreateTotalPrice('');
      setCreatePrepayment('');
      await loadAll();
    } catch (err: any) { setCreateError(err.message || 'Ошибка сохранения черновика'); }
    finally { setCreateLoading(false); }
  };

  const handleIssueSubmit = async (data: any) => {
    if (issueModalIsEditing && data.id) {
      await apiClient.updateRental(password, data.id, data);
    } else {
      await apiClient.issueRental(password, data);
      if (issueModalDraftId) {
        try { await apiClient.deleteDraft(password, issueModalDraftId); } catch(e) {}
      }
    }
    setIssueModalOpen(false);
    setIssueModalPrefill(undefined);
    setIssueModalDraftId(null);
    await loadAll();
  };

  const handleReturn = async (rentalId: string) => {
    try { await apiClient.returnRental(password, rentalId); await loadAll(); }
    catch (err: any) { alert(`❌ ${err.message}`); }
  };

  const handleDeleteBooking = async (id: string) => {
    if (!window.confirm('Удалить бронь? Это действие нельзя отменить.')) return;
    console.log('🔘 [UI] Delete Booking clicked for ID:', id);
    try { await apiClient.deleteBooking(password, id); await loadAll(); }
    catch (err: any) { alert(`❌ ${err.message}`); }
  };

  const handleDeleteRental = async (id: string) => {
    if (!window.confirm('Удалить выдачу? Это действие нельзя отменить.')) return;
    console.log('🔘 [UI] Delete Rental clicked for ID:', id);
    try { await apiClient.deleteRental(password, id); await loadAll(); }
    catch (err: any) { alert(`❌ ${err.message}`); }
  };

  const navigateToClient = (clientId: string | null | undefined) => {
    if (!clientId) return;
    setQuickClientId(clientId);
    setFilter('clients');
    setSelectedCalendarDayStr(null);
  };

  const openIssueFromBooking = (b: Booking) => {
    setIssueModalDate(selectedCalendarDayStr || b.start_date);
    setIssueModalPrefill({ 
      name: b.customer_name, 
      phone: b.customer_phone, 
      tgUsername: b.customer_tg_username,
      quantity: b.quantity, 
      pickupTime: b.pickup_time, 
      bookingId: b.id,
      totalPrice: b.total_price,
      prepayment: b.prepayment,
      durationDays: Math.round((new Date(b.end_date).getTime() - new Date(b.start_date).getTime()) / 86400000) + 1
    });
    setIssueModalIsEditing(false);
    setIssueModalOpen(true);
  };

  const openQuickIssue = (dateStr: string) => {
    setIssueModalDate(dateStr);
    setIssueModalPrefill(null);
    setIssueModalIsEditing(false);
    setIssueModalOpen(true);
  };

  const openIssueForClient = (client: any) => {
    const d = new Date();
    const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    setIssueModalDate(today);
    setIssueModalPrefill({
      name: client.name,
      phone: client.phone,
      tgUsername: client.tgUsername,
      quantity: 1,
      pickupTime: '10:00'
    });
    setIssueModalIsEditing(false);
    setIssueModalOpen(true);
  };

  const openIssueForEditing = (r: Rental) => {
    let gearList: Record<string, number> = {};
    try { 
      const parsed = JSON.parse(r.extra_gear); 
      if (Array.isArray(parsed)) {
        parsed.forEach((g: any) => gearList[g.name] = g.qty);
      }
    } catch {}
    let depositList: string[] = [];
    try { depositList = JSON.parse(r.deposit_types); } catch {}

    setIssueModalDate(r.rental_date);
    setIssueModalPrefill({
      id: r.id,
      name: r.customer_name,
      phone: r.customer_phone,
      tgUsername: r.customer_tg_username,
      quantity: r.quantity,
      pickupTime: r.pickup_time,
      bookingId: r.booking_id,
      durationDays: Math.round((new Date(r.end_date || r.rental_date).getTime() - new Date(r.rental_date).getTime()) / 86400000) + 1,
      totalPrice: r.total_price,
      prepayment: r.prepayment,
      paymentOnSite: r.payment_on_site,
      expectedReturnTime: r.expected_return_time,
      penalty: r.penalty,
      paymentMethod: r.payment_method,
      depositTypes: depositList,
      depositNote: r.deposit_note,
      extraGear: gearList
    });
    setIssueModalIsEditing(true);
    setIssueModalOpen(true);
  };

  const filtered = bookings.filter(b => {
    const matchesSearch = b.customer_name.toLowerCase().includes(search.toLowerCase()) || b.customer_phone.includes(search);
    if (!matchesSearch) return false;
    if (filter === 'pending') return b.status === 'pending';
    if (filter === 'approved') return b.status === 'approved';
    return true;
  });

  const renderDayView = (dateStr: string) => {
    const getSupWord = (q: number) => {
      const m = q % 10, m100 = q % 100;
      if (m === 1 && m100 !== 11) return 'сап';
      if (m >= 2 && m <= 4 && (m100 < 10 || m100 >= 20)) return 'сапа';
      return 'сапов';
    };
    const getDayWord = (d: number) => {
      const m = d % 10, m100 = d % 100;
      if (m === 1 && m100 !== 11) return 'день';
      if (m >= 2 && m <= 4 && (m100 < 10 || m100 >= 20)) return 'дня';
      return 'дней';
    };

    const pending = bookings.filter(b =>
      b.status === 'pending' && b.start_date <= dateStr && b.end_date >= dateStr
    ).sort((a, b) => a.pickup_time.localeCompare(b.pickup_time));

    const planned = bookings.filter(b =>
      b.status === 'approved' && b.start_date <= dateStr && b.end_date >= dateStr
    ).sort((a, b) => a.pickup_time.localeCompare(b.pickup_time));

    const onWater = rentals.filter(r => r.rental_date <= dateStr && (r.end_date || r.rental_date) >= dateStr && r.status === 'on_water')
      .sort((a, b) => (a.expected_return_time || '').localeCompare(b.expected_return_time || ''));
    const returned = rentals.filter(r => r.rental_date <= dateStr && (r.end_date || r.rental_date) >= dateStr && r.status === 'returned');

    const totalPending = pending.reduce((s, b) => s + b.quantity, 0);
    const totalPlanned = planned.reduce((s, b) => s + b.quantity, 0);
    const totalOnWater = onWater.reduce((s, r) => s + r.quantity, 0);

    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3 mb-1">
          <button onClick={() => setSelectedCalendarDayStr(null)} className="p-2 border rounded-full text-gray-500 active:bg-gray-100">
            <ArrowLeft size={20} />
          </button>
          <h2 className="text-lg font-bold flex-1">{formatDateUI(dateStr)}</h2>
          <button onClick={() => openQuickIssue(dateStr)} className="flex items-center gap-1.5 px-3 py-2 bg-orange-50 text-orange-600 rounded-lg text-sm font-medium active:bg-orange-100 border border-orange-200">
            <Ship size={16}/> Выдача
          </button>
          <button onClick={() => { setCreateFormData(p => ({...p, startDate: dateStr})); setIsCreateModalOpen(true); }} className="flex items-center gap-1.5 px-3 py-2 bg-teal-50 text-teal-600 rounded-lg text-sm font-medium active:bg-teal-100 border border-teal-200">
            <Plus size={16}/> Бронь
          </button>
        </div>

        <div className="flex gap-2 text-center overflow-x-auto pb-1" style={{scrollbarWidth:'none'}}>
          {totalPending > 0 && <div className="flex-1 min-w-[70px] bg-amber-50 rounded-lg p-2 shrink-0"><div className="text-xs text-amber-600">Хотят</div><div className="font-bold text-amber-700">{totalPending}</div></div>}
          <div className="flex-1 min-w-[70px] bg-blue-50 rounded-lg p-2 shrink-0"><div className="text-xs text-blue-500">План</div><div className="font-bold text-blue-700">{totalPlanned}</div></div>
          <div className="flex-1 min-w-[70px] bg-orange-50 rounded-lg p-2 shrink-0"><div className="text-xs text-orange-500">На воде</div><div className="font-bold text-orange-600">{totalOnWater}</div></div>
          <div className="flex-1 min-w-[70px] bg-green-50 rounded-lg p-2 shrink-0"><div className="text-xs text-green-500">Вернулись</div><div className="font-bold text-green-600">{returned.length}</div></div>
        </div>

        {/* PENDING */}
        {pending.length > 0 && (
          <>
            <SectionHeader icon={<Clock size={16}/>} title="Новые заявки" count={pending.length} color="text-amber-600" />
            {pending.map(b => {
              const d1 = new Date(b.start_date);
              const d2 = new Date(b.end_date);
              const diffDays = Math.round((d2.getTime() - d1.getTime()) / 86400000) + 1;
              
              return (
                <div key={b.id} className="bg-amber-50 p-4 rounded-xl border border-amber-100 shadow-sm flex items-start gap-3">
                  <div className="flex-1 min-w-0 flex flex-col">
                    <div className="text-xl font-black text-amber-900 mb-1">{b.pickup_time}</div>
                    <div className="font-bold text-gray-800 text-base">{b.customer_name || '—'}</div>
                    <div className="text-sm text-gray-500 mb-2">{b.customer_phone || 'Без телефона'}</div>
                    <div className="text-sm font-medium text-amber-800 bg-amber-100 w-max px-2.5 py-1 rounded-lg">
                      {b.quantity} {getSupWord(b.quantity)} • {diffDays} {getDayWord(diffDays)}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 shrink-0 mt-1">
                    <button onClick={() => handleAction(b.id, 'approve')} disabled={actionLoadingId === b.id} className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-bold shadow-sm active:bg-blue-600 transition-colors disabled:opacity-50">
                      Одобрить
                    </button>
                    <div className="flex gap-2">
                      <button onClick={() => handleAction(b.id, 'reject')} disabled={actionLoadingId === b.id} className="flex-1 px-4 py-2 bg-white border border-red-200 text-red-500 rounded-lg text-sm font-bold active:bg-red-50 transition-colors text-center disabled:opacity-50">
                        Отказать
                      </button>
                      <button onClick={() => handleDeleteBooking(b.id)} className="p-2 bg-white text-red-400 border border-red-200 rounded-lg flex justify-center items-center hover:bg-red-50">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </>
        )}

        {/* PLANNED */}
        <SectionHeader icon={<CheckCircle size={16}/>} title="Запланированные" count={planned.length} color="text-blue-600" />
        {planned.length === 0 ? (
          <div className="text-center text-gray-400 text-sm py-3">Нет броней</div>
        ) : planned.map(b => {
          const d1 = new Date(b.start_date);
          const d2 = new Date(b.end_date);
          const diffDays = Math.round((d2.getTime() - d1.getTime()) / 86400000) + 1;
          
          return (
            <div key={b.id} className="bg-white p-4 rounded-xl border shadow-sm flex items-start gap-3">
              <div className="flex-1 min-w-0 flex flex-col">
                <div className="text-xl font-black text-gray-900 mb-1">{b.pickup_time}</div>
                <div className="font-bold text-gray-800 text-base">
                  {b.client_id
                    ? <button onClick={() => navigateToClient(b.client_id)} className="text-left hover:text-teal-600 active:text-teal-700 transition-colors">{b.customer_name || '—'}</button>
                    : (b.customer_name || '—')}
                </div>
                <div className="text-sm text-gray-500 mb-2">
                  {b.customer_phone || ''} {b.customer_tg_username ? `• @${b.customer_tg_username.replace('@', '')}` : ''}
                </div>
                <div className="text-sm font-medium text-teal-700 bg-teal-50 w-max px-2.5 py-1 rounded-lg">
                  {b.quantity} {getSupWord(b.quantity)} • {diffDays} {getDayWord(diffDays)}
                </div>
              </div>
              <div className="flex flex-col gap-2 shrink-0">
                <button onClick={() => openIssueFromBooking(b)} className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-bold shadow-sm active:bg-orange-600 transition-colors">
                  Выдать
                </button>
                <button onClick={() => handleDeleteBooking(b.id)} className="p-2 text-red-400 border border-red-100 rounded-lg flex justify-center hover:bg-red-50">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          );
        })}

        {/* ON WATER */}
        <SectionHeader icon={<Waves size={16}/>} title="На воде" count={onWater.length} color="text-orange-600" />
        {onWater.length === 0 ? (
          <div className="text-center text-gray-400 text-sm py-3">Никого на воде</div>
        ) : onWater.map(r => {
          let gearList: {name:string;qty:number}[] = [];
          try { gearList = JSON.parse(r.extra_gear); } catch {}
          let depositList: string[] = [];
          try { depositList = JSON.parse(r.deposit_types); } catch {}
          
          const d1 = new Date(r.rental_date);
          const d2 = new Date(r.end_date || r.rental_date);
          const diffDays = Math.round((d2.getTime() - d1.getTime()) / 86400000) + 1;

          return (
            <div key={r.id} className="bg-orange-50/50 p-4 rounded-xl border border-orange-200 shadow-sm flex flex-col gap-3">
              <div className="flex-1 min-w-0 flex flex-col">
                <div className="text-xl font-black text-gray-900 mb-1">{r.pickup_time || '—'}</div>
                <div className="font-bold text-gray-800 text-base">
                  {r.client_id
                    ? <button onClick={() => navigateToClient(r.client_id)} className="text-left hover:text-teal-600 active:text-teal-700 transition-colors">{r.customer_name || '—'}</button>
                    : (r.customer_name || '—')}
                </div>
                <div className="text-sm text-gray-500 mb-2">
                  {r.customer_phone || ''} {r.customer_tg_username ? `• @${r.customer_tg_username.replace('@', '')}` : ''}
                </div>
                <div className="text-sm font-medium text-orange-800 bg-orange-100 w-max px-2.5 py-1 rounded-lg">
                  {r.quantity} {getSupWord(r.quantity)} • {diffDays} {getDayWord(diffDays)}
                </div>
              </div>

              {(depositList.length > 0 || r.deposit_note || gearList.length > 0 || r.expected_return_time) && (
                <div className="text-sm text-gray-700 bg-white/60 rounded-lg p-3 border border-orange-100/50 flex flex-col gap-1.5">
                  {depositList.length > 0 && <div><span className="text-gray-400">Залог:</span> {depositList.join(', ')}</div>}
                  {r.deposit_note && <div><span className="text-gray-400">Примечание:</span> {r.deposit_note}</div>}
                  {gearList.length > 0 && <div><span className="text-gray-400">Инвентарь:</span> {gearList.map(g => `${g.qty} ${g.name}`).join(', ')}</div>}
                  {r.expected_return_time && <div className="font-medium text-orange-700 mt-0.5"><span className="text-gray-400 font-normal">Возврат:</span> {r.expected_return_time}</div>}
                </div>
              )}
              
              <div className="flex gap-2 w-full">
                <button onClick={() => handleReturn(r.id)} className="flex-1 py-2 bg-green-500 text-white rounded-lg text-sm font-bold active:bg-green-600 transition-colors">
                  ✓ Вернул
                </button>
                <button onClick={() => openIssueForEditing(r)} className="px-4 py-2 bg-white text-blue-500 border border-blue-200 rounded-lg active:bg-blue-50 transition-colors flex items-center justify-center font-medium text-sm shadow-sm">
                  Изменить
                </button>
                <button onClick={() => handleDeleteRental(r.id)} className="px-3 py-2 bg-white text-red-500 border border-red-200 rounded-lg active:bg-red-50 transition-colors flex items-center justify-center">
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          );
        })}

        {/* RETURNED */}
        {returned.length > 0 && (
          <>
            <SectionHeader icon={<Check size={16}/>} title="Завершённые" count={returned.length} color="text-green-600" />
            {returned.map(r => (
              <div key={r.id} className="bg-green-50/50 p-3 rounded-xl border border-green-200 opacity-70 flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{r.customer_name || '—'}</span>
                    <span className="text-xs text-green-600">{r.quantity} шт. ✓</span>
                  </div>
                  <div className="text-xs text-gray-500">
                    {r.customer_phone || ''} {r.customer_tg_username ? `• @${r.customer_tg_username.replace('@', '')}` : ''}
                  </div>
                </div>
                <button onClick={() => handleDeleteRental(r.id)} className="p-2 text-red-400 hover:text-red-500 hover:bg-red-50 rounded-lg">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </>
        )}
      </div>
    );
  };

  const renderCalendar = () => {
    if (selectedCalendarDayStr) return renderDayView(selectedCalendarDayStr);

    const days = Array.from({length: 7}).map((_, i) => {
      const d = new Date(calendarWeekStart);
      d.setDate(d.getDate() + i);
      return d;
    });

    return (
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center bg-white p-3 rounded-xl shadow-sm border">
          <button className="p-1 text-gray-500 active:bg-gray-100 rounded" onClick={() => {
            const nd = new Date(calendarWeekStart); nd.setDate(nd.getDate() - 7); setCalendarWeekStart(nd);
          }}><ChevronLeft size={24} /></button>
          <div className="font-bold">{formatRangeUI(formatLocalYYYYMMDD(days[0]), formatLocalYYYYMMDD(days[6]))}</div>
          <button className="p-1 text-gray-500 active:bg-gray-100 rounded" onClick={() => {
            const nd = new Date(calendarWeekStart); nd.setDate(nd.getDate() + 7); setCalendarWeekStart(nd);
          }}><ChevronRight size={24} /></button>
        </div>

        <div className="flex flex-col gap-2">
          {days.map(d => {
            const dateStr = formatLocalYYYYMMDD(d);
            const dayOfWeek = d.getDay();
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
            const dayNames = ['Вс','Пн','Вт','Ср','Чт','Пт','Сб'];
            const pendingCount = bookings.filter(b => b.status === 'pending' && b.start_date <= dateStr && b.end_date >= dateStr)
              .reduce((s, b) => s + b.quantity, 0);
            const planCount = bookings.filter(b => b.status === 'approved' && b.start_date <= dateStr && b.end_date >= dateStr)
              .reduce((s, b) => s + b.quantity, 0);
            const factCount = rentals.filter(r => r.rental_date <= dateStr && (r.end_date || r.rental_date) >= dateStr)
              .reduce((s, r) => s + r.quantity, 0);

            const parts = [];
            if (planCount > 0) parts.push(<span key="plan" className="text-blue-500">{planCount} план</span>);
            if (pendingCount > 0) parts.push(<span key="pending" className="text-amber-500">{pendingCount} хотят</span>);
            if (factCount > 0) parts.push(<span key="fact" className="text-teal-600">{factCount} факт</span>);

            return (
              <div key={dateStr} className="flex items-center bg-white p-3 rounded-xl border shadow-sm gap-2">
                <div className="flex items-center gap-3 flex-1 cursor-pointer" onClick={() => setSelectedCalendarDayStr(dateStr)}>
                  <div className={`w-10 h-10 flex shrink-0 items-center justify-center rounded-lg font-bold ${isWeekend ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-700'}`}>
                    {dayNames[dayOfWeek]}
                  </div>
                  <div>
                    <div className="font-medium text-sm">{formatDateUI(dateStr)}</div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {parts.length > 0 ? parts.map((part, idx) => (
                        <span key={idx}>
                          {idx > 0 && ' • '}
                          {part}
                        </span>
                      )) : 'свободно'}
                    </div>
                  </div>
                </div>
                <button onClick={() => { setCreateFormData(p => ({...p, startDate: dateStr})); setIsCreateModalOpen(true); }}
                  className="w-9 h-9 flex shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-600 active:bg-teal-100">
                  <Plus size={18} />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (loading) return <div className="text-center mt-10 text-gray-500">Загрузка...</div>;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold">Управление заявками</h1>
        <div className="flex items-center gap-1">
          <button onClick={() => setIsDark(!isDark)} className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
            {isDark ? <Sun size={20}/> : <Moon size={20}/>}
          </button>
          <button onClick={handleLogout} className="text-gray-400 p-2"><LogOut size={20}/></button>
        </div>
      </div>

      {(filter === 'pending' || filter === 'approved') && (
        <Input label="" placeholder="Поиск по имени или телефону..." value={search} onChange={(e) => setSearch(e.target.value)} />
      )}

      <div className="flex w-full mb-2 overflow-x-auto pb-0.5 border-b border-gray-100 gap-1" style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
        <Tab label="Новые" active={filter === 'pending'} onClick={() => { setFilter('pending'); setSelectedCalendarDayStr(null); }} />
        <Tab label="Активные" active={filter === 'approved'} onClick={() => { setFilter('approved'); setSelectedCalendarDayStr(null); }} />
        <Tab label="Календарь" active={filter === 'calendar'} onClick={() => setFilter('calendar')} />
        <Tab label="Клиенты" active={filter === 'clients'} onClick={() => { setFilter('clients'); setSelectedCalendarDayStr(null); }} />
        <Tab label="Товары" active={filter === 'products'} onClick={() => { setFilter('products'); setSelectedCalendarDayStr(null); }} />
        <Tab label="Продажи" active={filter === 'sales'} onClick={() => { setFilter('sales'); setSelectedCalendarDayStr(null); }} />
        <Tab label="Черновики" active={filter === 'drafts'} onClick={() => { setFilter('drafts'); setSelectedCalendarDayStr(null); }} />
        <Tab label="Стат." active={filter === 'stats'} onClick={() => { setFilter('stats'); setSelectedCalendarDayStr(null); }} />
      </div>

      {error && <div className="text-red-500 text-sm">{error}</div>}

      {filter === 'stats'    ? <StatsTab password={password} /> :
       filter === 'clients'  ? <ClientsTab password={password} initialClientId={quickClientId} onClearInitialClient={() => setQuickClientId(null)} onAddRental={openIssueForClient} /> :
       filter === 'products' ? <ProductsTab password={password} /> :
       filter === 'sales'    ? <SalesTab password={password} /> :
       filter === 'drafts'   ? <DraftsTab password={password} onOpenDraft={handleOpenDraft} /> :
       filter === 'calendar' ? renderCalendar() : (
        <div className="flex flex-col gap-4">
          {filtered.length === 0 && <div className="text-center text-gray-500 my-10">Тут пусто</div>}
          {filtered.map(b => (
            <div key={b.id} className={`p-4 rounded-xl border flex flex-col gap-4 shadow-sm bg-white ${b.status === 'pending' ? 'border-amber-400 border-2' : ''} ${b.status === 'rejected' ? 'opacity-50' : ''} ${b.status === 'cancelled' ? 'border-red-200 bg-red-50' : ''}`}>
              <div className="flex justify-between items-start">
                <div className="flex flex-col">
                  <span className="font-bold text-lg">{b.customer_name}</span>
                  <span className="text-sm text-gray-500">
                    {b.customer_phone} ({b.customer_messenger}{b.customer_tg_username ? `: @${b.customer_tg_username}` : ''})
                  </span>
                </div>
                <div className="flex flex-col items-end">
                  {b.status === 'approved' && <span className="bg-teal-light text-teal-active px-2 py-1 rounded text-xs font-bold">Одобрена</span>}
                  {b.status === 'issued' && <span className="bg-orange-100 text-orange-600 px-2 py-1 rounded text-xs font-bold">Выдана</span>}
                  {b.status === 'rejected' && <span className="text-gray-400 text-xs font-bold">Отклонена</span>}
                  {b.status === 'cancelled' && <span className="text-red-500 text-xs font-bold line-through">Отменена</span>}
                  <button onClick={() => handleDeleteBooking(b.id)} className="p-1 mt-1 text-red-300 hover:text-red-500 rounded">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-sm flex justify-between">
                <div><p className="text-gray-500">Даты</p><p className="font-medium">{formatDateUI(b.start_date)} <br/> {formatDateUI(b.end_date)}</p></div>
                <div><p className="text-gray-500">Время</p><p className="font-medium">{b.pickup_time}</p></div>
                <div><p className="text-gray-500">Кол-во</p><p className="font-bold text-teal-base text-lg">{b.quantity} шт.</p></div>
              </div>
              <div className="flex gap-2 mt-2">
                <a href={`tel:${b.customer_phone}`} className="flex-1 max-w-[60px] h-12 bg-gray-100 flex items-center justify-center rounded-lg text-gray-700 active:bg-gray-200">
                  <Phone size={20} />
                </a>
                {b.status === 'pending' && (
                  <>
                    <Button onClick={() => handleAction(b.id, 'reject')} disabled={actionLoadingId !== null} className="flex-1 !bg-gray-100 !text-gray-600 border !border-gray-200">
                      <X size={20} className="mx-auto"/>
                    </Button>
                    <Button onClick={() => handleAction(b.id, 'approve')} loading={actionLoadingId === b.id} disabled={actionLoadingId !== null} className="flex-[2] flex justify-center items-center gap-2">
                      <Check size={20}/> Одобрить
                    </Button>
                  </>
                )}
                {b.status === 'approved' && (
                  <Button onClick={() => handleAction(b.id, 'cancel')} loading={actionLoadingId === b.id} disabled={actionLoadingId !== null} className="flex-[3] !bg-red-50 !text-red-500 flex justify-center items-center gap-2 border !border-red-200">
                    <Ban size={20}/> Отменить
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create booking modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex justify-center items-end sm:items-center z-50">
          <div className="bg-white w-full max-w-[480px] rounded-t-2xl sm:rounded-2xl p-6 flex flex-col gap-4 max-h-[90vh] overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-xl font-bold">Новая бронь <span className="text-gray-400 text-base font-normal">({formatDateUI(createFormData.startDate)})</span></h2>
              <button onClick={() => { setIsCreateModalOpen(false); setCreateError(''); }} className="p-2 text-gray-400 bg-gray-100 rounded-full"><X size={20}/></button>
            </div>
            <Input label="Имя (необязательно)" placeholder="Иван" value={createFormData.fullName} onChange={e => setCreateFormData({...createFormData, fullName: e.target.value})} />
            <PhoneInput label="Телефон (необязательно)" value={createFormData.phone} onChange={val => setCreateFormData({...createFormData, phone: val})} />
            <div className="flex gap-4">
              <div className="flex-1 flex flex-col gap-1">
                <label className="text-sm text-gray-500 font-medium">Сапов (шт)</label>
                <div className="flex border rounded-lg overflow-hidden h-12">
                  <button onClick={() => setCreateFormData(p => ({...p, quantity: Math.max(1, p.quantity - 1)}))} className="w-12 bg-gray-50 border-r font-bold text-gray-600">-</button>
                  <div className="flex-1 flex items-center justify-center font-bold text-lg">{createFormData.quantity}</div>
                  <button onClick={() => setCreateFormData(p => ({...p, quantity: p.quantity + 1}))} className="w-12 bg-gray-50 border-l font-bold text-gray-600">+</button>
                </div>
              </div>
              <div className="flex-1 flex flex-col gap-1">
                <label className="text-sm text-gray-500 font-medium">На сколько дней</label>
                <div className="flex border rounded-lg overflow-hidden h-12">
                  <button onClick={() => setCreateFormData(p => ({...p, durationDays: Math.max(1, p.durationDays - 1)}))} className="w-12 bg-gray-50 border-r font-bold text-gray-600">-</button>
                  <div className="flex-1 flex items-center justify-center font-bold text-lg">{createFormData.durationDays}</div>
                  <button onClick={() => setCreateFormData(p => ({...p, durationDays: p.durationDays + 1}))} className="w-12 bg-gray-50 border-l font-bold text-gray-600">+</button>
                </div>
              </div>
            </div>
            <Input type="time" label="Время получения" value={createFormData.pickupTime} onChange={e => setCreateFormData({...createFormData, pickupTime: e.target.value})} />
            
            <div className="flex gap-4">
              <div className="flex-1">
                <Input type="number" step="100" label="Итого (₽)" value={createTotalPrice} onChange={e => setCreateTotalPrice(e.target.value)} />
              </div>
              <div className="flex-1">
                <Input type="number" step="100" label="Предоплата (₽)" value={createPrepayment} onChange={e => setCreatePrepayment(e.target.value)} />
              </div>
            </div>

            <div className="flex flex-col gap-1 mb-2">
              <label className="text-sm text-gray-500 font-medium">Мессенджер</label>
              <div className="flex gap-2">
                {(['telegram', 'max', 'other'] as const).map(m => (
                  <button key={m} onClick={() => setCreateFormData({...createFormData, messenger: m})}
                    className={`flex-1 h-12 rounded-lg font-medium border transition-colors ${createFormData.messenger === m ? 'bg-teal-base text-white border-teal-base' : 'bg-white text-gray-600 border-gray-200'}`}>
                    {m === 'telegram' ? 'Telegram' : m === 'max' ? 'Max' : 'Другой'}
                  </button>
                ))}
              </div>
            </div>
            {createError && <div className="bg-red-50 border border-red-200 text-red-600 text-sm p-3 rounded-lg">❌ {createError}</div>}
            <div className="flex gap-2">
              <Button loading={createLoading} onClick={handleSaveBookingDraft} className="!w-auto px-5 bg-white border border-gray-300 !text-gray-500 hover:!text-teal-base hover:border-teal-base hover:bg-teal-50/30 !text-sm !font-medium">В черновики</Button>
              <Button loading={createLoading} onClick={handleCreateSubmit} className="flex-1">Сохранить бронь</Button>
            </div>
          </div>
        </div>
      )}

      {/* Issue rental modal */}
      {issueModalOpen && (
        <IssueModal
          date={issueModalDate}
          prefill={issueModalPrefill}
          isEditing={issueModalIsEditing}
          draftId={issueModalDraftId}
          password={password}
          onClose={() => { setIssueModalOpen(false); setIssueModalDraftId(null); }}
          onSubmit={handleIssueSubmit}
        />
      )}
    </div>
  );
};
